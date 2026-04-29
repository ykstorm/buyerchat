# Current Sprint Handoff

> Source of truth between Claude Code sessions. Read at start, update
> at end. Do not let the operator re-explain context that lives here.

## Last updated

2026-04-29 — Sprint 2: artifact persistence on session refresh

## What just shipped (most recent first)

- `pending-sha-2` — feat(persistence): Sprint 2 — artifact history persists on ChatSession + rehydrates on refresh. New `ChatSession.artifactHistory: Json?` column (migration `20260429220000_add_artifact_history_to_chat_session` deployed to Neon). `/api/chat` parses CARD blocks from the assistant response after stream completes, appends `PersistedArtifact{ type, projectId, projectIdA, projectIdB, builderName, grade, trustScore, emittedAt }` rows to the session. `/api/chat-sessions/[id]` GET returns `artifactHistory[]` in the payload. New pure `lib/artifact-hydrate.ts` joins persisted IDs against current projects/builders arrays — deleted projects silently drop, all 6 artifact types (project_card, comparison, builder_trust, cost_breakdown, visit_booking, visit_prompt) supported. chat-client's keyword-match restore loop deleted (was missing every artifact type except project_card and only on full-projectName prose match). Backwards compatible: old sessions have artifactHistory=null → empty panel, same as pre-Sprint-2. Tests: 194/194 (was 184, +10 — full hydration coverage in `lib/artifact-hydrate.test.ts`).
- `406cbc9` — fix(prompt+checker): Sprint 1 — kill Image 6 fake-visit hallucination. PART 5/6/7 + EXAMPLE 18 + RULE B body now conditionally injected via `ctx.stageBEnabled`; default OFF means AI never sees Stage B trigger scripts ("Mobile number share karein — calculation unlock", "[Name] ka visit request note ho gaya. Project: ... Preferred slot: ..."). Flag-off replacements explicitly forbid phone-asking-in-prose and treat phone-shaped buyer input as ambient text. EXAMPLE 18 inverted: Image 6's exact bad output now framed as ❌ with diagnostic annotations + ✓ correct flag-off response. response-checker CHECK 17 widened to catch "visit request note ho gaya" + "Preferred slot:" patterns when flag-off (falls back to narrow regex when flag-on so legit PART 7 holding messages don't false-positive). New CHECK 18 PHONE_REQUEST_IN_PROSE catches AI asking for phone in prose while flag is dark. /api/chat passes `STAGE_B_ENABLED` into prompt ctx. Existing Agent G Stage B gate (46dd11d) untouched. Reversibility: flipping `STAGE_B_ENABLED=true` on Vercel reactivates legacy scripts with no code change. Tests: 184/184 (was 174, +10 — flag on/off prompt assertions + 6 checker assertions covering Image 6 strings).
- `97c9a47` — fix(chat): kill capture-card flash + persist captureSubmitted across reloads. Pre-fetch captureStage in a sessionId-watching useEffect (not in sendMessage finally block). Mirror captureSubmitted to sessionStorage per-session. captureStageLoaded gate fail-closed. 174/174.
- `46dd11d` — feat(stage-b): hard-capture OTP infrastructure — feature-flagged dark by default. OtpCode model (sha256+salt, 5-min TTL, 5-attempt cap, 3/10min throttle), MSG91+Console SMS provider abstraction, /api/otp/{send,verify} (404 unless STAGE_B_ENABLED), StageBCapture inline 3-step component, intent-classifier hardCapture detection (5 intents), /api/chat gate skipped when flag off. 174/174.
- `1871434` — feat(chat-surface): Agent F — pillar starters + scroll-instant + send affordance + mobile taps + founder anchor + compose-message + gold pulse + chip stagger. 162/162.
- `840282f` — feat(admin): cosmetic revamp — branded dead-states + lineart nav + empty states. 162/162.
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

- Tests: **162/162** passing (post 95c8c81 cards + 99e5c49 + fee4e6e; baseline ratcheted up from 159)
- Build: **clean**. /chat 49.9 → 50.1 kB route / 300 → 301 kB first-load (+0.2 kB route from visualViewport listener). /admin/projects/new 6.77 kB route / 223 kB (down ~1.6 kB from removing the editable pricing form). /admin/projects/[id] 8.63 kB route / 225 kB (down ~1 kB from same).
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
