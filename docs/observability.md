# Observability — Operator Runbook

> **Footnote:** All numbers and code references in this writeup match
> commit `9a02c24` of the homesty.ai repo at 2026-04-29. Update
> this footnote on every edit.

This is the working runbook for on-call. It describes the five layers
that catch buyer-facing or operator-facing bugs in production, the
healthcheck contract that orchestrators consume, and the Sentry tag
conventions that let you slice issues quickly.

It is **not** a design doc. It exists so that whoever is paged in 90
days can answer "where do I look first?" without re-deriving anything.

## Architecture

```
┌──────────┐    ┌────────────────────────┐    ┌──────────────────┐    ┌───────────┐
│  Browser │ →  │ Next.js App Router     │ →  │ withSentry()     │ →  │ DB (Neon) │
│          │    │ /api/<route>           │    │ wrapper (Day 6)  │    │ HTTP      │
└──────────┘    └────────────────────────┘    └──────────────────┘    └───────────┘
                          │                            │                      │
                          │ 17 audit-only regex        │ on throw:            │ on $queryRaw
                          ▼ checks per chat response   │   captureException   │   failure
                ┌────────────────────────┐    ┌──────────────────┐    ┌───────────┐
                │ response-checker.ts    │    │ sentry-redact.ts │ →  │ Sentry    │
                │ (PART 8.5 audit log)   │    │ (PII strip)      │    │ dashboard │
                └────────────────────────┘    └──────────────────┘    └───────────┘
                          │                                                   │
                          ▼ violations → AuditLog row                         │
                ┌────────────────────────┐                                    │
                │ auditWrite() (Day 2)   │ ← every mutation lands one row     │
                └────────────────────────┘                                    │
                                                                              │
        ┌─────────────────────────────────────────────────────────────────────┘
        │ on /api/healthcheck 503:
        ▼
┌───────────────────┐
│ Docker HEALTHCHECK│ → orchestrator marks container unhealthy → restart
│ wget /healthcheck │
└───────────────────┘
```

## The five layers of bug detection

Each layer catches a different *class* of failure. None replaces the
others — they stack.

### 1. PART 0 hard-stop rules (system prompt)

