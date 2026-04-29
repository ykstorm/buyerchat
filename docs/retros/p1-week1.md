# P1-R2 Week 1 Retrospective — audit fields, RERA cache, bulk upload, builder wizard, Docker, observability

> Per AGENT_DISCIPLINE.md §16 — multi-day sprints get a retro at the end.
> Two paragraphs, one for what worked, one for what to do differently.

## What worked / what surprised

The two-phase sprint pattern — Day 1 read-only investigation,
implementation from Day 2 onward — caught two stale-snapshot bugs
before they shipped. The original `findings.md` had the wrong line
numbers against `prisma/schema.prisma` (the prompt assumed 430 lines;
the actual file was 481), and the schema delta needed the real
existing `ProjectPricing.pricingVersion` precedent (line 459) to
anchor the design. Discovering the precedent reduced design risk
significantly: Day 2 was **propagating an existing convention, not
inventing one**. Lesson worth keeping — audit existing patterns
before designing new ones. AGENT_DISCIPLINE §4 (duplicate-surface
check) found two pieces of dead code that would have rotted forever:
the orphan `BuilderForm.tsx` (249 lines, never imported) and the
duplicate `/api/admin/rera-verify` scraper (217 lines, zero callers).
Both deleted with locked-in tests asserting they no longer exist.
The optimistic-locking pattern in `auditWrite` —
`where: { id, version: currentVersion }` — turned out to be
generically reusable: every future entity that wants an audit trail
gets the pattern for free, including the genesis-create variant where
the audit row lands at `entityVersion: 2` to mark "first appeared as
a create event." Surprise of the sprint: the worktree split
(`C:\Users\pc\Documents\buyerchat` for Agent F's chat-surface stream,
`C:\Users\pc\Documents\buyerchat-p1` for this one) eliminated all
rogue-checkout collisions. Without it, mid-Day-2 nearly lost the
working tree to an Agent F auto-commit; the recovery cost ~30 minutes
of focused work that should never have been needed.

## What to do differently next time

Set up worktrees **before** the first parallel-stream collision, not
after. The Day 2 file recovery was avoidable. The sprint-scoped
HANDOFF doc (`docs/diagnostics/p1-week1/HANDOFF.md`) should have been
created on Day 1, not Day 3. The first two days' updates went to the
top-level `docs/SESSION_HANDOFF.md` which Agent F also writes to —
the resulting merge tension was unnecessary, and both streams ended up
re-reading sections that should have lived in their own docs from the
start. The `withSentry` rollout to all ~20 routes (tracked at
`docs/MASTER_FIX_LIST.md` D1) should probably have been Day 6, not
deferred. PoC on bulk-upload only was the correct conservative call
for the first deploy of the wrapper, but full rollout in the same day
was likely feasible — the wrapper is ~25 LOC and the per-route diff
is identical. Anti-requirements lists grew to 12 items by Day 5;
that is a sign scope was just barely controlled. Next sprint, keep
the count under 8 by either narrowing scope or splitting heavy days
into two narrower days. One concrete process change for the next
multi-day sprint: write the HANDOFF doc skeleton on Day 1 with empty
day entries, even if no work has landed there yet — it forces the
sprint-vs-session boundary into visibility from hour zero.

## Numbers

- **162 → 207 tests** (+45 across six implementation days).
- **13 commits** total — six feature commits (Day 1-6) plus six
  HANDOFF doc commits, plus this retrospective commit.
- **2 deletions** — orphan `BuilderForm.tsx` and duplicate
  `/api/admin/rera-verify` scraper.
- **Block E4 closed** across both write paths (single-fetch + bulk-upload).
- **`auditWrite` spans 4 actions** in production —
  `bulk_import` (Day 3), `verify_rera` (Day 4 scrape + Day 5 manual),
  `create` (Day 5 builder wizard). The implicit `update` action is
  available for future surface adoption.
- **0 P0/P1 Sentry classes open** as of sprint close.

---

*Retrospective sourced to commits `33fedac` (Day 1), `2604474` (Day 2),
`379c03f` (Day 3), `508eb09` (Day 4), `4718b67` (Day 5), `9a02c24`
(Day 6) on `github.com/ykstorm/buyerchat`. Update on republish if any
metric drifts.*
