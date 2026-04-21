# Rule Drift Matrix — system-prompt.ts vs response-checker.ts

Audit of every explicit rule stated in `src/lib/system-prompt.ts` against the enforcement surface of `src/lib/response-checker.ts`, to surface model-drift gaps between what the prompt promises and what we actually verify.

## Summary

- **Total rules audited:** 23
- **Enforced (checker exists):** 6
- **Audit-only (post-stream, buyer already saw the tokens):** 6
- **Missing (no checker at all):** 17

### HIGH-risk MISSING rules (buyer-visible trust/compliance damage)

- **Never say "I recommend X"** (PART 8) — tone violation that breaks conditional-recommendation guardrail.
- **Never rank 1st / 2nd / 3rd** (PART 7 RULE 3) — changes the product from "decision engine" to "listing portal".
- **2-project hard limit per response** (Format Rule 1 + PART 8) — violating this dumps the brochure; one of the most-cited SOP invariants.
- **100-word cap per response** (Format Rule 2) — directly contradicts the "give advice, don't lecture" core promise.
- **No markdown bold / headers / bullets** (Format Rule 5, 8 + PART 8) — turns conversational prose into a brochure; trivially regex-checkable.
- **Language mismatch** (PART 1, PART 10) — English reply to a Hinglish buyer (or vice-versa) is a hard trust break; no detector today.
- **No numeric ranking / "best project"** (PART 8) — same risk tier as conditional-recommendation rule.
- **Min 30 words prose before CARD block** (PART 15 Rule 6) — shipping a CARD-only response renders blank commentary in the UI.
- **Never start response with project name** (PART 8) — small, but systematically violated without a checker.

### Recommended actions (Sprint I9-followup)

1. Promote CHECK 3 (`CONTACT_LEAK`) and CHECK 3b (`BUSINESS_LEAK`) from post-stream to **pre-stream or `onChunk`** — they are the only two flagged CRITICAL but currently leak the tokens before firing.
2. Add **regex-cheap pre-stream checks** for: markdown bold/headers, bullet characters, word-count cap, "I recommend", "best project", 1st/2nd/3rd ordinals.
3. Add **language-match detector** — compare Hindi-word density of last buyer message vs. response; flag mismatch.
4. Add **CARD discipline checks** — count CARD blocks (≤2), enforce min 30 words of prose outside `<!--CARD:...-->`, verify `projectId` ∈ known IDs.
5. Remove or repurpose the unused `intent` parameter on `checkResponse` — it is threaded from `/api/chat` but never read.

## Matrix

| Rule | System Prompt Part | Checker Exists? | Enforcement Type | Risk Level |
|---|---|---|---|---|
| Language match (English / Hinglish / Hindi) | PART 1, PART 10 | No | ❌ | HIGH |
| Never ask >3 qualifying questions before value | PART 2 | No | ❌ | LOW |
| Qualification urgency (ask budget+config after 3+ msgs) | PART 2 | No | ❌ | MEDIUM |
| 2-project hard limit per response | Format Rule 1, PART 8 | No | ❌ | HIGH |
| 100-word cap per response | Format Rule 2 | No | ❌ | HIGH |
| No bullet points / numbered lists | Format Rule 8, PART 8 | No | ❌ | HIGH |
| End with exactly ONE question OR ONE next step | Format Rule 4 | No | ❌ | LOW |
| No markdown bold (`**`) or headers (`##`) | Format Rule 5, PART 8 | No | ❌ | HIGH |
| 6-layer disclosure — one layer per exchange | PART 3 | No | ❌ | MEDIUM |
| Never lead with scores (life translation first) | PART 4 | No | ❌ | MEDIUM |
| Never push visit (require 4 preconditions) | PART 5 | Partial (inverse) | ✓ audit-only (MISSING_CTA fires the opposite way) | MEDIUM |
| Decision Card — field per line, no `**` | PART 6 | No | ❌ | MEDIUM |
| Hallucination — no projects outside PROJECT_JSON | PART 7 RULE 1, 7 | Yes | ✓ audit-only | MEDIUM |
| No 1st / 2nd / 3rd ranking | PART 7 RULE 3 | No | ❌ | HIGH |
| Never reveal contactPhone / contactEmail | PART 8 | Yes (regex) | ✓ audit-only (CRITICAL comment says blocking needed) | HIGH |
| Never reveal commissionRatePct / partnerStatus | PART 8 | Yes (keyword) | ✓ audit-only | HIGH |
| Never say "I recommend X" (use "stronger fit") | PART 8 | No | ❌ | HIGH |
| Never say "compromise" (use "trade-off") | PART 8 | No | ❌ | LOW |
| No investment guarantees / assured returns | PART 8 | Yes (keyword list) | ✓ audit-only | HIGH |
| Never say "I cannot" / "As an AI" | PART 8 | No | ❌ | MEDIUM |
| Never start response with project name | PART 8 | No | ❌ | MEDIUM |
| No out-of-area projects (Satellite, Prahlad Nagar…) | PART 8 implicit | Yes | ✓ audit-only | MEDIUM |
| CARD block — min 30 words prose, max 2 CARDs, valid projectId | PART 15 | No | ❌ | HIGH |

Legend — ❌ missing · ✓ audit-only (post-stream) · ✓ onChunk (streaming) · ✓ pre-stream (blocks before send).

## Next step

Sprint **I9-followup** should (a) promote the four CRITICAL audit-only checks (`CONTACT_LEAK`, `BUSINESS_LEAK`, `INVESTMENT_GUARANTEE`, `HALLUCINATION`) from post-stream into `onChunk` or pre-stream so violating tokens never reach the buyer, and (b) add the 9 HIGH-risk MISSING checks listed above — most are cheap regex or word-count checks that can run pre-stream with negligible latency. The `intent` parameter threaded into `checkResponse` but never read should be either wired into per-intent rule selection or dropped.
