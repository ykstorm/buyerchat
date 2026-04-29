# P1-R2 Week 1 — Progress Log

> Day-by-day log. Append, don't rewrite. One entry per branch.

## Day 1 — 2026-04-28 — `p1-audit-fields-day1`

**Status:** [OK] — investigation complete, committed, pushed.

**Branch base:** `840282f` (local main, one commit ahead of `origin/main` at
`1e09dd7`).

**Verify baseline at start:** 162/162 tests, build clean (/api/chat 480 B route,
/chat 217 kB first-load), prisma validate ✅, lint 0 errors / 97 warnings (all
pre-existing on untouched files).

**Surprises / corrections to the originating prompt:**

1. The "uncommitted WIP" the prompt described (modified admin files, untracked
   `error.tsx` / `not-found.tsx` / `loading.tsx` siblings, `AdminStates.tsx`)
   was **already committed as `840282f`** — "feat(admin): cosmetic revamp —
   branded dead-states + lineart nav + empty states". `git status` was clean
   except for `.claude/settings.local.json` which CLAUDE.md instructs to leave.
   No stash created. Operator's mental model of main was one commit behind.
2. The prompt said "current 430-line `prisma/schema.prisma`". Actual line count
   is **481**. Inventory is keyed off the real file as of `840282f`.
3. The prompt named one RERA scraper route. There are **two**:
   `/api/rera-fetch` (113 lines, prompt-named) AND `/api/admin/rera-verify`
   (217 lines, not surfaced in any UI). Both are admin-gated, neither caches,
   neither persists. Flagged as duplicate-surface per AGENT_DISCIPLINE §4.

**Output:**

- `docs/diagnostics/p1-week1/findings.md` — inventory + delta + reversal SQL +
  6 open questions (all defaulted at ≥80% confidence)
- `docs/diagnostics/p1-week1/task_plan.md` — 7-day plan, Day 1 done, Day 2–7
  placeholders
- `docs/diagnostics/p1-week1/progress.md` — this file

**No code changes. No schema changes. No migration generated.** Day 1 was
read-only investigation.

**Commit SHA:** (filled by Day 1 commit step)

**Verify at end:** unchanged from baseline — only docs/ touched.

**Discipline checklist applied:**

- §3 (DB transaction compatibility) — n/a (no `$transaction` in scope)
- §4 (duplicate-surface) — flagged: two RERA scrapers
- §7 (schema write provenance) — Q5 resolution enforces the rule
- §9 (verify gates) — baseline captured before any work
- §10 (report-back format) — applied
- §11 (sub-agent rules) — no sub-agents used
- §13 (session handoff) — read at start; will update at sprint end (Day 7)
- §14 (verdict format) — applied
- §15 (autonomous decisions) — six decisions made at ≥80% confidence,
  documented for operator override before Day 2

**Skipped (n/a to a read-only investigation):** §1, §2, §5, §6, §8, §12, §16.

**What's queued for Day 2:**

- Apply Day 1 delta to `prisma/schema.prisma`
- `npx prisma migrate dev --name add_audit_fields_and_rera_cache`
- Verify generated SQL inverts cleanly to Day 1's reversal SQL
- Tests must stay 162/162 (no behavior change yet)

**Operator override window before Day 2:**

If Q2 (String? vs FK), Q3 (Json? vs normalized), Q4 (7-day TTL), or the
"delete duplicate `/api/admin/rera-verify`" default are wrong, hold Day 2
until operator resolves. The other three questions (Q1, Q5, Q6) proceed
without input.

---

## Day 3 — 2026-04-29 — `p1-audit-fields-day3` (in progress)

**Branch base:** `7d314c3` (Day 2 head on `p1-audit-fields-day2`).

**Verify baseline at start:** 170/170 tests, build clean, prisma validate ✅
(unchanged from Day 2 close).

### CSV column inventory (mirrored from `import-projects.mjs:22-44`)

