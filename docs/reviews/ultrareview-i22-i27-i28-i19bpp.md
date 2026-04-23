# ULTRAREVIEW — I22-DUP / I19b++ / I27 / I28

**Auditor:** read-only Opus 4.7 | **Date:** 2026-04-23 | **Scope:** working-tree diff vs HEAD (`22bb892`)

## 1. Verdict: **GREEN LIGHT**

All four sprints pass security, regression, correctness, style, and perf dimensions. Two WARNs, no FAILs.

## 2. Per-sprint summary

- **I22-DUP — PASS.** Two comment-only edits (`ChatSidebar.tsx:406, 415`) codify that both sidebar sign-in surfaces gate on `userId`; independent grep confirms all three chat-surface sign-in renders (`ChatCenter.tsx:656/679`, `ChatSidebar.tsx:407/416`) use `userId`. No functional change needed — claim verified.
- **I19b++ — PASS.** EX6 rewritten to Hinglish (still emits `visit_prompt` CARD at `system-prompt.ts:458`); EX7 lightly reworded; EX10 added at `system-prompt.ts:478-482` with exactly one `visit_prompt` CARD and 34 assistant-word count (well under the 100-word cap).
- **I27 — PASS.** `MISSING_CTA` narrowed with PART 5 gating: `ctaIntents` whitelist + `projectAnchorCard` OR buyer `visitSignal`. 6 new test cases in `response-checker.test.ts:218-298` cover all documented branches. Full suite: **76/76 green**.
- **I28 — PASS.** Diagnostic at `docs/diagnostics/i28-on-error.md` (18578 bytes). Verdict line 18: "SILENCE (known-abort noise; minimum-diff guard). Confidence HIGH." Recommendation §5a/5b present. No open action items left unresolved; doc-only.

## 3. FAIL items

None.

## 4. WARN items (non-blocking)

- **WARN-1 — Intent coverage trade-off.** `ctaIntents` in `response-checker.ts:197-201` only includes `comparison_query`, `visit_query`, `builder_query`. A response to `budget_query` / `investment_query` / `general_query` that anchors on a specific project CARD will never flag — by design per PART 5, but worth a follow-up rule to catch genuine CTA misses outside these three intents (e.g. investment_query with project_card). Recommend: track in rule-drift-matrix.md as intentional narrowing.
- **WARN-2 — Duplicate I22-DUP comment.** The same comment string "must gate on userId (canonical auth signal) to match ChatCenter + sidebar footer." appears at `ChatSidebar.tsx:406` AND `:415`. Line 406 guards the sidebar history prompt; line 415 guards the footer auth surface — they are different surfaces, so a shared comment is slightly misleading. Recommend a one-line disambiguation on the 406 copy. Not a correctness issue.

## 5. PART 8.5 check

**CONFIRMED: no edit touched PART 8.5.** Diff for `system-prompt.ts` only hits lines 454-456 (EX6), 462 (EX7), and 477-482 (EX10 addition). PART 8.5 lives at lines 302-336 — unchanged. Anti-fabrication hard locks (visit claims require `visit_prompt` CARD, builder-name lock, RERA lock, PII lock) are intact.

## 6. Placeholder check

**CONFIRMED: no `<placeholder>` or `<.*-id>` strings in `system-prompt.ts`.** Grep for `<[a-z-]+-id>|<placeholder|<project-id>` returns zero matches. EX10's `visit_prompt` card uses `projectId:"cmn0jn3kp0000zwfy4r5mf5s1"` — verified as The Planet's real cuid in CLAUDE_CODE_MASTER_v2.md (line 146, and cross-referenced in other examples at lines 442, 458, 464, 470). No invented IDs.

## 7. Environment check

- **`npm run build`: PASS.** `/chat` = **298 kB** First Load JS (under 300 kB target). No build errors, no type errors.
- **`npm test -- --run`: PASS.** 5 files, **76 passed / 76 total** (was 70 pre-I27; +6 MISSING_CTA tests land green). Runtime 2.09s.
- **`npx playwright test --list`: not executable under current Bash perms.** Manual count from `tests/e2e/` glob: **13 test cases across 7 spec files** (a11y:3, leak-protection:2, admin-pricing-save:1, chat-card-emission:2, artifact-fallback:1, oauth-draft-preservation:2, sign-in-surfaces:2). Sign-in-surfaces logged-in case correctly `test.skip`s when `E2E_SKIP !== 'false'` — matches the "skip gracefully" requirement.

## 8. Other spot-checks

- **ReDoS risk on I27 regexes:** none. `/<!--CARD:\{[^}]*"type":"..."/` uses bounded negated class — no nested quantifiers. `visitSignal` alternation is simple fixed strings. Input is model-generated `aiResponse` (500-token cap) and 800-char `buyerMessage`; both sanitized upstream.
- **No new `console.log` / `console.warn`** in production paths (diff only adds console-free code).
- **No new `any`, no new `throw new Error` in `onChunk`/`onFinish`.** The NO_MARKDOWN hotfix (commit `7a1b12c`) regression pattern cannot be re-triggered by this batch.
- **Security: no new API routes, no new SSR sensitive-field exposure, no auth-bypass vectors.** Sign-in conditional changes are comment-only.
- **EX6 rewrite still emits `visit_prompt` CARD** at `system-prompt.ts:458` — verified inline.

## 9. Green-light statement

This batch is safe to commit and push to `origin/main`. Build green, tests green, bundle under budget, anti-fabrication locks intact, no new secrets or auth surface, regex paths bounded. Proceed.
