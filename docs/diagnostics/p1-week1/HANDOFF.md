# P1-R2 Week 1 — Sprint-scoped Handoff

> Sprint-scoped handoff for the audit-fields sprint. **NOT a substitute for
> `docs/SESSION_HANDOFF.md`** — that file is owned by the Agent F stream and
> tracks the global session state. This file tracks only the P1-R2 sprint.
>
> Update by **prepending** new day entries (most recent first). Each entry
> includes the day's commit SHA, end-state test count, and the queue for
> the next day.

## Last updated

2026-04-29 — Day 5 (`p1-audit-fields-day5`)

---

## Day 5 — 2026-04-29 — `4718b67` — Builder onboarding wizard + RERA manual-entry verify-flip

**Status:** [OK] — shipped on `p1-audit-fields-day5` off `be81034` (Day 4 head).

**What landed:**

- `/admin/builders/new` is now a 4-step wizard (Identity → Trust Scores
  → Contact → Review). Server `page.tsx` gates auth and passes
  `adminEmail` as a prop; client `builder-wizard.tsx` dispatches into
  a pure `useReducer` state machine.
- 15 unit tests on the reducer in isolation. No React, no fetch, no
  prisma — fully testable as a state-transition function.
- **Step 3 surfaces an amber "AI never sees these — internal CRM
  only" chip** above the contact-email / contact-phone inputs,
  matching the `BuilderAIContext` exclusion in
  `src/lib/types/builder-ai-context.ts:15`.
- Deleted orphan `BuilderForm.tsx` (249 lines, never imported) and
  the legacy 99-line inline form. Single canonical builder-create
  surface.
- `POST /api/admin/builders` now:
  - Rate-limits `builder-create:${email}:${ip}` at 5/min (429 +
    `Retry-After: 60`).
  - Stamps `createdBy: email` at create.
  - Fires the genesis `auditWrite({ entity: 'Builder', action:
    'create' })` post-create. AuditLog row lands at
    `entityVersion: 2` — same semantics as Day 3 bulk-import.
  - Surfaces Prisma `P2002` (unique `builderName` violation) as
    409 instead of bubbling 500.
  - Replaces legacy `logAdminAction(...)` with `auditWrite(...)`
    on this surface only (other routes untouched — minimum-disruption).
- **RERAManualEntry verify-flip (deferred from Day 4) — landed:**
  `/api/rera-fetch` extended with `manualPayload?: string`. When
  present + `projectId`, it skips puppeteer, persists
  `reraVerified: true` + `reraData: { source: 'manual',
  scrapedFields: { operator: email, raw }, ... }` +
  `reraVerifiedAt: now()`, then `auditWrite({ action: 'verify_rera' })`.
  `manualPayload` without `projectId` → 400. `RERAManualEntry.tsx`
  takes a new `projectId?: string` prop; when set, Apply also POSTs
  the manualPayload + `router.refresh()`. Button label switches:
  `"Apply to form"` ↔ `"Apply & mark verified"`.

**Tests:** 5 new builders route tests (happy path + auditWrite shape,
P2002 → 409, Zod → 400, non-admin → 401, rate-limit → 429), 15
reducer tests, 2 new rera-fetch tests (manualPayload skip+persist,
missing-projectId 400). Total +22 (181 → 203).

**Verify:** **203/203 tests** (181 → 203, +22). Build clean. /chat
bundle stable at 217 kB. Pre-commit ran tests.

**Discipline checklist applied:** §3 (auditWrite array-form), §4
(orphan + legacy form deleted, single surface), §5 (prop pass-through),
§7 (createdBy + auditWrite on Builder; manual-entry captures
operator+raw in reraData), §8 (BuilderAIContext exclusion preserved
+ surfaced visually in Step 3), §9, §10, §11, §12, §13, §14, §15.
§1, §2, §6, §16 — n/a.

---

## Day 4 — 2026-04-29 — `508eb09` — RERA cache + verify pill + drop duplicate scraper

**Status:** [OK] — shipped on `p1-audit-fields-day4` off `3c178f2` (Day 3 head).

**What landed:**

- `/api/rera-fetch` now caches verifications for 7 days (Day 1 Q4) and
  persists `reraVerified` / `reraData` / `reraVerifiedAt` via
  `auditWrite({ action: 'verify_rera' })` — first cross-route reuse of
  the Day 2 helper.