Codified at the top of `src/lib/system-prompt.ts`. These are the rules
the model is instructed to never violate (e.g. "never fabricate phone
numbers", "never claim a project is RERA-verified without `reraVerified
= true` on the row"). Failure mode: model drift over time as new few-
shots accumulate. Mitigated by the test suite that locks PART 0
ordering invariants — see `src/lib/system-prompt.test.ts`.

**Layer 1 caught:** OTP fabrication (commit `706feb3`),
parking-allocation hallucination (commit `54561c1`), markdown bullets
in chat replies (commit `54561c1`). Out of scope for the P1-R2 sprint;
listed for completeness.

### 2. response-checker.ts regex audit (post-stream, audit-only)

`src/lib/response-checker.ts` runs against every completed AI response
*after* the stream closes. 17 regex classes. Audit-only — it never
blocks tokens (the buyer has already seen the response). Violations
land in `ChatMessageLog.violations String[]` and surface in
`/admin/intelligence`.

**Failure mode this layer covers:** model output that the prompt-level
rules failed to prevent. Examples covered by current regexes: contact
leak (phone or email pattern in AI reply), business leak (commission
percentage mentioned to buyer), absolute promises ("guaranteed
delivery"), 1st/2nd/3rd ranking language.

**Known gap (out of scope, AGENT_DISCIPLINE.md known issue MEDIUM):**
13 of the prompt's PART 8.5 rules have no regex counterpart. Drift
goes undetected for those. Sprint-D (post-P1-R2) closes this.

### 3. Sentry capture with PII scrubber

`src/lib/sentry-redact.ts` runs as `beforeSend` in the Sentry SDK
config. Strips Indian phone patterns (`/\+?91\s?\d{10}/`) and email
addresses from breadcrumbs, exception messages, and request bodies
before the event leaves the process. Also redacts `state` /
`code_verifier` / `id_token` from OAuth callback URLs.

**Sentry tag conventions (use these to slice issues):**

| Tag                              | Set by                                                | Use case                                  |
|----------------------------------|-------------------------------------------------------|-------------------------------------------|
| `module=audit-write`             | `src/lib/audit-write.ts:94`                           | every audit-write failure (entity, action) |
| `module=admin-builders`          | `src/app/api/admin/builders/route.ts`                  | builder create 500s                        |
| `module=bulk-upload`             | `src/app/api/admin/projects/bulk-upload/route.ts`      | CSV-import row-create failures             |
| `module=rera-fetch`              | `src/app/api/rera-fetch/route.ts`                      | scraper / cache / manual-entry errors      |
| `module=with-sentry`, `route=…`  | `src/lib/with-sentry.ts:21`                           | unhandled throw caught by Day 6 wrapper    |
| `module=NO_MARKDOWN`             | `src/lib/response-checker.ts`                         | known-audit-only PART 8.5 hits             |

**Layer 3 caught:** five Sentry classes resolved in
`docs/diagnostics/sentry-resolution-log-2026-04-26.md` (JS-NEXTJS-K /
E / J cluster). Status: zero P0/P1 classes open as of 2026-04-29.

### 4. AuditLog row per mutation (auditWrite helper)

`src/lib/audit-write.ts` (Day 2 of this sprint, commit `2604474`).
Every Project / Builder mutation flows through this helper, which:

1. Reads the row's current `version`.
2. Issues an array-form `prisma.$transaction([update, auditLogCreate])`
   that bumps version + writes one `AuditLog` row, atomically. Optimistic
   lock on `version` — concurrent writers fail loudly with P2025.
3. On exception, captures to Sentry tagged `module=audit-write` plus
   `entity` and `action`.

Wired into:
- `/api/admin/projects/bulk-upload` — `action: 'bulk_import'` per
  row (Day 3, commit `379c03f`)
- `/api/rera-fetch` — `action: 'verify_rera'` on every successful
  scrape *or* manual-entry (Day 4 + Day 5, commits `508eb09` +
  `4718b67`)
- `/api/admin/builders` — `action: 'create'` on every new builder
  (Day 5, commit `4718b67`)

To replay history for a row: `SELECT * FROM "AuditLog" WHERE "entity"
= 'Project' AND "entityId" = '<id>' ORDER BY "createdAt"`. Each row
carries `entityVersion`, `before`/`after` JSON, and the actor email.

### 5. Docker HEALTHCHECK + /api/healthcheck endpoint

**This Day 6 deliverable.** `src/app/api/healthcheck/route.ts` returns
200 `{ status: 'ok', commit, uptime, timestamp }` on success or 503
`{ status: 'degraded', reason: 'db_unreachable' }` on Prisma
`$queryRaw\`SELECT 1\`` failure. No auth (load balancers fire it
without credentials), no Sentry breadcrumb on success (would flood at
30s interval).

Dockerfile directive (added Day 6):

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/healthcheck || exit 1
```

`wget` ships in the busybox of `node:20-alpine` — no extra
dependencies. Startup grace is 10s (cold Prisma client init is ~2-3s
+ Node bootstrap ~1s), then 3 consecutive failures over 90s mark the
container unhealthy.

## withSentry rollout plan

Day 6 is the **PoC**. Wired only to `/api/admin/projects/bulk-upload`
because:
- It's the highest-blast-radius write surface (one row pollutes many).
- It has the most diverse failure modes (CSV parse, regex, FK miss,
  P2002, audit-write blip) — good signal for what the wrapper catches.
- Test suite is already exhaustive (5 tests post-Day 3) so behavior
  diff is auditable.

**Full rollout** to all ~20 routes is tracked at
`docs/MASTER_FIX_LIST.md` D1. The followup sprint will:
1. Add `withSentry` to every `/api/admin/*` and `/api/(public)/*` route.
2. Standardize the 500 response shape across the API surface.
3. Wire `requestId` (the Sentry event ID) into the chat client toast so
   buyers can quote it on support.

## Healthcheck endpoint contract

| URL                  | Method | Auth | Frequency        | Response                           |
|----------------------|--------|------|------------------|------------------------------------|
| `/api/healthcheck`   | GET    | None | 30s (Docker)     | 200 ok JSON or 503 degraded JSON   |

**200 response shape:**

```json
{
  "status": "ok",
  "commit": "<sha>",
  "uptime": 1234.5,
  "timestamp": "2026-04-29T12:34:56.789Z"
}
```

`commit` resolves to `process.env.VERCEL_GIT_COMMIT_SHA` when present
(Vercel deploys), `'local'` otherwise.

**503 response shape:**

```json
{
  "status": "degraded",
  "reason": "db_unreachable"
}
```

The 503 fires when `prisma.$queryRaw\`SELECT 1\`` rejects. Prisma's
HTTP adapter does not reuse a session, so a single failed round-trip
is signal — not a flaky-on-cold-start false positive.

## Anti-patterns explicitly noted

- **Healthcheck routes must NOT generate Sentry events on success.**
  Docker fires every 30s; Sentry would flood with 2,880 events/day per
  container instance. The route's catch path uses `console.error` only.
- **Healthcheck routes must NOT require auth.** Load balancers and
  Docker fire without credentials; locking the route defeats the
  orchestrator integration.
- **`auditWrite` must NOT be called inside `prisma.$transaction(...)`
  callback form.** The Neon HTTP adapter rejects callback-form
  transactions ("Transactions are not supported in HTTP mode"). The
  helper itself uses array-form internally — call sites just await
  `auditWrite(...)` without wrapping. See AGENT_DISCIPLINE §3.
- **`response-checker.ts` runs on `onFinish`, never `onChunk`.** Audit
  only — never block tokens that are mid-flight. Documented as a known
  HIGH gap in CLAUDE.md ("Known Open Issues").

## Numbers

- **207 tests passing** as of `9a02c24`. Sprint baseline 162; +45
  in P1-R2 sprint Days 2-6.
- **0 P0/P1 Sentry classes open** as of 2026-04-29. The 5 historical
  classes resolved in `docs/diagnostics/sentry-resolution-log-2026-04-26.md`.
- **8+ hallucination classes closed** since master fix list — OTP
  fabrication, parking allocation, markdown bullets, bullet-shot
  formatting, "OTP ke baad" sequence, FINAL REMINDER drift, amenity
  hallucination, ranking-language drift. Each cited in the corresponding
  commit message.
- **Block E4 fully closed** as of Day 4 (`508eb09`) — `reraNumber`
  regex `/^[A-Z0-9\-/]+$/i` enforced on both bulk-upload and
  single-fetch admin paths.
