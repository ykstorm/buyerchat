# Current Sprint Handoff

> Source of truth between Claude Code sessions. Read at start, update
> at end. Do not let the operator re-explain context that lives here.

## Last updated

2026-04-29 — P1-R2 Day 2: audit fields + auditWrite helper + RERA cache columns shipped (branch `p1-audit-fields-day2`)

## What just shipped (most recent first)

- `2604474` — feat(audit): Day 2 of P1-R2 audit-fields sprint on branch `p1-audit-fields-day2`. Migration `20260428200000_add_audit_fields_and_rera_cache` applied to Neon via `prisma migrate deploy` (not manual SQL Editor) — adds `version` / `createdBy` / `updatedBy` to Project + Builder, `recordedBy` on PriceHistory, `entityVersion` on AuditLog, plus `reraVerified` / `reraData` / `reraVerifiedAt` on Project as the Day-4 7-day cache. Indices: `Project_updatedBy`, `Builder_updatedBy`, `Project_reraVerified`. New `src/lib/audit-write.ts` helper: array-form `prisma.$transaction([updateOp, auditOp])` only (Neon HTTP per discipline §3), optimistic locking via `where: { id, version: currentVersion }`, Sentry capture with `module: 'audit-write'` tag, `AuditWriteError` typed throw on null entity / empty actor / empty entityId. 8 new vitest cases (happy path Project + Builder, 4 input-validation rejects, Neon-shape array assertion, Sentry tag surfacing). Recovery note: mid-session a sibling Agent F auto-committed unrelated chat-surface work (`1871434` on `main`) which the harness rogue-checkout-ed underneath this work; Day 2 files were re-created verbatim from the operator-supplied prompt content and re-verified. **Test count: 162 → 170.** Build clean, schema valid, no bundle drift (audit-write is pure helper, not yet wired into route handlers).
- `33fedac` — docs(p1-r2): Day 1 audit-fields investigation — findings + 7-day plan (read-only). Schema field inventory keyed against the actual 481-line schema, RERA route map flagging `/api/rera-fetch` AND duplicate `/api/admin/rera-verify` (217-line scraper with no UI wiring; Day-4 deletion candidate at 80% confidence), 12-column delta proposal, reversal SQL, 6 open questions resolved at ≥80%. No code or schema changes.
- `d5e2d15` — feat(seo): Agent D — Shela locality SEO page (`/localities/shela` server-rendered, JSON-LD ItemList, generateStaticParams + dynamicParams=false to short-circuit unknown slugs to true 404, validated 200/14-projects vs 404/404/404 on south-bopal/bopal/daskroi) + per-project OG card on `/projects/[id]/opengraph-image.tsx` (ink/cream/gold brand surface, runtime nodejs for Prisma). South Bopal/Bopal deferred (DB has 1/0 projects respectively; locality SEO floor is ≥3 verified projects to avoid soft-404 demotion + brand-honesty problems). Schema deviations from the original prompt: Project.trustScore doesn't exist (used builder.totalTrustScore via relation); Project.unitTypes is String[] (used .join). 162/162 tests, build clean. (Agent D)
- `pending-sha` — feat(pdf+rera): /api/pdf-extract refactored to Anthropic messages.stream + SSE (`runtime: 'nodejs'`, `maxDuration: 60` per Hobby cap), emits `starting` / `progress` / `extraction_slow` (8s no-chunk) / `extraction_complete` / `error` events. New PdfStreamProgress.tsx consumer (Cloudinary upload → SSE stream, cosmetic phrase rotation, "Switch to manual" affordance on slow/error). New RERAManualEntry.tsx collapsed disclosure under existing "Fetch from portal" — applies fields directly to form (no new endpoint; existing project save handles persistence). /admin/projects list gets amber ⚠ Price needed pill (where minPrice===0) + Pricing → deep link adjacent to Edit →. 3 new vitest tests on streaming response shape (162/162). Step 3 read-only panel from `fee4e6e` UNTOUCHED. (Agent C)
- `3d465d9` — feat(pages+seo): Apartment + Organization JSON-LD on /projects/[id] and /builders/[id] layouts (server-rendered, prisma fetch cached and shared with generateMetadata, summary_large_image twitter cards). H1 on /projects/[id] now visibly carries "<Project> by <Builder> in <microMarket>, Ahmedabad" (was sr-only). Branded error copy on /chat/error.tsx + /projects/error.tsx. Italic founder-voice subline on dashboard EmptyShortlist. /compare empty state heading swaps to "1 selected — pick one more" + same "Pick two — Homesty AI will show the honest difference" subline; ProjectSelector accents the lone selected card with a blue ring; focus-visible rings on Add-project + dropdown rows. globals.css `--text-label` dark token #454560 → #6B7280 for 4.5:1 AA on #1C1917. 162/162 tests, build clean.
- `99e5c49` — fix(chat): iOS keyboard height — visualViewport listener + paddingBottom + 16px input fonts (P2-MOBILE-PRICING Bug 2)
- `fee4e6e` — fix(admin): /new + /[id] pricing step → skip / read-only + canonical pricing link (P2-MOBILE-PRICING Bug 1) — Mama landed on Step 3, saw editable BASE PRICE/MIN/MAX, typed 0s, submitted; API silently rejected pricing fields. Both wizard surfaces now redirect to canonical /admin/projects/[id]/pricing.
- `1dfe508` — feat(animations): site-wide motion polish — projects stagger, chat msg spring, right-panel slide, button tap, page fade, empty-state cascade (P2-DASHBOARD-SITE-REVAMP Parts 2+3)
- `8699838` — feat(dashboard): full rebuild — warm luxury editorial, gold serif, stagger, DB-wired, zero dead links (P2-DASHBOARD-SITE-REVAMP Part 1)
- `d721750` — fix(chat+ui): chips → card-producing queries + PROJECT_LIMIT cap + Playfair font + landing dead links (P2-CHIPS-DASHBOARD)
- `cbaf883` — docs(handoff): P2-CRITICAL-8 landed (6 bugs)
- `675ea2d` — fix(ui): remove FloatingChatWidget — Book Visit redirect replaces its purpose
- `71b1203` — feat(chat): Book Visit redirects to /chat with prefilled+autosend message (project page + book-visit event)
- `5d28e47` — fix(chat-api): bump abort timeout 15s→25s + recognise timeout vs leak + buyer Hinglish fallback
- `0fc8506` — fix(prompt+checker): purge "OTP ke baad" + WRONG/RIGHT bullet shot + FINAL REMINDER + amenity allowlist (Bugs 1+2+4)
- `1dc3b86` — chore(docker): Dockerfile.dev + multi-stage Dockerfile + compose + standalone output. Vercel ignores standalone flag.
- `d84bf66` — feat(dashboard): luxury warm-tone revamp — gold/black, spring animations, DB-wired (Shortlisted + Visits + Conversations + Activity Timeline)
- `1a05846` — test(prompt): lock PART 0 + few-shot ordering + parking-defuse invariants (156/156)
- `54561c1` — fix(prompt): NUCLEAR — PART 0 absolute rules at very top, EXAMPLE 17+18 first in PART 16, "parking allocation" → "parking space arrangement", result.onError noise traced to MARKDOWN_ABORT (resolves once bullets stop)
- `8f4e453` — fix(compare): accept ?ids=a,b,c URL preselect — future Compare CTAs / shareable links work
- `85d2aac` — fix(ui): floating chat only on /projects/[id] — was cluttering listing/profile/compare pages
- `b03cd63` — fix(nav): remove /builders index link — only /builders/[id] dynamic route exists
- `706feb3` — fix(prompt): ban OTP fabrication + zero-bullets rule + visit-booking holding message (Bugs 1+2+3, 153/153 tests)
- `d4d43d1` — fix(cron): escape slash-star in JSDoc (was closing comment, broke webpack parse)
- `022988c` — fix(infra): drop _comment from vercel.json (Vercel schema rejected unknown crons[] keys)
- `3bdc517` — fix(infra): cron schedule daily — Hobby plan blocks every-15-min (root cause of 7 missed deploys)
- `bae7ebc` — META-2: productivity infra (npm run verify, session handoff, verdict format, lint scope fix)
- `853a145` — INFRA-1: agent perm allowlist, pre-commit schema guard, GitHub Actions CI
- `129d220` — Pricing API lockdown (POST/PUT reject pricing fields, redirect to canonical)
- `6be0fda` — NextAuth maxAge 12h + Sentry PII scrub + capture state-probe lockdown
- `a0c6efa` — Stage A soft capture wired into chat
- `bf5fba2` — P2-WAVE2 audit bundle (master fix list + 4 sub-audits)