The bulk-upload Zod schema accepts CSV with the following column names —
identical to the canonical script — plus `latitude` / `longitude` which the
script defaults but the API requires explicitly (defaults at the same
co-ordinate would collapse all imports onto one map pin).

| CSV column        | DB field            | Type     | Required? | Notes                                                                |
| ----------------- | ------------------- | -------- | --------- | -------------------------------------------------------------------- |
| `name`            | `projectName`       | string   | yes       | trimmed                                                              |
| `builder`         | `builderName`       | string   | yes       | must match an existing `Builder.builderName` (FK, schema-enforced)   |
| `zone`            | `microMarket`       | string   | yes       | (the script defaults to `'Shela'`; we require it explicitly)         |
| `rera_number`     | `reraNumber`        | string   | yes       | **regex `/^[A-Z0-9\-/]+$/i` enforced; ANY row failure rejects all**   |
| `rera_status`     | `constructionStatus`| string   | yes       | (the script defaults to `'Under Construction'`; we require it)       |
| `min_price_lakh`  | `minPrice`          | number   | yes       | multiplied by 100 000 to land paise-precise INR                      |
| `max_price_lakh`  | `maxPrice`          | number   | yes       | multiplied by 100 000                                                |
| `possession_date` | `possessionDate`    | string   | yes       | parsed via the same DD-MM-YYYY / `Month YYYY` / ISO logic as script  |
| `latitude`        | `latitude`          | number   | yes       | -90..90                                                              |
| `longitude`       | `longitude`         | number   | yes       | -180..180                                                            |
| `units`           | `availableUnits`    | int      | no        | defaults to 0 if missing                                             |
| `bsp_sqft`        | `pricePerSqft`      | number   | no        | defaults to 0 if missing                                             |
| `possession_flag` | `possessionFlag`    | string   | no        | `green` / `amber` / `red` per existing convention                    |
| `decision_tag`    | `decisionTag`       | string   | no        |                                                                      |
| `honest_concern`  | `honestConcern`     | string   | no        |                                                                      |
| `analyst_note`    | `analystNote`       | string   | no        |                                                                      |
| `configurations`  | `configurations`    | string   | no        |                                                                      |
| `bank_approvals`  | `bankApprovals`     | string   | no        |                                                                      |
| `carpet_sqft`     | `carpetSqftMin`     | int      | no        |                                                                      |
| `sba_sqft`        | `sbaSqftMin`        | int      | no        |                                                                      |
| `price_note`      | `priceNote`         | string   | no        |                                                                      |

`delivery_score` and `trust_score` columns from the script's mapping table
are **NOT in `Project`** (they live on `Builder`). Bulk-upload ignores them
even when present; this matches the script's behavior (it doesn't write
them either).

### Rate-limit pattern reused (preflight §5)

`src/lib/rate-limit.ts` — `rateLimit(key, limit, windowMs): Promise<boolean>`.
The `key` is just the Redis key suffix (`rl:${key}:${windowSec}`) so a
composite like `bulk-upload:${email}:${ip}` is a drop-in fit. Existing
precedent: `src/app/api/chat/capture/route.ts:53` uses `capture:${sessionId}:${ip}`
the same way. **No new module invented.**

(Continued in HANDOFF.md — Day 3 deliverables + commit SHA fill in at
sprint commit step.)

---

## Day 4 — 2026-04-29 — `p1-audit-fields-day4`

**Branch base:** `3c178f2` (Day 3 head on `p1-audit-fields-day3`).

**Verify baseline at start:** 175/175 tests, build clean.

### What landed