- `?force=true` bypasses the cache (admin "Re-verify" button).
- `reraNumber` regex `/^[A-Z0-9\-/]+$/i` enforced on the single-fetch
  path → **Block E4 FULLY CLOSED** (bulk-upload closed the same regex
  on Day 3).
- `RERA_GEO_BLOCKED` leaves `reraVerified` untouched (Day 1 Q5).
- `RERAVerifyPill` admin component (green/amber/stale chip + Verify/Re-
  verify button) wired into `/admin/projects/[id]` Step 1. Pill takes
  `projectId` as a typed prop (AGENT_DISCIPLINE §5); fetches its own
  state from `/api/admin/projects/${id}` on mount.
- `src/app/api/admin/rera-verify/` (217-line duplicate scraper) DELETED.
  Pre-flight grep confirmed zero callers across `src/` and `tests/`.
  Lock-in test asserts the file no longer exists.
- 6 new tests: cache HIT (no scrape), cache MISS+TTL (scrape +
  auditWrite), force bypass, GEO_BLOCKED (no flip), regex 400, deletion
  lock-in.

**Puppeteer mock strategy:** `vi.mock('puppeteer-core', ...)` and
`vi.mock('@sparticuz/chromium', ...)` return mock `default` objects with
spy-driven `launch` / `newPage` / `evaluate`. Route's dynamic imports
(`(await import('puppeteer-core')).default`) honor the hoisted mocks —
no real browser, no server start. Each test sets up its own
`launch.mockImplementationOnce` throw or `evaluate.mockResolvedValue`
shape.

**CSP:** reviewed, no change needed. Puppeteer is server-side; CSP
`connect-src` governs browser-side fetches only. Browser-side fetches
in this sprint are all same-origin (`/api/rera-fetch`,
`/api/admin/projects/[id]`).

**Verify:** **181/181 tests** (175 → 181, +6). Build clean. /chat
bundle stable at 217 kB. Schema valid. Pre-commit ran tests.

**Discipline checklist applied:** §1 (CSP review, intentionally
unmodified), §2, §3 (auditWrite array-form), §4 (duplicate-surface
deleted), §5 (prop pass-through), §6, §7 (operator-trust fields written
only on confirmed verification + actor captured), §9, §10, §11, §12,
§13, §14, §15. §8, §16 — n/a.

---

## Day 3 — 2026-04-29 — `379c03f` — Bulk Upload UI for /admin/projects

**Status:** [OK] — shipped on `p1-audit-fields-day3` off `7d314c3` (Day 2 head).

**What landed:**

- `src/app/admin/projects/bulk-upload/page.tsx` — server component, admin
  email gate, redirects non-admins to `/admin`. `adminEmail` flows down as
  a typed prop (no `useParams()` in the child — AGENT_DISCIPLINE §5).
