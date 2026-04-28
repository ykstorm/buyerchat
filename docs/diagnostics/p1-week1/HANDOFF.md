# P1-R2 Week 1 — Sprint-scoped Handoff

> Sprint-scoped handoff for the audit-fields sprint. **NOT a substitute for
> `docs/SESSION_HANDOFF.md`** — that file is owned by the Agent F stream and
> tracks the global session state. This file tracks only the P1-R2 sprint.
>
> Update by **prepending** new day entries (most recent first). Each entry
> includes the day's commit SHA, end-state test count, and the queue for
> the next day.

## Last updated

2026-04-29 — Day 3 (`p1-audit-fields-day3`)

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

## Day 4 queue — RERA cache + delete duplicate scraper

**Goal:** wire the Day 2 `reraVerified` / `reraData` / `reraVerifiedAt`
cache columns and remove the orphaned scraper.

1. **Wire RERA cache on `/api/rera-fetch`:**
   - On a successful scrape (puppeteer or Claude fallback): persist the
     blob + flip `reraVerified=true` + set `reraVerifiedAt = now()` via
     `auditWrite({ entity: 'Project', action: 'verify_rera', after: {
     reraData, reraVerifiedAt }, actor: <admin-email> })`.
   - Project lookup before scrape: if `reraVerifiedAt > now() - 7d`,
     return the cached blob directly. Fresh-scrape only on cache miss
     or operator-forced refresh (`?refresh=true`).
   - On `RERA_GEO_BLOCKED` (existing 200 + `code:'RERA_GEO_BLOCKED'`
     response): do NOT flip `reraVerified`, do NOT cache. Keep
     manual-entry path the only verification on geo-block (Day 1 Q5).
   - **Manual-entry path** (`RERAManualEntry.tsx`): currently only fills
     form fields. Day 4 wires it to also persist `reraVerified=true`
     with `reraData = { source: 'manual', operator: email, raw: <pasted> }`
     and `reraVerifiedAt = now()` via `auditWrite` action `verify_rera`.

2. **Delete `/api/admin/rera-verify`:**
   - Day 1 flagged the route as duplicate-surface (217 lines, no UI
     wiring, never called). Sentry-search for the path string in last
     30d to confirm zero hits before deleting.
   - Remove the route file + any orphan helpers it imports.

3. **Tests:**
   - Cache-hit returns cached blob without calling puppeteer.
   - Cache-miss + successful scrape persists blob and flips
     `reraVerified`.
   - Geo-block does NOT flip `reraVerified` and does NOT cache.
   - Manual-entry path calls `auditWrite` with `verify_rera` and
     `source: 'manual'` payload.
   - At least 4 new tests; targets test count 175 → ≥179.

---

## Verify state baseline

| Day | SHA       | Tests   | Build | Notes |
|-----|-----------|---------|-------|-------|
| 1   | `33fedac` | 162/162 | clean | read-only investigation only |
| 2   | `2604474` | 170/170 | clean | +8 from auditWrite suite |
| 3   | `379c03f` | 175/175 | clean | +5 from bulk-upload suite |

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