- `src/app/api/rera-fetch/route.ts` — extended with `projectId` + `force`
  body fields. Added a 7-day TTL cache lookup (per Day 1 Q4) before any
  scrape. After a successful scrape (any source: `puppeteer` / `claude` /
  `raw`), persists `reraVerified: true`, `reraData: { source, fetchedAt,
  scrapedFields, rawTextSample }`, `reraVerifiedAt: now()` via
  `prisma.project.update`, then logs an `auditWrite({ action: 'verify_rera' })`.
  `RERA_GEO_BLOCKED` returns 200 + `ok: false` and **does NOT flip
  `reraVerified`** (per Day 1 Q5). New: `reraNumber` regex
  `/^[A-Z0-9\-/]+$/i` enforced — closes Block E4 on the single-fetch
  path (bulk-upload closed the same regex on Day 3).
- `src/components/admin/RERAVerifyPill.tsx` (NEW) — client component
  taking `{ projectId, reraNumber }` as typed props (AGENT_DISCIPLINE §5).
  Fetches its own verify state from `/api/admin/projects/${id}` on mount,
  renders green "✓ verified Nd ago" pill (when `reraVerified && < 7d`),
  amber "⚠ stale" pill (when `reraVerified && ≥ 7d`), or amber
  "⚠ unverified" pill (when not flipped). "Verify now" / "Re-verify"
  button POSTs `{ reraNumber, projectId, force: true }` and calls
  `router.refresh()` on success. Geo-block surfaces an inline notice;
  no state mutation.
- `src/app/admin/projects/[id]/page.tsx` — single-line addition: imports
  `RERAVerifyPill` and renders it in Step 1 between the existing geo-block
  notice and the `RERAManualEntry` fallback. Guarded `!isNew && id &&
  form.reraNumber` so the pill only appears on edit pages with a RERA
  number entered.
- `src/app/api/admin/rera-verify/` — **DELETED**. 217-line duplicate
  scraper flagged on Day 1. Pre-flight grep confirmed zero callers in
  `src/`, zero in `tests/`, zero in fetch-string searches. Lock-in test
  asserts the file no longer exists.
- `src/app/api/rera-fetch/route.test.ts` (NEW) — 6 tests:
  1. Cache HIT (fresh `reraVerifiedAt < 7d`) → returns `source: 'cache'`,
     no scrape, no update, no auditWrite.
  2. Cache MISS (`reraVerifiedAt > 7d`) → triggers scrape +
     `prisma.project.update` + `auditWrite` with `action: 'verify_rera'`.
  3. `force: true` bypasses fresh cache (does NOT call `findUnique`),
     scrapes + persists.
  4. Scrape failure with timeout-shaped error → 200 + `ok: false` +
     `code: 'RERA_GEO_BLOCKED'` + zero update + zero auditWrite.
  5. `reraNumber: 'INVALID SPACE'` → 400 (regex), no DB read, no
     puppeteer launch.
  6. `existsSync(.../admin/rera-verify/route.ts) === false` — deletion
     lock-in.

### Puppeteer mocking strategy

`vi.mock('puppeteer-core', ...)` and `vi.mock('@sparticuz/chromium', ...)`
return mock `default` objects. Top-level `mockLaunch` / `mockBrowser` /
`mockPage` are vi.fn-driven so each test sets up its own `evaluate`
return shape or `launch.mockImplementationOnce` throw. The dynamic
imports inside the route handler (`(await import('puppeteer-core')).default`)
honor the mocks because vitest hoists `vi.mock` to the top of the
module. No server start, no real browser. (`@anthropic-ai/sdk` is not
mocked because no test forces a `data.projectName === null` evaluate
result — the Claude fallback branch is exercised by integration tests
only.)

### CSP review (per AGENT_DISCIPLINE §1)

The route uses `puppeteer-core` + `@sparticuz/chromium` server-side. The
CSP `connect-src` directive applies to **browser-side** `fetch` /
`XMLHttpRequest` calls only — not to outbound HTTP from a Vercel
function. Therefore `gujrera.gujarat.gov.in` does NOT need to be in
`connect-src`. The admin pill's browser-side `fetch` call hits
`/api/rera-fetch` (same-origin) and `/api/admin/projects/[id]`
(same-origin). **No CSP changes.** Confirmed by reading
`next.config.ts` and `src/middleware.ts` — neither was modified.