## What's in flight

Nothing in flight as of this writing. Last sprint (META-2) committed
clean. Working tree is clean except for untracked `.claude/` agent
config files (`.agent/`, `mcp-servers.json`, `rules/`, `skills/`,
`scheduled_tasks.lock`, `settings.local.json`) that intentionally
stay local.

## What's queued (priority order)

0. **Re-test on prod after auto-deploy of `99e5c49` + `fee4e6e`** — verify (a) /admin/projects/new Step 3 shows the warm-amber "Pricing entered AFTER project is created" panel, no editable price inputs, the "Skip Pricing — Set Later →" button advances to Step 4 (b) Final submit on /new redirects to /admin/projects/[id]/pricing (the BHK Configurations table page) (c) /admin/projects/[id] Step 3 shows read-only persisted pricing snapshot + "Manage pricing →" button to canonical surface (d) On iPhone Safari, opening /chat and tapping the input keeps the input bar visible above the keyboard, no zoom-on-focus. Plus continued P2-DASHBOARD-SITE-REVAMP smoke (dashboard layout, /projects stagger, chat msg fade, no flash-of-white). Sentry checks per earlier `1dfe508` re-test still owed.

   **MAMA — REDO PRICING:** Whatever projects she created in the last 24h
   were saved with pricing fields silently rejected. She must
   re-enter pricing for each project on /admin/projects/[id]/pricing.
