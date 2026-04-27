# Current Sprint Handoff

> Source of truth between Claude Code sessions. Read at start, update
> at end. Do not let the operator re-explain context that lives here.

## Last updated

2026-04-27 16:39 IST — P2-CRITICAL-8: 6 live prod bugs (NO_MARKDOWN, FAKE_VISIT, timeouts, amenity FP, Book Visit, floating widget)

## What just shipped (most recent first)

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

0. **Re-test on prod after auto-deploy of `675ea2d`** — verify in Sentry that NO_MARKDOWN drops, OTP_FABRICATION drops, result.onError drops (timeout fallback now graceful), and HALLUCINATION false-positives on real amenity names disappear.
1. **P2-CLEANUP-AUDIT (read-only sprint)** — operator asked for: (a) dead workflow + dead-API-route audit, (b) account-deletion / buyer-data-purge feature spec, (c) animation pass on dashboard, (d) project detail page UI consistency review (operator says "first one still old"). Output: docs/diagnostics/cleanup-audit-apr27.md. Read-only, no code changes — produces the actionable backlog for a follow-up sprint.
2. **P2-WAVE2-A1** — Stage B Hard Capture (single agent, foreground, 1-2 hr). Spec in operator-provided prompt; Option 1 (phone-only, no verify) decision is locked. `VERIFY_METHOD=none` default.
2. **P2-WAVE2-A2** — In-chat visit booking 4-step flow (sequential after A1, ~1 day).
3. **P2-WAVE2-A3** — Stage-aware follow-up buttons (sequential after A2, 4 hr).
4. **P2-WAVE2-B** — parallel: lead scoring + junk mark, A1b/A1c pricing UI strip, navbar/floating-button cleanup.
5. **P2-WAVE2-C** — parallel: `withSentry` route wrapper, Playwright e2e.
6. **INFRA-2** — Dockerize (compose for local dev, multi-stage prod, GHCR push, dependabot).
7. **P2-DEMO** — `/showcase` cinematic marketing surface (Linear/Vercel/Apple-style motion). LAST. Record demo video against this route, not the real `/chat`.

## Open decisions (operator pending)

- **None blocking.** META-2 was a pure-infra sprint with no decisions.

## Known issues / workarounds

- `/chat` First Load JS is 300 kB (target 280 kB). Workaround: noted in `docs/MASTER_FIX_LIST.md` Block C5 — finish LazyMotion + lazy ReactMarkdown will close the gap. Not blocking demo.
- Schema-format-only commits hit the pre-commit migration check. Workaround: `git commit --no-verify` once with documented reason; future schema changes go through the hook normally. The bootstrap commit `853a145` is the documented precedent.
- `gh` CLI not installed locally — operator verifies CI runs at <https://github.com/ykstorm/buyerchat/actions> manually.

## Verification state (last `npm run verify` baseline)

- Tests: **159/159** passing (+3 HALLUCINATION amenity-allowlist invariants from P2-CRITICAL-8 Bug #4)
- Build: **clean**, /chat 300 kB, / 268 kB shared
- Lint: clean on touched files (pre-existing warnings on untouched files OK per discipline §9)
- Schema: `prisma validate` passes
- Sentry: 5 issues open — JS-NEXTJS-K/E/J pending operator-resolution (closed by recent commits per `docs/diagnostics/sentry-resolution-log-2026-04-26.md`); JS-NEXTJS-B (NO_MARKDOWN) and JS-NEXTJS-9 (RERA timeout) intentionally audit-only

## Mama's last test session

- Pricing entry workflow not yet retested by Mama post-lockdown commit `129d220`.
- 3 unverified `analystNote` rows still pending review per `docs/diagnostics/insider-note-mama-review.md` (Riviera Bliss, Shaligram Pride, Vishwanath Sarathya West).

## Latest production deployment

- **dpl_2rFv9mjmt3QqmZQtSHCJxepCFAoa** at `https://buyerchat-gmqjtj78j-ykstorms-projects.vercel.app`, aliased to `homesty.ai` + `www.homesty.ai`. Built from commit `d4d43d1`. Status: ● Ready (manually deployed via `npx vercel deploy --prod`).
- **Root cause of 7 missed auto-deploys identified and fixed:** `vercel.json` cron expression was every-15-min, which Hobby plan rejects. Vercel was failing the deploy at the validation step before reaching the build phase, so no logs surfaced unless you explicitly ran `vercel deploy`. The webhook itself was never broken.
- **Future pushes should auto-deploy normally** since `vercel.json` is now schema-valid and the cron is daily-frequency. If a future push doesn't deploy within ~3 min, run `npx vercel ls` to inspect.
- **When upgrading to Vercel Pro:** revert the cron in `vercel.json` and the docblock in `src/app/api/cron/visit-followups/route.ts:1-22` back to every-15-min for tighter T-24/T-3/T-1 followup precision. Comment in the route file documents this.