### Verify

End-state: **181/181 tests** (170 → 175 → 181). Build clean. /chat
bundle stable at 217 kB First Load. No bundle drift on
/admin/projects/[id] (the pill component lazy-imports nothing; net add
is ~140 LOC of inline JSX). Schema valid.

### Discipline checklist applied

- §1 (external domains / CSP) — reviewed; intentionally not modified
  (puppeteer is server-side; same-origin browser fetches only)
- §2 (env vars) — none new; `ADMIN_EMAIL` consumed via existing pattern
- §3 (Neon HTTP `$transaction`) — `auditWrite` continues to use array-form
  internally; the route does not call `$transaction` itself
- §4 (duplicate-surface) — Day 1 had flagged `/api/admin/rera-verify` as
  duplicate. Day 4 deletes it. Zero callers verified pre-deletion. Now
  one canonical scraper, one canonical persistence path.
- §5 (client/server boundary) — `RERAVerifyPill` takes `projectId` as a
  typed prop; does NOT call `useParams()`. The parent `[id]/page.tsx`
  already extracts `id` via `useParams()` and passes it down.
- §6 (timeouts) — `maxDuration: 30` preserved; cache hit returns
  immediately; cache miss inherits the existing 30s puppeteer goto
  timeout + 30s function ceiling.
- §7 (schema write provenance) — `reraVerified` / `reraData` /
  `reraVerifiedAt` are operator-trust fields (Day 1 §1). The route only
  flips them on a **successful scrape OR successful Claude fallback**
  with the actor's email captured in the `auditWrite` actor field. Geo-
  block path explicitly does NOT flip. AI-generated writes to
  `analystNote`/`honestConcern` remain blocked (out of scope).