1. **P2-CLEANUP-AUDIT (read-only sprint)** — operator asked for: (a) dead workflow + dead-API-route audit, (b) account-deletion / buyer-data-purge feature spec, (c) project detail page UI consistency review (operator says "first one still old"). Output: docs/diagnostics/cleanup-audit-apr27.md. Read-only, no code changes — produces the actionable backlog for a follow-up sprint. NOTE: dashboard animation pass (item c on the original plan) is now COMPLETE per this sprint.
2. **P2-WAVE2-A1** — Stage B Hard Capture (single agent, foreground, 1-2 hr). Spec in operator-provided prompt; Option 1 (phone-only, no verify) decision is locked. `VERIFY_METHOD=none` default.
2. **P2-WAVE2-A2** — In-chat visit booking 4-step flow (sequential after A1, ~1 day).
3. **P2-WAVE2-A3** — Stage-aware follow-up buttons (sequential after A2, 4 hr).
4. **P2-WAVE2-B** — parallel: lead scoring + junk mark, A1b/A1c pricing UI strip, navbar/floating-button cleanup.
5. **P2-WAVE2-C** — parallel: `withSentry` route wrapper, Playwright e2e.
6. **INFRA-2** — Dockerize (compose for local dev, multi-stage prod, GHCR push, dependabot).
7. **P2-DEMO** — `/showcase` cinematic marketing surface (Linear/Vercel/Apple-style motion). LAST. Record demo video against this route, not the real `/chat`.

## Open decisions (operator pending)

