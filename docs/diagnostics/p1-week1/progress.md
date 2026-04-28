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

