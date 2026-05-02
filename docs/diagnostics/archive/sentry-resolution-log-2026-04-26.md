# Sentry Resolution Log — 2026-04-26 (P2P-3)

This log lists Sentry issues whose root causes have been fixed by recent
commits, and which the operator should mark as **Resolved** in the
Sentry web UI: <https://buyerchat.sentry.io/issues>.

This file is the source of truth for "why these are safe to close" so
the operator does not have to re-derive the reasoning from commit
history.

---

## Issues to mark RESOLVED

### 1. JS-NEXTJS-K — `HALLUCINATION` "Auda Garden" (project that doesn't exist)

- **Root cause**: AI invented a project name when grounding context
  was missing for amenity-style queries.
- **Closed by**: commit `ef03a3d`
  *(feat(rag): ground amenity responses in verified LocationData + PART
  8.5 rule #8)*
- **Why safe to close**: amenity queries now run through the RAG
  retriever (or curated `LocationData`), and PART 8.5 rule #8 of the
  v3 system prompt blocks the model from naming projects not in the
  retrieved/structured context. Post-stream `response-checker.ts`
  audit-logs any drift.
- **What to watch**: if the same Sentry tag fires again, the regression
  is in the RAG retriever empty-fallback, not in the prompt — escalate
  to fleet, not patch.

### 2. JS-NEXTJS-E — `MISSING_CTA` (visit-trigger turn missing visit CTA)

- **Root cause**: model occasionally skipped the visit CTA on
  `visit_trigger` intent, so buyers never saw a booking option.
- **Closed by**: commit `24a6c06`
  *(fix(prompt): tighten PART 9 visit CTA + Examples 14/15 — Sentry
  JS-NEXTJS-E)*
- **Why safe to close**: PART 9 rule + two new few-shot examples
  reinforce the CTA injection. `response-checker.ts` post-audit
  flags any future regression.

### 3. JS-NEXTJS-J — `FABRICATED_STAT` "since 1971" / builder year claims

- **Root cause**: model invented founding-year and "X years experience"
  claims for builders where those facts were not in `BuilderAIContext`.
- **Closed by**: chain of commits
  - `4210cf6` *(feat(checker): FABRICATED_STAT + PART 8.5 rule #6 — builder stat invention guard)*
  - `6b24f91` *(fix(prompt): tighten PART 8.5 rule #6 — no general-knowledge stats)*
  - `f8ce4df` *(feat(content): traceable analystNote/honestConcern source tracking + fabrication audit doc + write-path lockdown)*
- **Why safe to close**: PART 8.5 rule #6 explicitly bans general-
  knowledge year/stat claims; checker regex catches "since YYYY",
  "X years", "X+ projects", "X+ units"; insider-note write path is
  source-tagged and AI writes are blocked.

---

## Leave OPEN (intentionally audit-only)

### JS-NEXTJS-B — `NO_MARKDOWN` bullet markdown leaking into chat

- **Status**: open by design — `response-checker.ts` runs post-stream
  and is audit-only (per CLAUDE.md "Known Open Issues"). Buyer already
  saw the markdown by the time we logged it. We accept that, because
  blocking on stream chunks would degrade latency and the markdown
  visual cost is low.
- **Future fix**: move the check pre-stream or to `onChunk` as part of
  the broader checker-coverage sprint — not a hotfix.

### JS-NEXTJS-9 — RERA fetch timeout

- **Status**: open until infra fix. Graceful fallback (commit `c965f61`
  *(fix(admin): wire projectId prop + Cloudinary direct PDF upload +
  RERA graceful fallback)*) keeps the admin UI usable when the upstream
  RERA portal is slow. Sentry continues to log so we have visibility
  into outage frequency, but the operator-facing experience is no
  longer broken.
- **Future fix**: cache last-good RERA response with a TTL, or move
  the call to a background queue.

---

## Operator action

For the three "RESOLVED" issues above, in <https://buyerchat.sentry.io/issues>:

1. Open the issue.
2. Click **Resolve** → choose "in the next release" or "in current
   commit".
3. Paste a one-line note: "Closed by <commit SHA>; see
   `docs/diagnostics/sentry-resolution-log-2026-04-26.md`".

If a closed issue fires again within the next 14 days, Sentry will
auto-reopen and tag it as a regression — that is the signal that the
fix did not stick and we need a follow-up sprint.
