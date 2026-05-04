# Agent Discipline Checklist (READ FIRST, EVERY TIME)

Before declaring an agent task complete, you MUST walk through every
section below that applies. If a section applies and you skipped it,
the work is NOT done — verify or report.

This document exists because past agents shipped "working" code that
failed in production due to adjacent config gaps. Each rule below maps
to a real production incident. Do not delete rules even if they seem
obvious.

---

## 1. EXTERNAL DOMAIN CHECK (the CSP rule)

**Triggered when:** Your code makes a network request to a hostname
not already in the codebase.

**Do this:**
- [ ] grep for the new hostname in `next.config.ts`,
      `next.config.mjs`, `next.config.js`, `src/middleware.ts`
- [ ] If a Content-Security-Policy `connect-src` directive exists,
      verify the new hostname is allowlisted. Add it if not.
- [ ] If you add an `<img>` tag to a new domain, check `img-src`.
- [ ] If embedding `<iframe>`, check `frame-src`.
- [ ] If loading scripts from new CDN, check `script-src`.
- [ ] Same check for `media-src`, `font-src`, `style-src` if relevant.

**Past incident:** Cloudinary direct upload shipped without
`api.cloudinary.com` in `connect-src` → browser blocked all PDF
uploads in prod. Console showed:
> "Connecting to api.cloudinary.com violates CSP directive"

**Verification command:**
```bash
grep -rn "connect-src\|Content-Security-Policy" \
  next.config.* src/middleware.* 2>/dev/null
```

---

## 2. ENVIRONMENT VARIABLE CHECK

**Triggered when:** Your code reads `process.env.SOMETHING`.

**Do this:**
- [ ] Is `SOMETHING` already in `.env`, `.env.local`, `.env.example`?
- [ ] If new: add to `.env.example` with placeholder value + comment
      explaining purpose
- [ ] If client-side: must be prefixed `NEXT_PUBLIC_`
- [ ] Add to `docs/ENV.md` (create if missing) with: name, scope
      (server/client), purpose, default, when to change
- [ ] Tell the user explicitly: "Add `SOMETHING=value` to Vercel
      env vars in production, preview, AND development"

**Past incident:** `VERIFY_METHOD` env var introduced for swappable
phone verification. Default 'none' was correct, but if it was missing
from Vercel, the type cast would silently fall back. Required explicit
documentation to prevent late-May DLT swap from breaking.

---

## 3. DATABASE TRANSACTION COMPATIBILITY (the Neon HTTP rule)

**Triggered when:** Your code uses `prisma.$transaction(...)`,
`SET LOCAL`, advisory locks, or session-scoped Postgres features.

**Do this:**
- [ ] Check the Prisma adapter in `src/lib/prisma.ts`. If using Neon's
      HTTP adapter (most common in Vercel deploys), `$transaction`
      with interactive callbacks throws "Transactions are not supported
      in HTTP mode."
- [ ] If you need a transaction: use Prisma's array-form
      `prisma.$transaction([...])` (atomic batch, no callback) OR
      restructure to not need one.
- [ ] If you need `SET LOCAL` (e.g., `ivfflat.probes`): you cannot
      use it with HTTP adapter. Document the workaround.

**Past incident:** RAG retriever wrapped vector query in
`$transaction` to set `ivfflat.probes`. Every retrieval silently
returned empty in prod for hours. Took manual debug + log inspection
to find.

**Verification:**
```bash
grep -n "\\\$transaction" src/lib/your-new-file.ts
```

---

## 4. DUPLICATE-SURFACE CHECK (the pricing form rule)

**Triggered when:** You modify a form, page, or UI surface that the
operator/user interacts with.

**Do this:**
- [ ] grep the codebase for OTHER files containing similar field
      names. Example: if editing `PricingStep3Form.tsx` with
      `basicRate`, also grep `basicRate|BASE PRICE` across
      `src/app/admin/` and `src/components/admin/`.
- [ ] If you find another file with overlapping fields → STOP.
      Report to user: "There appear to be N pricing surfaces — should
      I sync changes to all, or consolidate to one?"