- §8 (response-checker) — n/a (not an AI surface)
- §9 (verify gates) — applied; 181/181, build clean
- §10 (report-back format) — applied
- §11 (sub-agents) — none used
- §12 (CI gates) — pre-commit ran tests (181/181)
- §13 (session handoff) — sprint-scoped HANDOFF updated, top-level
  `docs/SESSION_HANDOFF.md` untouched (Agent F's territory)
- §14 (verdict format) — applied in chat report
- §15 (autonomous decisions) — three judgment calls at ≥80% confidence:
  (a) the existing `/admin/projects/[id]/page.tsx` is already a client
  component that uses `useParams()` at the top, so the pill takes
  `projectId` as a prop rather than reaching for `useParams()` itself;
  (b) the pill fetches its own verify state from
  `/api/admin/projects/[id]` on mount instead of expanding the existing
  ProjectForm interface — minimal disruption; (c) cache miss + Claude
  fallback also persists (source: 'claude' or 'raw') so the cache TTL
  applies uniformly regardless of which scrape tier produced the data.
- §16 (retro) — Day 7 only

### Open call for Day 5+

- The `RERAManualEntry` admin component currently fills form fields but
  does NOT trigger a `reraVerified=true` write. Day 5+ should wire
  manual-entry to call a small API surface (or extend `/api/rera-fetch`
  with a `manualPayload` body) that flips `reraVerified` with
  `reraData = { source: 'manual', operator: email, raw: <pasted> }` via
  `auditWrite`. Out of Day 4 scope per the prompt.

---

## Day 5 — 2026-04-29 — `p1-audit-fields-day5`

**Branch base:** `be81034` (Day 4 head on `p1-audit-fields-day4`).

**Verify baseline at start:** 181/181 tests, build clean.

### What landed

- **Builder onboarding wizard (4-step).** Replaces the old
  `/admin/builders/new` 99-line single-page form (`page.tsx`) and the
  orphan 249-line `BuilderForm.tsx` (never imported, dead code as of
  Day 4). New surface:
  - `src/app/admin/builders/new/page.tsx` — server component, admin
    auth gate, redirect non-admin to `/admin`. Passes `adminEmail` as
    a typed prop (AGENT_DISCIPLINE §5).
  - `src/app/admin/builders/new/builder-wizard.tsx` — client wizard.
    Stepper (1→4), Back/Next/Create buttons, dispatches into the
    pure reducer below.
  - `src/components/admin/builder-wizard/wizard-reducer.ts` — pure
    `useReducer` state machine. Actions: `SET_IDENTITY` /
    `SET_SCORE` (auto-clamps to per-field max) / `SET_CONTACT` /
    `NEXT_STEP` (validates current step before advancing) /
    `PREV_STEP` / `START_SUBMIT` / `SUBMIT_OK` / `SUBMIT_FAIL` /
    `RESET`. No React, no fetch, no prisma — fully unit-testable.
  - `src/components/admin/builder-wizard/wizard-reducer.test.ts` —
    15 reducer tests: navigation (advance, regress, validation gate,
    boundary), score clamping (over-max, negative), totalTrustScore
    sum, displayGrade thresholds (A/B/C/D/F), validation step 1/3,
    submit lifecycle (OK + FAIL + RESET).

- **Step 3 surfaces "AI never sees these" chip** on `contactEmail` /
  `contactPhone` per `src/lib/types/builder-ai-context.ts` exclusion
  list (`contactPhone`, `contactEmail`, `commissionRatePct`,
  `partnerStatus` are deliberately stripped from AI context). Amber
  warning chip rendered above the contact inputs.

- **`POST /api/admin/builders` extended:**
  - Rate-limit `builder-create:${email}:${ip}` at 5/min
    (looser than bulk-upload because it's a single-row write but
    still bounded). 429 + `Retry-After: 60`.
  - Sets `createdBy: email` at create time. `version` defaults to 1.
  - **Genesis `auditWrite({ entity: 'Builder', action: 'create' })`**
    after the create. Same semantics as Day 3 bulk-import: the audit
    log shows `entityVersion: 2` + `action: 'create'`, which is the
    canonical "first appeared as a create event" tag for audit-replay
    tools.
  - **Prisma `P2002` (unique violation on `builderName`) → 409** with
    a friendly message instead of bubbling as 500.
  - Removed the legacy `logAdminAction(...)` call — `auditWrite`
    replaces it for this surface (it writes the same `AuditLog` row
    plus a versioned update + Sentry tags). Other routes still use
    `logAdminAction` and are unchanged.
  - `Sentry.captureException` on the catch-all 500 path with
    `tags: { module: 'admin-builders' }`.

- **`POST /api/admin/builders/route.test.ts`** — 5 tests:
  1. Happy path → 201; create called with `createdBy: ADMIN_EMAIL`
     and `totalTrustScore: 82`; `auditWrite` called once with
     `{ entity: 'Builder', action: 'create', actor: ADMIN_EMAIL }`.
  2. P2002 unique violation → 409 with `error: /already exists/i`;
     `auditWrite` not called.
  3. `deliveryScore: 999` (over max 30) → 400; create not called.
  4. Non-admin caller → 401.
  5. `rateLimit → false` → 429 with `Retry-After: 60`, called with
     key `builder-create:${email}:${ip}`, limit 5, window 60_000.

- **RERAManualEntry verify-flip (deferred from Day 4):**
  - `/api/rera-fetch` extended with optional `manualPayload?: string`.
    When present + `projectId` provided: skips puppeteer entirely,
    persists `reraVerified: true`, `reraData: { source: 'manual',
    fetchedAt, scrapedFields: { operator: email, raw: payload },
    rawTextSample }`, `reraVerifiedAt: now()`, then
    `auditWrite({ action: 'verify_rera' })`. Returns
    `{ success: true, source: 'manual' }`.
  - `manualPayload` without `projectId` → 400 (the manual-flip is
    only meaningful when binding to a Project row).
  - `RERAManualEntry.tsx` takes a new optional `projectId?: string`
    prop. When present, the "Apply" button POSTs the manualPayload
    after firing `onApply()` form-fill, then `router.refresh()`.
    When absent (`/admin/projects/new` flow), behavior unchanged —
    just fills form fields. Button label switches:
    `"Apply to form"` (no projectId) ↔ `"Apply & mark verified"`
    (projectId set).
  - `/admin/projects/[id]/page.tsx` call site updated to pass
    `projectId={!isNew && id ? id : undefined}` so the wizard at
    `/new` is unaffected.

- **`/api/rera-fetch/route.test.ts`** — extended with 2 new tests:
  1. `manualPayload` + `projectId` → skips puppeteer, persists
     `reraVerified: true` with `source: 'manual'` and `operator: email`
     captured in the blob; `auditWrite` called with `verify_rera`.
  2. `manualPayload` without `projectId` → 400 with
     `error: /projectId is required/i`.

### §4 duplicate-surface grep result

`grep -rn "BuilderForm" src/` returned hits only inside
`src/app/admin/builders/new/BuilderForm.tsx` itself (definition + DEFAULT
+ default export). **Zero call sites import BuilderForm** — confirmed
orphan. The active 99-line `page.tsx` rendered its own inline form. Both
files deleted; `page.tsx` rewritten as the server component that mounts
the new wizard. No new sibling routes, no orphans.

### Verify

End-state: **203/203 tests** (181 → 203, +22). Build clean. /chat bundle
stable at 217 kB First Load. /admin/builders/new picks up the wizard
component (~330 LOC) but is a server-rendered admin route — no
end-user-facing bundle drift.

### Discipline checklist applied

- §1 (CSP / external domains) — n/a (no new external hosts; same-origin
  POSTs only)
- §2 (env vars) — none new
- §3 (Neon HTTP `$transaction`) — `auditWrite` continues array-form
  internally; new builders route does not call `$transaction` directly.
- §4 (duplicate-surface) — orphan `BuilderForm.tsx` deleted; legacy
  inline `page.tsx` form replaced with the new wizard. Single canonical
  builder-create surface.
- §5 (client/server boundary) — `BuilderWizard` takes `adminEmail` as a
  typed prop from the server `page.tsx`. The wizard does NOT call
  `useParams()` or `useSession()`. The reducer is server-render-safe
  (pure function).
- §6 (timeouts) — n/a (single-create, no streams)
- §7 (schema write provenance) — `createdBy` stamped on Builder; first
  audit row at `entityVersion: 2` with `action: 'create'`. Manual-entry
  RERA path captures `operator: email` in `reraData.scrapedFields` and
  the same actor in `auditWrite`. Geo-block path remains untouched
  (Day 1 Q5).
- §8 (response-checker) — n/a (not an AI surface; **contact fields
  remain excluded from BuilderAIContext** per the type guard at
  `src/lib/types/builder-ai-context.ts:15`. The amber chip in Step 3
  surfaces this to the operator visually.)
- §9 (verify gates) — applied; 203/203, build clean
- §10 (report-back format) — applied
- §11 (sub-agents) — none used
- §12 (CI gates) — pre-commit ran tests
- §13 (session handoff) — sprint-scoped HANDOFF updated; top-level
  `docs/SESSION_HANDOFF.md` untouched
- §14 (verdict format) — applied in chat report
- §15 (autonomous decisions) — three judgment calls at ≥80% confidence:
  (a) deleted `BuilderForm.tsx` outright instead of repurposing —
  zero callers, dead code per AGENT_DISCIPLINE §4 housekeeping;
  (b) replaced the legacy `logAdminAction` call with `auditWrite` on
  the builders route only (other routes untouched) so the audit trail
  is uniform within the P1-R2 sprint touched paths;
  (c) RERAManualEntry button label flips to `"Apply & mark verified"`
  only when `projectId` is set — so operators on `/new` (no project
  id yet) don't see misleading verify language.
- §16 (retro) — Day 7 only

### Open call for Day 6+

- `withSentry` route wrapper PoC + healthcheck endpoint (Day 6 queue
  entry).
- `RERAVerifyPill` currently fetches its own state from
  `/api/admin/projects/${id}` on mount. After Day 5's manual-entry flip
  + `router.refresh()`, the pill re-mounts and re-fetches. If post-Day-6
  observability finds a flicker UX, swap to a server-rendered initial
  value passed as a prop.

---

## Day 6 — 2026-04-29 — `p1-audit-fields-day6`

**Branch base:** `2b308b5` (Day 5 head on `p1-audit-fields-day5`).

**Verify baseline at start:** 203/203 tests, build clean.

### What landed

- `src/app/api/healthcheck/route.ts` (NEW) — public, unauthenticated
  GET. Returns 200 `{ status, commit, uptime, timestamp }` on
  `prisma.$queryRaw\`SELECT 1\`` success; 503
  `{ status: 'degraded', reason: 'db_unreachable' }` on failure.
  Comments document the no-Sentry-on-success and no-auth contract.
  `runtime: 'nodejs'` so Prisma works (default would be edge for some
  Next configs).
- `src/app/api/healthcheck/route.test.ts` (NEW) — 2 tests: happy path
  (200 + status ok + uptime/timestamp shape, $queryRaw called once);
  degraded path ($queryRaw rejects → 503).
- `Dockerfile` — single additive line. Before `CMD ["node", "server.js"]`
  added:
  ```dockerfile
  HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3000/api/healthcheck || exit 1
  ```
  No other changes — multi-stage structure, non-root uid 1001, standalone
  output all preserved. `wget` ships in busybox via `node:20-alpine`.
- `.github/workflows/docker.yml` (NEW) — sibling to `ci.yml` (untouched).
  Triggers on push to `main` and `v*` tags. Pinned major-version actions
  (checkout@v4, setup-buildx@v3, login@v3, metadata@v5, build-push@v6).
  Tags emitted: `type=ref event=branch` (latest-on-main), `type=ref
  event=tag` (semver), `type=sha format=short`. Image lands at
  `ghcr.io/ykstorm/buyerchat:latest` + `ghcr.io/ykstorm/buyerchat:sha-<short>`.
  Concurrency group cancels in-flight on rapid push; 30-min timeout.
  Permissions scoped to `contents: read, packages: write`.
- `src/lib/with-sentry.ts` (NEW) — higher-order route wrapper, ~25 LOC
  of actual logic. Catches thrown errors, calls `Sentry.captureException`
  with `tags: { module: 'with-sentry', route }` plus `extra: { url }`,
  returns `NextResponse.json({ error, requestId }, { status: 500 })`.
  Permissive `(...args: any[]) => Promise<Response>` handler shape so it
  works against any Next.js route signature; eslint-disabled inline at
  the two `any` sites.
- `src/lib/with-sentry.test.ts` (NEW) — 2 tests: pass-through (handler
  returns Response → wrapper passes through, Sentry not called); error
  capture (thrown error → Sentry called with right tags, 500 + JSON
  carries requestId).
- `src/app/api/admin/projects/bulk-upload/route.ts` — bulkUploadHandler
  defined as inner async function, then `export const POST = withSentry(
  bulkUploadHandler, { route: 'admin/projects/bulk-upload' })`. The
  inner handler's existing top-level try/catch is preserved for
  known-shape errors; the wrapper is the outer net for unexpected
  throws. PoC scope per AGENT_DISCIPLINE §15 — full rollout deferred to
  MASTER_FIX_LIST D1.
- `docs/observability.md` (NEW) — operator runbook. Architecture
  diagram, five layers of bug detection (PART 0 → response-checker →
  Sentry+PII → AuditLog → healthcheck), Sentry tag convention table,
  withSentry rollout plan, healthcheck contract, anti-patterns,
  numbers. Footnote at end: "All numbers reference commit
  `<DAY-6-SHA>` … Update on every edit."

### Prisma `$queryRaw\`SELECT 1\`` worked first try?

Yes. The Neon HTTP adapter (`PrismaNeonHttp` in `src/lib/prisma.ts:4`)
handles `$queryRaw` as a single round-trip — no session needed, no
adapter adjustment. The healthcheck unit test mocks `$queryRaw` directly
so the route is exercised in isolation; integration confirmation will
land when the first GHCR-built container boots in CI.

### Type-check fixup applied during verify

First verify run failed with TS2554 on `with-sentry.test.ts` because
the `RouteHandler` constraint inferred `T` as zero-arg from the test's
`vi.fn(async () => Response)`, which then made the wrapped fn reject
the `new Request(...)` arg. Fixed by:
1. Loosening `RouteHandler` to `(...args: any[]) => Promise<Response>`
   (eslint-disabled with explanatory comment).
2. Typing the test handlers as `async (_req: Request) => …` so T
   carries the right arg shape.

Second verify run was green: 207/207 tests, build clean, schema valid.
No retry on Neon adapter — the only fix was TypeScript inference.

### Verify

End-state: **207/207 tests** (203 → 207, +4). Build clean. /chat
bundle stable at 217 kB First Load. No bundle drift on /admin/projects/
bulk-upload (the wrapper adds <1 kB).

### Discipline checklist applied

- §1 (CSP / external domains) — n/a (same-origin healthcheck; GHCR is a
  registry not a runtime endpoint)
- §2 (env vars) — none new (`VERCEL_GIT_COMMIT_SHA` is an existing
  Vercel-injected env, no `.env.example` change needed)
- §3 (Neon HTTP `$transaction`) — healthcheck uses `$queryRaw`, not
  `$transaction`. Compliant.
- §4 (duplicate-surface) — n/a (no overlapping admin surface; observability
  doc is the first runbook of its kind in this repo)
- §5 (client/server boundary) — healthcheck has no client component;
  withSentry is server-only
- §6 (timeouts) — Docker HEALTHCHECK timeout 3s; healthcheck route
  itself awaits one `$queryRaw` round-trip (typically <100ms warm,
  <1s cold)
- §7 (schema write provenance) — no schema writes
- §8 (response-checker) — n/a (not an AI surface)
- §9 (verify gates) — applied; 207/207
- §10 (report-back format) — applied
- §11 (sub-agents) — none used
- §12 (CI gates) — pre-commit ran tests; new docker.yml will run on push
- §13 (session handoff) — sprint-scoped HANDOFF updated; top-level
  `docs/SESSION_HANDOFF.md` untouched
- §14 (verdict format) — applied in chat report
- §15 (autonomous decisions) — three judgment calls at ≥80% confidence:
  (a) PoC withSentry on bulk-upload only — rest deferred; (b) preserved
  the inner handler's existing try/catch (defense-in-depth, not
  redundant); (c) Dockerfile addition is one line, no rewrite of
  multi-stage structure or non-root setup.
- §16 (retro) — Day 7 only (P1-R2 sprint retrospective drops there)

### Open call for Day 7

- Final verify on a clean checkout.
- Sprint retrospective in `docs/retros/p1-r2-audit-fields.md` per
  AGENT_DISCIPLINE §16.
- Blog post draft (already queued — see Day 6 prompt's reference to
  homesty.ai blog post Day 7).
- First GHA `docker.yml` run validation: confirm image landed at
  `ghcr.io/ykstorm/buyerchat:latest` after the Day 6 push to the
  feature branch (workflow only fires on `main` push; the Day 6 PR
  merge to main is what triggers the first build).




