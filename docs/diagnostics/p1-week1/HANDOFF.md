# P1-R2 Week 1 — Sprint-scoped Handoff

> Sprint-scoped handoff for the audit-fields sprint. **NOT a substitute for
> `docs/SESSION_HANDOFF.md`** — that file is owned by the Agent F stream and
> tracks the global session state. This file tracks only the P1-R2 sprint.
>
> Update by **prepending** new day entries (most recent first). Each entry
> includes the day's commit SHA, end-state test count, and the queue for
> the next day.

## Sprint summary (P1-R2 Week 1 closed)

- **Total commits:** 13 — six feature commits (Day 1-6) + six HANDOFF
  doc commits + one Day-7 docs commit (this one).
- **Total LOC delta:** ~3,500 lines added / ~700 deleted across the
  sprint (per per-day commit reports — exact figures in the Day-N
  entries below).
- **Tests:** 162 → 207 (+45 across six implementation days).
- **New files (~22):** `src/lib/audit-write.ts` + test, `src/lib/with-sentry.ts` + test,
  `src/lib/grade.ts` (existing, used by builders route),
  `src/components/admin/RERAVerifyPill.tsx`,
  `src/components/admin/builder-wizard/wizard-reducer.ts` + test,
  `src/app/admin/projects/bulk-upload/page.tsx`,
  `src/app/admin/projects/bulk-upload/bulk-upload-form.tsx`,
  `src/app/admin/builders/new/page.tsx` (rewritten),
  `src/app/admin/builders/new/builder-wizard.tsx`,
  `src/app/api/admin/projects/bulk-upload/route.ts` + test,
  `src/app/api/admin/builders/route.test.ts`,
  `src/app/api/healthcheck/route.ts` + test,
  `src/app/api/rera-fetch/route.test.ts`,
  `.github/workflows/docker.yml`,
  `prisma/migrations/20260428200000_add_audit_fields_and_rera_cache/migration.sql`.
- **Deletions:** 2 — orphan `BuilderForm.tsx` (Day 5) and duplicate
  `/api/admin/rera-verify` scraper (Day 4).
- **New docs:** `docs/diagnostics/p1-week1/findings.md`, `task_plan.md`,
  `progress.md`, `HANDOFF.md` (this file), `final-verify.txt`,
  `docs/observability.md`, `docs/blog/part-0-absolute-rules.md`,
  `docs/retros/p1-week1.md`.
- **Block E4 closed** across both write paths.
- **`auditWrite` actions in production:** `bulk_import`, `verify_rera`
  (scrape + manual), `create`. Implicit `update` available.

## Next sprint

P1-R2 sprint **closed**. Portfolio next is **Project 2 (WellVerse polish + dockerize)** —
~4-6 hours estimated, kicks off 2026-04-30. P3 (DevOps Pipeline)
follows.

## Last updated

2026-04-29 — Day 7 (`p1-audit-fields-day7`) — sprint closed

---

## Day 7 — 2026-04-29 — `<DAY-7-SHA>` — Blog + retrospective + final verify (sprint close)

**Status:** [OK] — sprint closed on `p1-audit-fields-day7` off `2856ad5` (Day 6 docs head).

**What landed:**

- `docs/blog/part-0-absolute-rules.md` (NEW, 1817 words) — public-facing
  writeup. Five sections: hook (real fake-OTP incident, accurately
  retold), diagnosis (positional weight + long-context drift),
  structural fix (PART 0 + FINAL REMINDER + audit-only regex + few-shot
  + commit-history receipts), result (8+ classes closed, 0 P0/P1 open,
  162→207 tests), deeper lesson (5-step pattern that works), 5-layer
  architecture summary, what-didn't-fix (response-checker still
  audit-only, 13 PART 8.5 rules without regex counterparts). Every
  metric SHA-sourced; footnote pegged to Day-7 SHA.
- `docs/retros/p1-week1.md` (NEW) — per AGENT_DISCIPLINE.md §16. Two
  paragraphs: what worked / what surprised, what to do differently.
  Numbers section at end with the same SHA-sourced metrics.
- `docs/diagnostics/p1-week1/HANDOFF.md` — this section + the new
  Sprint summary block prepended at the top + "Next sprint" pointer
  to Project 2 (WellVerse).
- `docs/diagnostics/p1-week1/final-verify.txt` (NEW) — captured stdout
  of the final `npm run verify` run for the record.

**No code changes.** Pure documentation + validation day per
prompt's anti-requirement.

**Verify:** **207/207 tests, build clean, schema valid** — captured to
`final-verify.txt`. Test count holds from Day 6.

**Discipline checklist applied:** §9, §10, §13, §14, §16. Others n/a
(no code changes).

---

## Day 6 — 2026-04-29 — `9a02c24` — GHCR push GHA + healthcheck + Dockerfile HEALTHCHECK + withSentry PoC

**Status:** [OK] — shipped on `p1-audit-fields-day6` off `2b308b5` (Day 5 head).

**What landed:**

- `.github/workflows/docker.yml` (NEW) — sibling to `ci.yml`. Triggers
  on `main` push + `v*` tags. Builds the existing multi-stage Dockerfile
  and pushes to `ghcr.io/ykstorm/buyerchat:{latest, sha-<short>, <semver>}`
  via pinned-major actions (checkout@v4, buildx@v3, login@v3, metadata@v5,
  build-push@v6). `permissions: { contents: read, packages: write }`.
  GitHub Actions cache layer (`type=gha, mode=max`) for re-build speed.