- [ ] DO NOT silently update only the surface you were pointed at.
      Operators land on different paths and will see stale UI.

**Past incident:** BHK Configurations table added to
`PricingStep3Form.tsx` only. `/admin/projects/new` had its own inline
pricing form, `/admin/projects/[id]` had inline pricing fields plus an
"Open pricing editor →" link. Operator never saw the new BHK table
because the link path she took bypassed the modified component.

**Verification:**
```bash
grep -rn "<distinctive-field-name>" src/app/admin src/components/admin
```

---

## 5. CLIENT/SERVER COMPONENT BOUNDARY (the projectId rule)

**Triggered when:** You write `useParams()`, `useRouter()`,
`'use client'`, or pass props from a `[id]` route to a child component.

**Do this:**
- [ ] If a route has `[id]` segment: extract id in the SERVER component
      (`page.tsx`) via `await params` and pass as a typed prop to
      client children. Do NOT rely on `useParams()` in deeply nested
      client components.
- [ ] If your client component fetches `/api/.../${id}/...`: add a
      runtime guard `if (!id) { console.error(...); return }` AND
      a TypeScript-level non-null prop type.

**Past incident:** `PricingStep3Form` read `useParams().id` from a
nested client component. On `/admin/projects/new` (no `[id]` segment),
id was undefined, fetches went to `/api/admin/projects/undefined` →
404 every save attempt.

---

## 6. STREAMING / TIMEOUT BOUNDARIES (the 600ms rule)

**Triggered when:** Your code uses `Promise.race` with `setTimeout`,
streaming responses, or any time budget against external APIs.

**Do this:**
- [ ] If timing out a Promise: ensure the timeout is LONGER than the
      sum of all sequential awaits inside, including cold-start latency
      (cold OpenAI ~2-3s, cold Neon vector ~1-9s, Anthropic streaming
      first token ~500ms-2s).
- [ ] Test the cold path explicitly. Warm latency is misleading.
- [ ] Distinguish "I want to abort the slow query" (use AbortSignal)
      from "I want to give up if no result yet" (use Promise.race).

**Past incident:** RAG retriever had outer 600ms `Promise.race` that
fired BEFORE the OpenAI embedding call (~2.1s cold) ever completed.
Every retrieval returned empty. Was masked by silent fallback.

---

## 7. SCHEMA WRITE PROVENANCE (the Insider Note rule)

**Triggered when:** Your code writes to a buyer-facing or
operator-trust field (`Project.analystNote`, `Project.honestConcern`,
`Builder.trustScore`, RERA fields, pricing fields).

**Do this:**
- [ ] Never write to these fields from an AI-generated response
      pipeline.
- [ ] If you must: route through `src/lib/project-content-source.ts`
      and force `source = 'operator' | 'imported'` only. AI-generated
      writes must be blocked + Sentry-warned.
- [ ] If adding a new buyer-trust field: add `<field>Source`,
      `<field>Author`, `<field>VerifiedAt` columns with backfill
      'unknown' default.

**Past incident:** Vishwanath Sarathya's Insider Note contained
"ET Industry Leader 2023" + "34 years Gujarat experience". Source
unknown — possibly AI-generated and persisted via an unaudited write
path. Trust risk: appears authoritative, may be fabricated.

---

## 8. RESPONSE-CHECKER COVERAGE

**Triggered when:** You add a new fabrication category, banned phrase,
or content rule to the AI's PART 8.5 of system-prompt.

**Do this:**
- [ ] Every PART 8.5 rule must have a corresponding regex check in
      `src/lib/response-checker.ts`.
