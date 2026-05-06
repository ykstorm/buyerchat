# Current Sprint Handoff

> Source of truth between Claude Code sessions. Read at start, update
> at end. Do not let the operator re-explain context that lives here.

## Last updated

2026-05-05/06 — Sprint 12.X.3 (chore): Day 4 marathon stand-down. **32 commits across 16 named sprints** in 6+ hours. Sprint 13 audit core (Conflicts + Duplications + Dead rules) **100% closed** (16 of 16 + 1 bonus C6 also closed). Brand-bible drift B1-B8 → Sprint 13.3 (only remaining audit scope, doc rewrite, ~60 min). Tests **47 → 416** during marathon. Zero broken-prod recoveries (CHECK 8 caught 2 silent type errors before deploy).

## Today's smoke tests verified on prod (2026-05-05)

- Sprint 12.5 OPENING — incognito "hello" → English opener verbatim from OPENING PROTOCOL ✓ (operator screenshot)
- Sprint 11.13 brochure paste — 44,901 char real GujRERA THE GALAXY text → 5-8s extraction, form auto-populated ✓
- Sprint 11.14 RERA paste — same engine via source='rera' ✓
- Sprint 11.17.1 RAG observability — RAG retrieve confirmed live in prod (PART 17 chunks rendering with source/score annotation) ✓
- Sprint 11.X partial-rescue — Sentry tag rescue=partial_unknown available for charting hit rate (telemetry pending real traffic)
- Sprint 11.Y BUG-10 chip — submission_source breadcrumb capturing chip vs manual distribution
- Sprint 11.Y BUG-11 OTP — DB-backed retrieval via existing GET /api/visit-requests (auth-gated) + ProjectCardV2 "View token" affordance

## What just shipped (most recent first)