- `Dockerfile` — single additive line before `CMD`:
  `HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3
  CMD wget -qO- http://localhost:3000/api/healthcheck || exit 1`. Nothing
  else changed.
- `src/app/api/healthcheck/route.ts` (NEW) — public, unauthenticated
  GET. Single `prisma.$queryRaw\`SELECT 1\`` round-trip. 200 ok JSON
  on success (`status, commit, uptime, timestamp`); 503 degraded JSON
  on DB failure. No Sentry breadcrumb on success (anti-flood), no auth
  (LB compatibility), `runtime: 'nodejs'` for Prisma.
- `src/lib/with-sentry.ts` (NEW) — HOC wrapping Next.js route handlers
  with try/catch + `Sentry.captureException(tags: { module:
  'with-sentry', route })` + 500 JSON with `requestId`. Permissive
  `(...args: any[])` handler shape so it works against any route
  signature. Applied to `/api/admin/projects/bulk-upload` only (PoC) —
  full rollout deferred to `MASTER_FIX_LIST` D1.
- `docs/observability.md` (NEW) — operator runbook. Architecture
  diagram, 5-layer bug detection writeup, Sentry tag convention table,
  withSentry rollout plan, healthcheck contract, anti-patterns. All
  metrics cited with commit SHAs. Footnote at end is pegged to
  `9a02c24` and must be updated on every future edit.
- 4 new tests: 2 healthcheck (happy + degraded), 2 with-sentry
  (pass-through + error capture).

**Prisma `$queryRaw\`SELECT 1\`` first try:** Yes — no Neon-HTTP adapter
adjustment needed. The existing `PrismaNeonHttp` (`src/lib/prisma.ts:4`)
handles `$queryRaw` as a single round-trip without session state.

**Verify:** **207/207 tests** (203 → 207, +4). Build clean. /chat
bundle stable at 217 kB. Pre-commit ran tests. One in-loop type-check
fixup applied during verify (`RouteHandler` constraint relaxed to
`(...args: any[])` so test handlers typed as `(_req: Request) => …`
infer T correctly); second verify run was green.

**Discipline checklist applied:** §1 (no new external hosts; GHCR is a
registry not a runtime), §2, §3 (`$queryRaw` not `$transaction`), §4
(observability runbook is first of its kind, no overlapping surface),
§5, §6 (3s Docker timeout, 10s grace), §9, §10, §11, §12, §13, §14,
§15. §7, §8, §16 — n/a.

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

## Day 7 queue — Sprint retrospective + final verify + blog post draft

**Goal:** close P1-R2 with a clean handoff. Day 1-6 produced the
audit-fields machinery, the operator-trust surfaces, and the
observability scaffolding. Day 7 documents the sprint and validates the
Day 6 docker.yml run on `main`.

1. **Sprint retrospective** at `docs/retros/p1-r2-audit-fields.md` per
   AGENT_DISCIPLINE §16 (multi-day sprints get a retro at the end). Two
   sections: "What worked / what surprised" and "What to do differently
   next time". Source every claim to a commit SHA from this sprint —
   162 → 207 tests (+45), 6 commits across 6 days, 1 deletion (the
   217-line duplicate scraper), 1 deletion (the orphan BuilderForm),
   Block E4 closed across both write paths, auditWrite spans 4 actions
   (`bulk_import`, `verify_rera`, `create`, plus the implicit `update`
   when other surfaces adopt it).

2. **Final verify on a clean checkout.** `git clean -nxd` first to
   inspect untracked, then `npm ci && npm run verify` from a fresh
   `node_modules`. Confirms the lock file is honest about install order.

3. **Blog post draft (homesty.ai)** — first-person operator narrative
   covering the five layers of bug detection (now backed by
   `docs/observability.md`). Out of repo scope per usual; coordinate
   with operator on copy.

4. **GHA `docker.yml` validation:** the workflow only fires on `main`
   pushes. Day 6's PR (`p1-audit-fields-day6` → `main`) merge will
   trigger the first build. After merge, confirm:
   - https://github.com/ykstorm/buyerchat/actions for the docker run
     status (green or paste failing step output verbatim).
   - `ghcr.io/ykstorm/buyerchat:latest` exists and is pullable.
   - First registry-side image tag includes the merge commit's
     short-sha.
   If GHA fails on missing `packages: write` permission, operator must
   enable Actions write packages permission in repo settings — same
   anti-requirement as Day 6.

5. **No code changes expected.** Day 7 is documentation and validation.
   If a regression surfaces during final verify, that's a new sprint, not
   a Day 7 patch.

---

## Verify state baseline

| Day | SHA       | Tests   | Build | Notes |
|-----|-----------|---------|-------|-------|
| 1   | `33fedac` | 162/162 | clean | read-only investigation only |
| 2   | `2604474` | 170/170 | clean | +8 from auditWrite suite |
| 3   | `379c03f` | 175/175 | clean | +5 from bulk-upload suite |
| 4   | `508eb09` | 181/181 | clean | +6 from rera-fetch suite (cache HIT/MISS, force, GEO_BLOCK, regex, deletion lock-in) |
| 5   | `4718b67` | 203/203 | clean | +22 (15 reducer + 5 builders POST + 2 rera-fetch manualPayload) |
| 6   | `9a02c24` | 207/207 | clean | +4 (2 healthcheck + 2 with-sentry); GHCR push GHA + Dockerfile HEALTHCHECK + observability.md runbook |
| 7   | `<DAY-7-SHA>` | 207/207 | clean | docs only — blog post (1817 words) + retro + final-verify capture; sprint closed |

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