- [ ] Every check needs at least 3 unit tests: one positive
      (violation triggers), one negative (similar but legal text
      doesn't fire), one edge case.
- [ ] Wire into the `onFinish` audit dispatch loop, NOT the `onChunk`
      stream path (audit only — never block tokens).
- [ ] Tag with rule name in Sentry capture for traceability.

---

## 9. LINT/BUILD/TEST GATES BEFORE COMMIT

Before declaring a commit ready, in order:

- [ ] `npm run build` — must pass clean. /chat bundle should not jump
      more than 5 kB without explicit reason.
- [ ] `npm test` — all tests pass. Test count never decreases.
- [ ] `npm run lint` — no NEW errors in files you touched.
      Pre-existing errors in untouched files are out of scope.
- [ ] `git status` — only committed files are ones you intended.
- [ ] Throwaway debug scripts (`scripts/_*.ts`, `scripts/debug-*.ts`)
      MUST be deleted before commit.
- [ ] Migrations must be applied to Neon if they exist
      (`npx prisma migrate deploy`) — uncommitted schema drift is a
      production hazard.

---

## 10. REPORT-BACK FORMAT

After every agent run, the report must include:

- Commit SHA(s)
- Files changed (counts and names)
- Test count before / after
- Bundle size before / after for any user-facing route touched
- Any deferred work or known-but-unfixed issues
- Any external services added (with proof of CSP / env /
  documentation updates)
- Any schema migrations created (with proof of `migrate deploy`)

If any item above was skipped, the report MUST say so explicitly.
Silent skipping is the cause of every production incident this
document was created to prevent.

---

## 11. SUB-AGENT DELEGATION RULES

When firing parallel sub-agents (Task / Agent tool):

- [ ] Verify worker tools (Write, Edit, Bash) are in
      `.claude/settings.json` `permissions.allow` BEFORE firing — if
      they aren't, the sub-agent returns "blocked" and the run is
      wasted. The allowlist on this repo covers npm/git/prisma/grep
      and friends; extend it (commit the diff) if a new agent needs a
      tool.
- [ ] Cap research-agent severity claims at **P2** unless the agent
      cites file:line + a working exploit/repro path. Past sub-agents
      have flagged false-positive P0/P1s ("`.env` committed",
      "`$queryRawUnsafe` SQL injection") that did not survive
      fact-check. Trust but verify.
- [ ] The synthesizing agent (or operator) MUST fact-check every
      P0/P1 claim before propagating it to fix lists or commit
      messages.
- [ ] Never let research-agents commit. They audit and return
      findings; the main thread (or a dedicated code-agent with a
      tight prompt) commits.
- [ ] Self-contained prompts only. Sub-agents do not see the
      conversation that spawned them — every prompt must restate
      goal, constraints, file paths, and report format from scratch.

## 12. CI GATES

The pre-commit hook (`.husky/pre-commit`) and GitHub Actions
(`.github/workflows/ci.yml`) together enforce:

- Schema drift refused at commit time — if `prisma/schema.prisma`
  is staged but no `prisma/migrations/...` is staged alongside, the
  commit is blocked.
- `prisma format` + `prisma validate` must pass locally and in CI.
- `npm run lint` + `npm run build` + `npm test` must all pass on
  every PR and every push to `main`.
- CI fails if `prisma format` would produce a diff against the
  committed schema (catches "I edited schema by hand and forgot to
  run format").

Bypass with `git commit --no-verify` only for genuine emergencies
(broken hook, locked-out CI). NEVER bypass on a schema-drift error
— that's the exact class of bug the guard was added to prevent.
The CI workflow has no bypass; if it's red, fix it or revert.

---

## 13. SESSION HANDOFF PROTOCOL

At the start of every session, read `docs/SESSION_HANDOFF.md` before
anything else. At the end of every session (or after every committed
sprint), update it. Treat it as the source of truth between sessions.

The operator should never have to re-explain context that's already
in the file. If they're asking "what's next?" — answer from the file.

The handoff doc has these sections (keep them current):
- Last updated (timestamp)
- What just shipped (commit SHAs, most-recent first)
- What's in flight
- What's queued (priority order)
- Open decisions (operator pending)
- Known issues / workarounds
- Verification state (last `npm run verify` baseline)
- Mama's last test session
- Latest production deployment

## 14. REPORT VERDICT FORMAT

Every agent report MUST start with one of:

```
[OK]              — work complete, all checks passed
[PARTIAL]         — work shipped but with caveats (list them)
[BLOCKED]         — work could not complete, reason + needed input
[NEEDS DECISION]  — encountered choice operator must make
```

Followed by 3-line summary maximum:
- Line 1: What shipped (commit SHA)
- Line 2: What broke or needs attention (or "Nothing")
- Line 3: Next recommended action

Detail (file:line, full diff stat, etc.) goes in
`docs/diagnostics/<sprint-name>.md`, NOT in the chat report.

Reports >100 lines without this format are rejected — re-format.

## 15. AUTONOMOUS DECISION RULES

When the prompt presents 2-3 options and asks operator to choose:

If your confidence in the default option is **≥ 80%**:
- Proceed with the default.
- Document the decision in the commit body.
- Flag for review in `SESSION_HANDOFF.md` "Open decisions" — decision
  was made, operator may revert if disagreed.

If confidence **< 80%**:
- State `[NEEDS DECISION]` in report.
- Present options with pros/cons.
- Wait for operator input.

Default for "should I run this destructive operation":
- **Always escalate.** Never autonomous on destructive (DROP TABLE,
  rm -rf, force-push, history-rewrite, `--no-verify` on schema-drift,
  package-lock deletion, branch deletion).

## 16. RETROSPECTIVE COMMIT (multi-day sprints only)

After every multi-day sprint (≥3 commits across ≥2 sessions), the
final commit is a 2-paragraph retrospective in
`docs/retros/<sprint-name>.md`. Two sections:

- **What worked / what surprised**
- **What to do differently next time**

Lessons compound. After 5 retros, you have a pattern library. After
20, you have a playbook nobody else has. Skip retro for single-commit
or single-session sprints — they're not worth the overhead.

---

## 17. PRE-FLIGHT CHECK ENHANCEMENTS

The standard pre-flight CHECK 1-9 the operator runs before firing
any sprint. Three enhancements added 2026-05-04 from incidents on
2026-05-02:

### CHECK 1 — Parallel-shell scan

Before any sprint fires, immediately after `git status`, run:

```bash
git fetch origin && git log --oneline origin/main..HEAD
```

If output is non-empty, surface to operator. A parallel shell may
have shipped commits the current shell doesn't know about. Don't
proceed until the operator confirms awareness of those commits.

**Past incident:** Sprint 11.5 was caught having shipped from a
parallel shell mid-session 2026-05-02. Without this check, we
re-fired the same work. Caught by agent discipline, but 5 min of
wasted pre-flight.

### CHECK 6 — Client-side error-handling shape audit

When changing an API response shape, audit downstream client
consumers BEFORE committing:

```bash
grep -rn "<route_path>\|res\.json()\|res\.text()" \
  src/app src/components 2>/dev/null
```

For every consumer: verify the new response shape matches what the
consumer expects (`.json()` vs `.text()` vs streaming).

**Past incident:** Sprint 11.6 changed Zod 400 from JSON to plain
text. `chat-client.tsx:92` still called `res.json()`, threw
silently, buyer never saw Hinglish recovery. Sprint 11.6.1 follow-up
needed within hours. Audit at change-time would've caught it.

### CHECK 9 (NEW) — Push verification

After a successful commit + pre-commit hook pass, confirm push to
remote BEFORE declaring sprint shipped:

```bash
git push origin main 2>&1 | tail -5
git fetch origin && git log --oneline origin/main..HEAD
```

Expect empty output (local fully synced to remote). Sprint report
MUST include push trail, e.g.:

```
Push trail: 8560cb3..be8c8a9 main -> main
```

**Past incident:** Sprint 11.6 + 11.6.1 + 11.7 sat local-only for
hours on 2026-05-02. Operator believed they were in prod when they
weren't. "Commit landed" ≠ "deployed." Distinct verifications,
both required before report.

---

## ESCAPE HATCH

If a task is too small to warrant the full checklist (e.g., typo fix,
single-line copy edit), state that explicitly in your report:
"Skipped checklist sections 1-7, applies only to ≥1-line code
changes touching network/data/UI." Items 8, 9, 10, 11 (if any
sub-agent was used), 12, 13, 14 still apply. §15 applies if any
choice was made. §16 applies only on multi-day sprints.