- **RERA fetch (Phase 3).** Mama 2026-04-28: manual entry stays canonical
  for Phase 1-2 (already shipped in `8f3ad98` — admin RERA-manual fallback
  + price-needed pill). AWS Mumbai (ap-south-1) instance routing only RERA
  portal requests is deferred to Phase 3 (post first-close). Cost framed
  as "minimal" but not warranted until platform earns. **Do NOT propose
  RERA scrapers, geographic routing, or AWS infra in current sprints.**

## Known issues / workarounds

- `/chat` First Load JS is 300 kB (target 280 kB). Workaround: noted in `docs/MASTER_FIX_LIST.md` Block C5 — finish LazyMotion + lazy ReactMarkdown will close the gap. Not blocking demo.
- Schema-format-only commits hit the pre-commit migration check. Workaround: `git commit --no-verify` once with documented reason; future schema changes go through the hook normally. The bootstrap commit `853a145` is the documented precedent.
- `gh` CLI not installed locally — operator verifies CI runs at <https://github.com/ykstorm/buyerchat/actions> manually.

## Verification state (last `npm run verify` baseline)

- Tests: **170/170** passing (post `2604474`; +8 from auditWrite suite — happy path Project + Builder, 4 input-validation rejects, Neon-shape array assertion, Sentry tag surfacing). Baseline ratcheted up from 162.
- Build: **clean**. No bundle drift from Day 2 (audit-write is a pure helper, not wired into any route handler yet; first integration lands in Day 3+). /chat 49.9 → 50.1 kB route / 300 → 301 kB first-load. /admin/projects/new 6.77 kB / 223 kB. /admin/projects/[id] 8.63 kB / 225 kB.
- Lint: clean on touched files (pre-existing warnings on untouched files OK per discipline §9)
- Schema: `prisma validate` passes
- Sentry: 5 issues open — JS-NEXTJS-K/E/J pending operator-resolution (closed by recent commits per `docs/diagnostics/sentry-resolution-log-2026-04-26.md`); JS-NEXTJS-B (NO_MARKDOWN) and JS-NEXTJS-9 (RERA timeout) intentionally audit-only

## Mama's last test session

- **2026-04-28 ~01:04 IST** — Mama tried /admin/projects/new and was caught by the duplicate-surface bug (Step 3 had editable price inputs that the API silently rejected). She entered 0s and submitted; projects from last 24h have no real pricing. Fix `fee4e6e` lands her on /admin/projects/[id]/pricing post-create from now on. **She must redo pricing for projects created in the gap.**
- Pricing entry workflow on the canonical /admin/projects/[id]/pricing page not yet retested by Mama post-lockdown commit `129d220`.
- 3 unverified `analystNote` rows still pending review per `docs/diagnostics/insider-note-mama-review.md` (Riviera Bliss, Shaligram Pride, Vishwanath Sarathya West).

## Latest production deployment

- **dpl_2rFv9mjmt3QqmZQtSHCJxepCFAoa** at `https://buyerchat-gmqjtj78j-ykstorms-projects.vercel.app`, aliased to `homesty.ai` + `www.homesty.ai`. Built from commit `d4d43d1`. Status: ● Ready (manually deployed via `npx vercel deploy --prod`).
- **Root cause of 7 missed auto-deploys identified and fixed:** `vercel.json` cron expression was every-15-min, which Hobby plan rejects. Vercel was failing the deploy at the validation step before reaching the build phase, so no logs surfaced unless you explicitly ran `vercel deploy`. The webhook itself was never broken.
- **Future pushes should auto-deploy normally** since `vercel.json` is now schema-valid and the cron is daily-frequency. If a future push doesn't deploy within ~3 min, run `npx vercel ls` to inspect.
- **When upgrading to Vercel Pro:** revert the cron in `vercel.json` and the docblock in `src/app/api/cron/visit-followups/route.ts:1-22` back to every-15-min for tighter T-24/T-3/T-1 followup precision. Comment in the route file documents this.
