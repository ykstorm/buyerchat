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


