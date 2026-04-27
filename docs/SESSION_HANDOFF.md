# Current Sprint Handoff

> Source of truth between Claude Code sessions. Read at start, update
> at end. Do not let the operator re-explain context that lives here.

## Last updated

2026-04-27 14:49 IST — P2-PROMPT-NUCLEAR: PART 0 absolute rules + reorder PART 16 + parking defuse + 3 invariant tests

## What just shipped (most recent first)

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

0. **Bug 7 (deferred)** — Dashboard already wires saved projects + visit requests from DB; the "How it works / Contact dead links" reported in smoke test live on the **landing page** (`src/app/page.tsx`), not dashboard. If those landing-page links are dead, that's a separate (smaller) sweep.
1. **Re-test Bug 1 in production** — Mama smoke test on homesty.ai/chat: book a visit (give name + 10-digit phone). Expect the holding message verbatim, NO "OTP bheja hai", NO loop. If model still fabricates OTP, the fix didn't take and we need stream-level abort.
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

- Tests: **156/156** passing (+3 PART 0 / few-shot ordering / parking-defuse invariants from P2-PROMPT-NUCLEAR)
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