- `src/app/admin/projects/bulk-upload/bulk-upload-form.tsx` — client form.
  File input (`accept=".csv"`), client-side 1 MB visual warning before any
  POST, primary "Dry run" + danger-styled "Commit" buttons. Result panel
  with three collapsible sections (`<details>`/`<summary>`, no chart deps):
  Will create / Already exist (matched by `reraNumber`) / Errors (per-row
  line# + reason). Post-commit banner shows audit log count.
- `src/app/api/admin/projects/bulk-upload/route.ts` — POST handler accepting
  multipart/form-data. Pipeline:
  1. Auth gate (admin email, case-insensitive — same shape as `/api/admin/projects:42`)
  2. Rate limit `bulk-upload:${email}:${ip}` at 2/min via the **existing**
     `rateLimit` helper at `src/lib/rate-limit.ts` (composite-key precedent:
     `src/app/api/chat/capture/route.ts:53`). 429 + `Retry-After: 60`.
  3. `Content-Length` header guard at 1 MB → 413 **before** parsing the form.
  4. `req.formData()` → `file` field; second 1 MB check on `file.size`.
  5. `csv-parse/sync` (already in deps; same import path as
     `import-projects.mjs:9`), `columns: true`.
  6. Row-level normalization (empty string → undefined) + Zod validation.
     Required: `name`, `builder`, `zone`, `rera_number`, `rera_status`,
     `min_price_lakh`, `max_price_lakh`, `possession_date`, `latitude`,
     `longitude` (10 columns). Optional: `units`, `bsp_sqft`,
     `possession_flag`, `decision_tag`, `honest_concern`, `analyst_note`,
     `configurations`, `bank_approvals`, `carpet_sqft`, `sba_sqft`,
     `price_note` (11 columns). Mirrors `import-projects.mjs:22-44`.
  7. **`reraNumber` regex `/^[A-Z0-9\-/]+$/i` enforced — Block E4 closed.**
     ANY row failure rejects the entire batch with 400, **even in dry-run mode**,
     and zero `findMany` / `create` / `auditWrite` calls happen.
  8. Duplicate detection by `reraNumber` via one batched `findMany`.
  9. **Default = dry run** — returns 200
     `{ creates: [{projectName, reraNumber, builderName}…], duplicates:
     [reraNumber…], errors: [], committed: false }`.
  10. **`?commit=true`** — chunks of 25 rows. Each row:
      `prisma.project.create` (+ `createdBy` / `updatedBy` set to the admin
      email), then `auditWrite({ entity: 'Project', entityId, action: 'bulk_import',
      after: { …row, possessionDate: ISO }, actor: email })`. `auditWrite`
      failure is Sentry-captured and counted, but the row stays created.
      Per-row create failure (e.g. P2003 builder FK miss) is recorded as a
      row error and the loop continues — operator re-runs after fixing.
- `src/app/api/admin/projects/bulk-upload/route.test.ts` — 5 vitest tests:
  1. Dry run returns expected `{ creates, duplicates, errors, committed:
     false }` shape with `findMany` results splitting creates from duplicates.
  2. Commit mode calls `auditWrite` once per created row with
     `{ entity: 'Project', action: 'bulk_import', actor: email, entityId,
     after: <row data> }`.
  3. Invalid `reraNumber` regex on ANY row → 400 + zero writes
     (`findMany`, `create`, `auditWrite` all uncalled).
  4. `Content-Length: 2_000_000` → 413, no parse attempt.
  5. `rateLimit → false` → 429 with `Retry-After: 60`, called with key
     `bulk-upload:${email}:${ip}`, limit 2, window 60_000.
- `docs/diagnostics/p1-week1/progress.md` — Day 3 entry with the full
  21-column CSV inventory table (CSV column → DB field → type → required?).

**Pre-flight surprises:**

- `git status` was clean except for a CRLF-only diff on
  `src/components/admin/AddMarketAlertButton.tsx` (no semantic change).
  Stashed as `stash@{0}` ("crlf-only diff on AddMarketAlertButton
  (preserved)") before branching — not part of this sprint.
- `npm run verify` re-runs `prisma format`, which on Windows re-emits
  `prisma/schema.prisma` with CRLF and LF mixed line endings; the actual
  diff is empty. Not staged into the Day 3 commit.

**Verify:** `npm run verify` green — type-check, lint (zero errors on
touched files; pre-existing warnings on untouched files per
AGENT_DISCIPLINE §9), build clean (no `/chat` bundle drift; bulk-upload
is a sibling admin route), 175/175 tests, schema valid. **Test count:
170 → 175.**

**Discipline checklist applied:**

- §1 (external domains) — n/a (same-origin route, no new hosts)
- §2 (env vars) — only existing `ADMIN_EMAIL`, `UPSTASH_REDIS_REST_*`
  consumed; nothing new
- §3 (Neon HTTP `$transaction`) — bulk path is per-row create + delegated
  `auditWrite` (which uses array-form `$transaction` internally). Route
  itself does NOT call `$transaction`. Compliant.
- §4 (duplicate-surface) — searched for "bulk", "import-projects", "csv"
  under `src/app/admin/`; only `import-projects.mjs` at repo root matches,
  which is a one-shot CLI bypass not a UI surface. The new admin page is
  the only operator-facing bulk surface — no consolidation needed.
- §5 (client/server boundary) — `adminEmail` passed as prop; child does
  not `useParams()` or read session.
- §6 (timeouts/streaming) — `maxDuration: 60` on the route; per-row
  awaits are bounded by Neon HTTP latency only; no `Promise.race`.
- §7 (schema write provenance) — `analystNote` / `honestConcern` writes
  go through the route which sets `createdBy: email` and `updatedBy: email`
  on the project itself, but does NOT set `analystNoteSource` /
  `analystNoteAuthor`. Bulk-import sets `source` provenance to absent
  (matching the `import-projects.mjs` precedent for backfilled content).
  **Open call for Day 5+:** explicitly set
  `analystNoteSource: 'imported'` / `analystNoteAuthor: email` /
  `analystNoteVerifiedAt: now` on the bulk path so the operator-trust UI
  badge surfaces correctly. Not regressing existing behavior — the
  current import script doesn't set these fields either.
- §8 (response-checker) — n/a (no AI surface)
- §9 (lint/build/test) — applied
- §10 (report-back) — applied (this section)
- §11 (sub-agents) — none used (single-thread)
- §12 (CI gates) — pre-commit ran tests (175/175), no `--no-verify`
- §13 (session handoff) — read at start, this file updated at end
- §14 (verdict format) — applied in chat report
- §15 (autonomous decisions) — three judgment calls at ≥80% confidence:
  (a) `latitude`/`longitude` are required (vs. script's defaults) to
  prevent map-pin collapse on import; (b) per-row create errors are
  partial-success not 500 (operator re-runs); (c) `auditWrite`
  failure post-create is logged-not-thrown (project exists, audit miss
  is a tracked warning).
- §16 (retro) — Day 7 only, not per day

---

## Day 6 queue — Healthcheck + GHCR + observability scaffolding

**Goal:** harden the deploy + observability surface so future agents
can debug from logs and metrics rather than from ad-hoc reproductions.
This sprint is mostly infra glue — small per-item changes, broad reach.

1. **Healthcheck endpoint:** `GET /api/healthcheck` returns
   `{ status: 'ok', commit: process.env.VERCEL_GIT_COMMIT_SHA, db: <ms> }`
   with a single `prisma.$queryRaw\`SELECT 1\`` round-trip. 5s timeout
   ceiling. Public endpoint (no auth) but rate-limited to deter abuse.

2. **GHCR push GHA workflow:** `.github/workflows/ghcr.yml` builds the
   multi-stage Dockerfile and pushes `ghcr.io/ykstorm/buyerchat:{sha,latest}`
   on every push to `main`. Re-uses the existing CI build artifact when
   possible to avoid double-building. Vercel deploy stays the primary
   prod path; GHCR is for CD parity + future on-prem scenarios.

3. **Dockerfile HEALTHCHECK directive:** Add `HEALTHCHECK --interval=30s
   --timeout=5s --start-period=20s --retries=3 CMD curl -f
   http://localhost:3000/api/healthcheck || exit 1`. Container
   orchestrators get a real readiness signal.

4. **`withSentry` route wrapper PoC:**
   `src/lib/with-sentry-route.ts` — higher-order function wrapping
   POST/GET handlers with try/catch + `Sentry.captureException` +
   consistent `tags: { module: <route-path> }`. Apply to
   `/api/rera-fetch`, `/api/admin/projects/bulk-upload`,
   `/api/admin/builders` as the first three migrations. Other routes
   left for Day 7+.

5. **`docs/observability.md`:** Capture the route → Sentry tag
   mapping (so on-call can `tag:module=admin-builders` to slice
   issues), the `auditWrite` Sentry tag conventions, and the
   healthcheck SLO target. Operator-facing runbook, not a design doc.

6. **Tests:**
   - `/api/healthcheck` happy path + `prisma.$queryRaw` failure → 503.
   - `withSentry` wrapper unit suite: thrown error → captureException
     with the right tag + 500 response.
   - Targets test count 203 → ≥208.

---

## Verify state baseline

| Day | SHA       | Tests   | Build | Notes |
|-----|-----------|---------|-------|-------|
| 1   | `33fedac` | 162/162 | clean | read-only investigation only |
| 2   | `2604474` | 170/170 | clean | +8 from auditWrite suite |
| 3   | `379c03f` | 175/175 | clean | +5 from bulk-upload suite |
| 4   | `508eb09` | 181/181 | clean | +6 from rera-fetch suite (cache HIT/MISS, force, GEO_BLOCK, regex, deletion lock-in) |
| 5   | `4718b67` | 203/203 | clean | +22 (15 reducer + 5 builders POST + 2 rera-fetch manualPayload) |

---

## Anti-touch list

- `docs/SESSION_HANDOFF.md` — Agent F territory; this sprint does NOT
  edit it.
- `/chat`, `/api/chat`, `response-checker`, `system-prompt` — the chat
  surface is not part of P1-R2.
- `prisma.$transaction(callback)` — only array form (Neon HTTP rule
  AGENT_DISCIPLINE §3).
- New rate-limit module — reuse `src/lib/rate-limit.ts`.
- CSP changes — same-origin admin surface, no new external hosts.
- `--no-verify` on commit — pre-commit runs normally.
