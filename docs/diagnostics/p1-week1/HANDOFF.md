# P1-R2 Week 1 — Sprint-scoped Handoff

> Sprint-scoped handoff for the audit-fields sprint. **NOT a substitute for
> `docs/SESSION_HANDOFF.md`** — that file is owned by the Agent F stream and
> tracks the global session state. This file tracks only the P1-R2 sprint.
>
> Update by **prepending** new day entries (most recent first). Each entry
> includes the day's commit SHA, end-state test count, and the queue for
> the next day.

## Last updated

2026-04-29 — Day 4 (`p1-audit-fields-day4`)

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

## Day 5 queue — Builder Onboarding Wizard (4-step)

**Goal:** ship a `/admin/builders/new` (and `/admin/builders/[id]/edit`)
wizard surface that captures Builder rows with operator-trust provenance
and audit-logged version bumps. Day 4 closed the project-side cache; Day
5 brings parity to the builder-side admin flow and starts wiring
provenance fields on free-text content.

1. **Wizard UX (4 steps):**
   - Step 1: identity + brand (`builderName`, `brandName`, optional
     `partnerStatus`, `commissionRatePct`).
   - Step 2: trust scores 5×0–20 (`deliveryScore`, `reraScore`,
     `qualityScore`, `financialScore`, `responsivenessScore`) with the
     auto-grade computation already used in
     `src/app/admin/builders/[id]/page.tsx`.
   - Step 3: contact (`contactEmail`, `contactPhone` — these are
     intentionally **excluded from AI context** per
     `src/lib/types/builder-ai-context.ts` — wizard must surface a
     warning chip "AI never sees this").
   - Step 4: review + create. Save fires `prisma.builder.create` (sets
     `createdBy: email`, `version: 1`) followed by the canonical
     `auditWrite({ entity: 'Builder', action: 'create' })` to start the
     audit trail at version 2 (matches Day 3 bulk-upload semantics).

2. **Manual-entry → reraVerified flip (deferred from Day 4):**
   - `RERAManualEntry.tsx` currently fills form fields client-side but
     does NOT persist a manual verification marker. Wire it to call
     `/api/rera-fetch` with a new optional `manualPayload` body field
     (or a sibling `/api/rera-verify-manual` route) that flips
     `reraVerified=true` with `reraData = { source: 'manual', operator:
     email, raw: <pasted> }` and `reraVerifiedAt = now()` via the
     existing `auditWrite` helper (action `verify_rera`).

3. **Tests:**
   - 4-step navigation (Next/Back state machine) with a small unit suite
     against the wizard's `useReducer` reducer — pure-function tests, no
     prisma mocks.
   - Builder create POST: `auditWrite` called once with `action: 'create'`,
     actor email captured, `entityVersion: 2`.
   - Manual-entry path: POST flips `reraVerified` + records `source:
     'manual'` in `reraData`. Geo-block path remains untouched.
   - Targets test count 181 → ≥185.

---

## Verify state baseline

| Day | SHA       | Tests   | Build | Notes |
|-----|-----------|---------|-------|-------|
| 1   | `33fedac` | 162/162 | clean | read-only investigation only |
| 2   | `2604474` | 170/170 | clean | +8 from auditWrite suite |
| 3   | `379c03f` | 175/175 | clean | +5 from bulk-upload suite |
| 4   | `508eb09` | 181/181 | clean | +6 from rera-fetch suite (cache HIT/MISS, force, GEO_BLOCK, regex, deletion lock-in) |

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
