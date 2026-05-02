# P1-R2 Week 1 — Audit Fields + RERA Cache: 7-Day Plan

> One day = one branch = one commit. Day N writes only `docs/diagnostics/p1-week1/<file>`
> for diagnostics; code changes are scoped to the deliverables stated below.
> Each day starts with a fresh `git status` check + `npm run verify` baseline.

## Day 1 — Investigation (DONE on `p1-audit-fields-day1`)

- [x] Read SESSION_HANDOFF + AGENT_DISCIPLINE
- [x] Confirm working-tree state (no WIP — `840282f` had already landed)
- [x] Branch `p1-audit-fields-day1` off `840282f`
- [x] `npm run verify` baseline: **162/162, build clean, schema valid**
- [x] Inventory audit-relevant fields on `Project`, `Builder`, `PriceHistory`,
      `ProjectPricing`, `PricingHistory`, `AuditLog` with current `prisma/schema.prisma`
      file:line refs (481 lines)
- [x] Map `/api/rera-fetch` + flag duplicate `/api/admin/rera-verify` route
- [x] Schema delta proposal (12 cols + 3 indices) + reversal SQL block
- [x] Six open questions resolved at ≥80% confidence
- [x] Diff Agents B/C/D commits (`99e5c49..1e09dd7`) — confirm zero schema impact
- [x] Commit `findings.md` + `task_plan.md` + `progress.md` to `p1-audit-fields-day1`

**Deliverable shipped:** `docs/diagnostics/p1-week1/findings.md` + this file +
`progress.md`. NO schema changes. NO migration. NO code in `src/`.

## Day 2 — Schema migration (PENDING)

- [ ] Branch `p1-audit-fields-day2` off Day 1's HEAD
- [ ] Apply Day 1 delta to `prisma/schema.prisma`:
      - Project: `+createdBy`, `+updatedBy`, `+version`, `+reraVerified`,
        `+reraData`, `+reraVerifiedAt`, `+@@index([updatedBy])`,
        `+@@index([reraVerified])`
      - Builder: `+createdBy`, `+updatedBy`, `+version`, `+@@index([updatedBy])`
      - PriceHistory: `+recordedBy`
      - AuditLog: `+entityVersion`
- [ ] `npx prisma format` (must produce no diff after the manual edit)
- [ ] `npx prisma migrate dev --name add_audit_fields_and_rera_cache`
- [ ] Verify the generated SQL matches Day 1's reversal SQL inverted
- [ ] `npm run verify` — must stay 162/162
- [ ] Commit migration + schema in same commit (pre-commit hook enforces)
- [ ] **DO NOT** apply to prod Neon yet — Day 4 verifies on a deploy preview

**Deliverable:** `prisma/migrations/<ts>_add_audit_fields_and_rera_cache/`
applied to dev DB. Schema in sync. No production write yet.

## Day 3 — `audit-write.ts` wrapper (PENDING)

- [ ] Branch `p1-audit-fields-day3` off Day 2's HEAD
- [ ] New file: `src/lib/audit-write.ts`. Exports:
      - `auditedProjectUpdate(id, data, operatorEmail)` — bumps `version`,
        sets `updatedBy`, writes AuditLog row with `entityVersion`
      - `auditedBuilderUpdate(...)` — same
      - `auditedPriceHistoryCreate(...)` — sets `recordedBy`
- [ ] Refactor `/api/admin/projects/[id]/route.ts` PUT to call
      `auditedProjectUpdate`
- [ ] Refactor `/api/admin/builders/[id]/route.ts` PUT to call
      `auditedBuilderUpdate`
- [ ] Vitest: 6 tests minimum (3 success, 3 failure modes per AGENT_DISCIPLINE §8)
- [ ] `npm run verify` — must hit 168+/168+

**Deliverable:** every operator-facing edit on Project + Builder is now
versioned, attributed, and audit-logged with entityVersion captured.

## Day 4 — RERA cache wiring (PENDING)