- `31ae034` — refactor(prompt+checker): Sprint 13.1.G — audit dup cleanup D3-D8. PARTIAL deduped D3+D4+D7+D8 (cross-refs); D5 audit-mark only (CHECK 13+17 intentionally distinct by lifecycle stage). ~490 chars / ~120 tokens saved per request. 416/416 tests. **Audit duplication tier 100%.**
- `07782f4` — refactor(prompt+docs): Sprint 13.1.F — dead rules L1-L7 audit cycle correction. Verify-then-act caught audit overstatement (0 of 7 confirmed dead). 4 marked DORMANT with grep evidence (L3+L4+L5+L6), 2 marked ACTUALLY ALIVE (L1+L2 per detectStage() + capability concern reclassification), L7 numbering-gap doc fix. Audit deliverable made living document with per-rule resolution status. 401/401 tests.
- `e18312b` — fix(prompt): Sprint 13.1.E — audit C6 mera/mere reconciliation. PART 0 Rule E gains EXEMPTION clause pointing to PART 9 Rule 5+6. Reciprocal cross-refs both directions. CHECK 20 comment documents deliberate mera/mere regex exclusion. 394/394. **Audit conflict tier 100%.**
- `b0a80e6` — fix(chat+visits): Sprint 11.Y — BUG-10 chip-click submission_source breadcrumb + isLoading visual disable; BUG-11 OTP token retrieval after back-nav via DB-backed GET /api/visit-requests + project card "View token" affordance. 389/389.
- `8fa1e6e` — fix(chat-api): Sprint 11.X — STREAM_ABORT partial-rescue. When errorKind='unknown' AND streamBuffer non-empty, deliver partial content instead of fallback. PART B observability adds response_length_chars + word_count + msg_count + last_user_preview + was_short_followup to BOTH STREAM_EMPTY + wrapper-stage abort captures. PART C neutral retry-hint copy on all 4 fallback strings. 380/380. **BUG-1 closed.**
- `9f24a58` — refactor(prompt): Sprint 13.1.D — D1+D2+D6 dedup (bullet-ban, visit-holding, max-2-projects). Pre-flight caught 1-of-3 audit overstatements; only true duplicates collapsed to cross-refs. ~90-200 tokens saved per request. 368/368.
- `dfffb15` — fix(prompt): Sprint 13.1.C — audit C4+C5. Word-cap triple-drift reconciled (default 100 / premium 120 / value 80, was 130/160/110). RERA-portal canonical phrasing unified ("RERA portal pe verify karein") across PART 9 Rule 5 + PART 12 Rule 4 + EXAMPLE 16. Bonus catch: EXAMPLE 16 had hidden "de sakta hoon" first-person Hindi, fixed via C5 rewrite. 356/356.
- `dfd7a8e` — fix(prompt+checker): Sprint 13.1.B — audit C3 first-person Hindi enforcement. PART 14 Scripts B/D/E/F + PART 12 line 1134 rewritten to remove "main"/"karunga"/"samajhta hoon". CHECK 20 FIRST_PERSON_HINDI added (audit-only severity, Sentry rule:'FIRST_PERSON_HINDI'). 9 catch-cases + 6 pass-cases. NEW audit finding C6 surfaced (mera/mere conflict) — closed in 13.1.E. 347/347.
- `090f95f` — fix(prompt): Sprint 13.1.A — audit C1+C2. PART 14 Stage 1 table cell English opener (was Hinglish, contradicted Sprint 12.5 OPENING PROTOCOL). EXAMPLE 17 RIGHT shape rewritten as 2-turn flow (turn-1 buyer Hinglish + AI English per OPENING; CARD emission moved to turn-2). 333/333.
- `d17e4e7` — feat(rag): Sprint 11.17.1 — RAG observability + diagnosability. PART A Sentry capture on retrieve errors (was silent .catch). PART B PART 17 chunks now annotated with source + similarity score. PART C empty-state instruction "do NOT fabricate" when RAG returns 0 chunks. Pre-flight surfaced read-path was already wired — sprint re-scoped from "wire" to "diagnosability". 331/331.
- `6f1ffb2` — fix(admin): Sprint 11.14.1 — type-error hotfix for paste-extract handlers. setIfMappable type-narrowing helper + 'builder' → 'builderName' mapping. Vercel deploys 260c8d6 + 5eb4f5d had failed silently. CHECK 8 (npm run build before commit) added to AGENT_DISCIPLINE.
- `5eb4f5d` — feat(extract): Sprint 11.14 — RERA portal text-paste extractor. Reuses /api/extract source='rera'. Deprecates Puppeteer-based /api/rera-fetch (Cloudflare blocks).
- `260c8d6` — feat(extract): Sprint 11.13 — universal /api/extract endpoint. PDF (Cloudinary URL → server-side fetch + base64) OR plain text paste. Admin-gated. claude-sonnet-4-5 model.
- `57d5d4a` — docs(audit): Sprint 13 — AI behavior audit READ-ONLY 591-line deliverable. 5 conflicts + 8 duplications + 7 likely-dead + 8 brand-bible drift. Tonight's audit work closed C+D+L tiers 100% (16 of 16) plus 1 bonus finding C6 also closed.
- `3b30ecc` — feat(observability): Sprint 9.5 — CARD_EMISSION_MISS Sentry telemetry. Pure helper at src/lib/emission-miss-check.ts with 6 tests. Audit-only (no aborts). Establishes baseline for measuring Sprint 11.5 + 11.8 prompt enforcement effectiveness.
- `bfff123` — fix(prompt+ui): Sprint 12.5 — welcome message professional English. PART 2 OPENING MESSAGE PROTOCOL. Mirror buyer's register from message 3+. EXAMPLE 25 added. Chip swaps (#3 + #6). Restyled chips per Mama compact.
- `e22505c` — ops(devops): Sprint 11.10 — manual migration deploy workflow. `.github/workflows/migrate.yml` created as `workflow_dispatch` with `environment=production` + `confirm=DEPLOY` gate (extra friction against accidental clicks). Healthcheck route verified untouched (existing DB liveness probe + 503 degraded path is correct, not an anti-pattern; brief's "REPLACE if touches DB" instruction was written without inspecting the in-tree implementation — agent flagged [NEEDS DECISION], operator chose A2 keep). Lakshya next: add `PROD_DATABASE_URL` + `PROD_DIRECT_URL` to GitHub Secrets, enable pgvector on Neon, trigger workflow to deploy RAG migration `20260421000000_add_rag_embeddings` (on disk since 2026-04-21, never deployed). 304/304.
- `f6c0998` — fix(chat-ui): Sprint 11.9 — mobile z-index conflict + artifact modal scroll lock. `ChatSidebar.tsx:483` z-50 → z-[60] (sidebar overlay was poking through input bar at equal z-index; CSS doc-order tiebreaker put input on top). `ChatCenter.tsx` useEffect at line ~308 locks `document.body.style.overflow` when artifact modal opens on narrow viewports (`window.innerWidth < 1024`); restores `scrollY` on close. Fixes "page zooms a little" perception when comparison artifact opens on narrow Chrome windows. 304/304.
- `3581159` — fix(prompt+ui): Sprint 11.8 — cost-breakdown CARD enforcement + StageACapture skip UX. `system-prompt.ts` PART 16 EXAMPLE 24 added in flag-on/flag-off lockstep, MUST-emit rule for cost_breakdown queries (same emission-drift class as Sprint 11.5 fixed for comparison; canary 2026-05-02 PM showed correct prose breakdown but no CARD → right panel kept showing stale comparison artifact). `StageACapture.tsx`: separate `skipping` state, "Continuing…" button label during skip, inline mono caption "Continuing without saving — your chat stays in this tab only." so opt-out doesn't feel like silent error. 301 → 304.
- `be8c8a9` — fix(chat-api): Sprint 11.6.1 — JSON shape preservation on Zod 400. Sprint 11.6 changed response from `NextResponse.json({error,details})` → plain text — broke `chat-client.tsx:92` `res.json()` in 400 branch (silent throw, buyer never saw Hinglish recovery). Restored JSON shape, kept Sprint 11.6 copy + Sentry. 5-min fix caught at audit not in prod. 301/301.
- `d5cc612` — fix(chat-api): Sprint 11.6 — Zod 400 → Hinglish recovery + Sentry breadcrumb. Buyers were getting raw "Invalid request" on schema validation failures. Now: "Request format mein issue hai — page reload karein…" plus Sentry capture with `field_errors` + `form_errors` + `body_keys` for diagnostics. 301/301.
- `43edb20` — fix(chat-ui): Sprint 11.7 — BC → italic Cormorant gold "H" avatar. `ChatCenter.tsx` lines 166 + 572. Sprint 5 founder-purge missed avatar text. "BC" was internal repo codename pre-dating Homesty rebrand. Cosmetic, 1 file. 301/301.
- `8560cb3` — fix(artifact): Sprint 11.5 — comparison CARD shape regression + right-panel staleness signal. EXAMPLE 23 with `leftProjectId`/`rightProjectId` regression guard. `artifact-staleness.ts` pure helper. PART C (CARD_EMISSION_MISS Sentry) deliberately deferred to Sprint 9.5 to avoid duplicate events. 288 → 301.
- `3d11312` — chore(repo): Sprint 12 — repo cleanup + attribution purge. 3 stale audit `.docx` removed at root. 8 diagnostic docs archived to `docs/diagnostics/archive/`. Removed `Co-Authored-By Claude` trailer guidance from `docs/agents.md` + `.claude/AGENTS.md`. 7 untracked diagnostic scripts consolidated to `scripts/diagnostics/` with README.
- `f32df36` — fix(chat-api): Sprint 11 — stream-abort taxonomy + breadcrumbs. Pure helper extracted to `src/lib/stream-fallback.ts` (51 lines, 16 tests). Fallback taxonomy: leak/markdown → STREAM_ABORT_FALLBACK, timeout → STREAM_TIMEOUT, empty → STREAM_EMPTY, upstream → STREAM_UPSTREAM, unknown → STREAM_ABORT. Added `export const maxDuration = 30`. Tests 272 → 288.
- `pending-sha-3` — fix(ux): Sprint 3 — landing sign-in button removed (sign-in lives on post-engagement surfaces only: chat/dashboard/compare/projects/builders); footer's 4 non-clickable dead-link spans (How it works · About · Privacy · Contact) deleted entirely — they read as broken links to buyers, not deliberate phase-3 deferrals; footer now a single centered LLP line. /privacy returns as a real link when SPRINT-9 (DPDP compliance) ships. StageACapture heading changed from "Save with Homesty AI" → "Stay in touch — save your shortlist", subline merged into one Hinglish value-exchange line ("Aapki shortlist save ho jaayegi. Homesty AI WhatsApp pe price drops aur new options bhejega — kabhi spam nahi."), submit button "Save with Homesty AI" → "Save shortlist". Disambiguates from the project bookmark icon's save action. Tests: 194/194.
- `4936505` — feat(persistence): Sprint 2 — artifact history persists on ChatSession + rehydrates on refresh. New `ChatSession.artifactHistory: Json?` column (migration `20260429220000_add_artifact_history_to_chat_session` deployed to Neon). `/api/chat` parses CARD blocks from the assistant response after stream completes, appends `PersistedArtifact{ type, projectId, projectIdA, projectIdB, builderName, grade, trustScore, emittedAt }` rows to the session. `/api/chat-sessions/[id]` GET returns `artifactHistory[]` in the payload. New pure `lib/artifact-hydrate.ts` joins persisted IDs against current projects/builders arrays — deleted projects silently drop, all 6 artifact types (project_card, comparison, builder_trust, cost_breakdown, visit_booking, visit_prompt) supported. chat-client's keyword-match restore loop deleted (was missing every artifact type except project_card and only on full-projectName prose match). Backwards compatible: old sessions have artifactHistory=null → empty panel, same as pre-Sprint-2. Tests: 194/194 (was 184, +10 — full hydration coverage in `lib/artifact-hydrate.test.ts`).
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

## Bugs surfaced today (captured for tomorrow)

**TIER 1 — BUYER PRODUCT BUGS:**
- `BUG-1` ✓ (Sprint 11.X partial-rescue + observability + tone)
- `BUG-4` ✓ (Sprint 11.17.1 RAG observability)
- `BUG-10` ✓ (Sprint 11.Y chip-click submission_source + isLoading guard)
- `BUG-11` ✓ (Sprint 11.Y DB-backed OTP token retrieval)
- `BUG-2` cost_breakdown CARD missing — parked, need data
- `BUG-3` comparison CARD missing — parked, need data
- `BUG-9` turn-2 Hinglish mirror — retest after Sprint 13.1.A-E deploys propagate (PART 14 cleanup may have resolved structurally)
- `BUG-12` OTP hardcoded — parked till LLP/DLT June 2026
- `BUG-13` Pending animations dashboard/landing — parked, needs Mama visual direction
- `BUG-14` Cursor golden hover lost — parked till UX styling sprint (was queued tonight, deferred per Mama-direction call)

**TIER 2 — ADMIN EXTRACTION (need admin access tomorrow):**
- `BUG-5` PDF extraction broken — need Mama diagnostic
- `BUG-6` RERA shallow (12 fields vs 60+) — Sprint 11.14.2 brief drafted
- `BUG-7` Available units mapped wrong — bundled with BUG-6

**TIER 3-5 — AUDIT (closed tonight):**
- C1-C6 conflicts ✓ ALL CLOSED
- D1-D8 duplications ✓ ALL CLOSED
- L1-L7 dead rules ✓ ALL VERIFIED (0 false removals, audit-marked)

**TIER 6 — BRAND BIBLE DRIFT (parked):**
- `B1-B8` — Sprint 13.3 doc rewrite scope, ~60 min, no code

**TIER 7 — UI/UX (parked):**
- `UX-1` Homepage hero revamp — parked, needs Mama visual direction (UX-1.A drafted with luxury-minimal synthesis from operator's reference packs but not shipped)
- `UX-2` Comparison panel breathing room — parked
- `UX-3` Mobile chat polish edge cases — parked
- `UX-4-11` Admin pages 1-8 UI revamp — parked, needs admin access
- `UX-5` Sidebar icon-rail (Claude-style) — parked separate sprint

**TIER 8 — ADMIN BUILD (all parked, need admin + Mama):**
- Sprint 10 Mama pricing form rebuild
- Sprint Admin-2.1 schema migration (BLOCKS rest)
- Sprint Admin-2.2-7 Project CRM
- Sprint Admin-1.1-5 Dashboard
- Sprint Admin-3.1-5 Buyer CRM
- Sprint Admin-4.x Builder CRM
- Sprint Admin-5.x Follow-Up

**TIER 9 — INFRASTRUCTURE (parked):**
- Sprint DevOps-1: CHECK 8 enforcement in pre-commit, Dependabot, Vercel deploy status GHA — parked tonight (real-time deploy verification needed to test the GHA, do tomorrow with attention)
- Sprint INFRA-1 signals-api — foundation for dashboard, ~90 min
- Sprint INFRA-2 journey-api — foundation for Buyer CRM, ~75 min
- Sprint 13.3 brand-bible drift B1-B8 doc rewrite, ~60 min

## Tomorrow morning queue (admin + Mama present)

**P1 (~30 min) — Mama walkthrough.** Open admin, verify all today's shipped extraction work:
- Sprint 11.13 brochure paste (real Mama brochure)
- Sprint 11.14 RERA paste (real GujRERA project)
- Sprint 11.13.2 PDF flow diagnostic (need Mama to reproduce error)

**P2 (~25 min) — Sprint 11.13.2 PDF fix.** Diagnostic from operator + targeted fix per actual error mode.

**P3 (~30 min) — Sprint 11.14.2 PROMPT_RERA depth expansion.** Brief drafted in tonight's conversation (~30+ additional fields: unit-by-unit booking, carpet ranges per block, construction progress %, quarterly compliance, partner LLP details, architect/engineer regs, premium podium units, booking velocity analysis, risk signal computation).

**P4 (~30 min) — Mama homepage styling decision.** Show operator's Sprint UX-1.A drafted brief (luxury-minimal synthesis from claude-design-skill + awesome-claude-design refs + Lamborghini cathedral-gold pattern). Mama approves OR redirects. Then either ship UX-1.A or re-spec.

**P5 (~75 min) — Sprint 10 Mama pricing form rebuild (Page 2 §5.3).** Cost sheet spec. Best with Mama present for review.

**P6 (~60 min) — Sprint Admin-2.1 schema migration.** Foundation: 10 new columns + price_history table + Prisma migrate. **Blocks everything else in admin tier.**

**P7 (~6 hrs) — Sprint Admin-2.2-7 Project CRM.** Server-side cost calc, All Projects tab redesign, Add Project wizard, Profile view + 6 sub-tabs, Hold/Archive workflows, Staircase data exposure.

**P8+** — Sprint Admin-1.x Dashboard (after signals-api), Sprint Admin-3.x Buyer CRM (after journey-api), Builder CRM, Follow-Up, DevOps-1, brand-bible drift Sprint 13.3, INFRA work.

## Verification state (last `npm run verify` baseline)

- Tests: **416/416** passing (Day 4 marathon close, ratcheted from 162 → 416 across +254 new assertions)
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