- [ ] Branch `p1-audit-fields-day4` off Day 3's HEAD
- [ ] Refactor `/api/rera-fetch/route.ts`:
      - On scrape success → write `Project.reraVerified=true`,
        `reraData=<scrape>`, `reraVerifiedAt=now()`
      - On geo-block → leave fields unchanged (Q5)
- [ ] Add 7-day TTL check on a new `/api/rera-status?reraNumber=X` GET
      that returns cached data if fresh, else triggers re-scrape
- [ ] Wire `RERAManualEntry.tsx` to set `reraVerified=true` +
      `reraData={source:'manual',raw,operatorEmail}` on operator submit
- [ ] Decide: delete `/api/admin/rera-verify` (the duplicate route from §3)
      or keep as an extractor fallback? **Default: delete.** Confidence 80%.
- [ ] `npm run verify`

**Deliverable:** RERA verification persists. 7-day TTL cuts scraper calls.
Manual-entry path correctly attributes operator vouching.

## Day 5 — Read paths + buyer-facing surfacing (PENDING)

- [ ] Branch `p1-audit-fields-day5` off Day 4's HEAD
- [ ] `/admin/projects/[id]` shows last edit metadata (updatedBy, version,
      audit history sidebar)
- [ ] `/projects/[id]` shows "RERA verified ✓" badge when
      `reraVerified=true` AND `reraVerifiedAt` is fresh (<30d for display)
- [ ] AuditLog viewer at `/admin/audit?entity=Project&id=X` shows version
      timeline
- [ ] Vitest UI snapshot tests
- [ ] `npm run verify`

**Deliverable:** versioning + RERA verification visible to operator AND buyer.

## Day 6 — Production migration + verification (PENDING)

- [ ] Branch `p1-audit-fields-day6` off Day 5's HEAD
- [ ] Run `npx prisma migrate deploy` against production Neon
- [ ] Verify migration ran (count columns on Project)
- [ ] Backfill: leave `createdBy/updatedBy=NULL` for all existing rows
      (no script needed — defaults handle it)
- [ ] Operator (Mama) test pass: edit one project, verify
      `updatedBy=her-email`, `version=2`, AuditLog row created
- [ ] Smoke test `/api/rera-fetch` against one real RERA number from prod
- [ ] `npm run verify` against prod database

**Deliverable:** delta live on prod, no buyer-facing regressions.

## Day 7 — Retro + handoff (PENDING)

- [ ] Branch `p1-audit-fields-day7` off Day 6's HEAD
- [ ] `docs/retros/p1-r2-audit-fields.md` per AGENT_DISCIPLINE §16
      (multi-day sprint requires retro)
- [ ] Update `SESSION_HANDOFF.md`:
      - Move "Audit fields + RERA cache" into "What just shipped"
      - New verification baseline (~170/170 tests expected)
      - Open issues found during the week
- [ ] PR sweep — fold all 6 daily branches into one merge or 6 sequential
      PRs (operator preference)

**Deliverable:** sprint closed, baseline ratcheted, lessons captured.

---

## Cross-day invariants

- Tests never decrease — 162 baseline, must end Day 7 ≥168.
- `/chat` bundle does not grow (this sprint is admin/server-side; no client
  bundle impact expected).
- No `--no-verify` commits.
- No production migration before Day 6.
- Every commit message follows the `<type>(scope): subject` convention seen
  in recent main.
- Each day's branch is preserved, not rebased — operator can audit per-day
  diffs.

## Open decisions (operator may override before Day 2)

If any of the following ≥80%-confidence defaults are wrong, Day 1 commit
is the cut-line — operator should reply before Day 2 starts:

- Q2: createdBy/updatedBy as plain String (vs FK to User.email)
- Q3: reraData as Json blob (vs normalized columns)
- Q4: 7-day RERA cache TTL (vs 1d / 30d)
- Day 4 default: delete `/api/admin/rera-verify` (the duplicate scraper)

The other questions (Q1 NOT NULL version, Q5 geo-block leaves
reraVerified=false, Q6 entityVersion nullable) are at 95% / 95% / 85% — Day 2
proceeds without operator input unless explicitly held.
