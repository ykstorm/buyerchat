# Product Vision Gaps — Audit 2026-04-21

Read-only audit. Positioning: honest, verified, 1.5% flat, decision-first, hyper-local (South Bopal + Shela).

---

## 1. First-buyer experience

**Current state.** Empty-state headline is *"Find your home."* at `src/components/chat/ChatCenter.tsx:360` with subline "Tell me your budget, timeline, and what matters to you. I'll do the rest." Trust line at `ChatCenter.tsx:407` reads literally: `Homesty earns only when you buy. No builder pays for prom.` — **"prom" is a truncated word ("promotion"/"prominence").** This is the single most visible line on the first screen of the flagship product.

Starter chips (`ChatCenter.tsx:217-224`) are generic: "Best 3BHK options under ₹85L in Shela?", "Honest opinion on Riviera projects", etc. None of the six chips anchor the buyer in the *Homesty differentiator* — no "Show me a project's honest concern", no "What's the ALL-IN price of X?", no "Which builder has the best delivery record?". The landing page's four pillars (Honest Concern / ALL-IN Price / Builder Trust Score / OTP Protection from `src/app/page.tsx:158-163`) do not cross into `/chat`.

**Gap.** A fresh buyer arriving from the landing page sees "Honesty is rare." (`page.tsx:254-258`) and clicks Begin, then lands on `/chat` where the only pillar-carrying line is typo-truncated. The product promise evaporates between two screens.

**Severity.** HIGH (first impression, always fires, broken-copy erodes the very trust being marketed).

**Min fix.** (a) Fix the truncation: `"Homesty earns only when you buy. No builder pays for promotion."` (b) Reshape at least 2 of 6 STARTERS to reference the pillar vocabulary ("Show me a project with an honest concern I should care about", "What's the ALL-IN cost of The Planet?").

---

## 2. Pricing display gap

**Current state.** `ProjectCardV2.tsx:231-306` has the 5-branch fallback. With 11/16 projects at `minPrice=0` but `pricePerSqft` populated, the `hasPps` branch fires first (line 260) and the card renders `₹X,XXX/sqft SBU` with no indicator that this is a partial price (the other 11 projects are not fully costed). Buyers see the same visual treatment for a fully-costed project (The Planet with `allInPrice`) and a partially-costed one (per-sqft only, no total).

There is **no "verified pricing" badge** anywhere in `ProjectCardV2.tsx`. No version/date stamp. The landing page promises "ALL-IN price — one final number, no surprises at registration" (`page.tsx:18`, `page.tsx:160`) but 11/16 cards cannot deliver it.

The homepage `sampleProjects` array (`page.tsx:152-156`) is **hardcoded** — "Riviera Springs ₹6,000/sqft, Riviera Bliss ₹5,800/sqft, Vishwanath Sarathya ₹5,200/sqft" — these are not from the DB. If the operator updates a real price via `/admin/projects/[id]/pricing`, the landing page does not update.

**Gap.** Positioning promises one-number ALL-IN; reality delivers per-sqft fragments with no visual distinction. Homepage numbers are frozen in code.

**Severity.** HIGH (every project card touches this; honesty claim directly implicated).

**Min fix.** (a) Add a subtle "Verified ALL-IN" green pill next to the price only when `allInPrice > 0 && project.pricing != null`; otherwise a muted "Indicative" pill. (b) Replace the hardcoded `sampleProjects` with a 3-row query using `where: { allInPrice: { gt: 0 } }` ordered by `updatedAt desc`.

---

## 3. Trust signals

**Current state.** BuilderTrustCard renders real subscores when `hasSubscores=true` (`BuilderTrustCard.tsx:77-97`). Chat triggers it via `<!--CARD:{"type":"builder_trust",...}-->` per `system-prompt.ts:392` — rule: "when the buyer asks about a builder's track record, trust, delays, complaints, or reliability" (`system-prompt.ts:399`). Trigger condition is therefore reactive-only (buyer must ask first).

Grade + score context is visually present (`BuilderTrustCard.tsx:49-62`) but the **grade letter is never explained**. A 72/100 Grade C shows as a yellow pill with no tooltip, no "what does C mean", no "5 builders are A-grade, 3 are C". `gradeColor()` maps A/B green/blue and C/D amber/red but the buyer has no baseline.

**Commission transparency is zero.** `Grep "1.5%"` returns no hits in any user-facing component. The system prompt forbids discussing commission (`system-prompt.ts:277, 335`). The landing page says "1.5% commission only on close" (`page.tsx:18`) and "Commission only when you close" (`page.tsx:371`) — but once the buyer enters `/chat`, the number disappears entirely. If the buyer directly asks "what do you charge me?" the prompt's PART 8 NEVER LIST blocks the answer — conflicting with the landing-page promise of "disclosed upfront".

**Gap.** Trust card is pull-only, grade is undefined, and the flagship 1.5% number vanishes at the exact moment the buyer is making the decision.

**Severity.** HIGH (core positioning claim unfulfilled in-chat).

**Min fix.** (a) Add a 1-line explainer row under the grade pill in `BuilderTrustCard.tsx` (e.g. "Grade C = acceptable track record with moderate risk" — one line per grade, pulled from `admin-utils.ts`). (b) Add a permanent "1.5% commission, paid on close" footer strip in `ChatCenter.tsx` near line 732 (input bar area) or a one-line affordance in the empty state. (c) Relax `system-prompt.ts` PART 8 so that when the buyer directly asks "how does Homesty make money" the model CAN answer "1.5% of transaction value, paid only after you close" — this is disclosure, not a leak.

---

## 4. Visit booking failure surface

**Current state.** `VisitBooking.tsx:42` — `canSubmit = !!selectedDate && name.trim().length > 0 && phone.trim().length === 10`. The `onChange` handler at line 268 strips non-digits and slices to 10, so a buyer typing "+91 98765..." sees the +91 silently stripped without any explanation. There is **no inline phone validation message**; the button just stays disabled. The helper text at line 282 appears only when a date is picked — a buyer who fills phone first and no date sees no feedback.

401 path works (`VisitBooking.tsx:123-126`) and routes to `status === 'signin'` (line 177) which explains "Your OTP token protects your commission" — good copy. But **nothing explains what happens for a buyer with no Google account**. Auth.js only exposes Google (`CLAUDE.md:22`). A non-Google user clicks "Sign in with Google" at `VisitBooking.tsx:197` and hits an OAuth error page with no recovery.

API at `visit-requests/route.ts:13-14` makes `buyerName` + `buyerPhone` both `.optional()`, but the UI forces them. If the UI ever shipped with them truly optional, the commission evidence (`route.ts:121-122`) defaults to "Anonymous" / "—" — weakening the 1.5% attribution claim.

**Gap.** "Phone not recognized" has no human-facing message. No-Google buyers are stranded. The copy says "Your commission is protected" but offers no alt-path.

**Severity.** MED (affects the conversion surface; Google auth covers most buyers but not all).

**Min fix.** (a) Under the phone input, render a muted hint like "We'll send the OTP to this number" — and when `phone.length > 0 && phone.length !== 10`, swap to a red "Indian mobile number, 10 digits". (b) Below the Google sign-in button in `status==='signin'`, add a subtle "No Google account? WhatsApp +91 XX to book." fallback. (c) Keep buyerName + buyerPhone mandatory in the Zod schema — strip `.optional()` from `route.ts:13-14` since every real booking needs them for commission evidence.

---

## 5. Mobile UX

**Current state.** Chat surface uses `h-dvh` (`ChatCenter.tsx:263`) which handles iOS keyboard. Input bar uses `padding-bottom: max(16px, env(safe-area-inset-bottom))` (line 732) — good. Modal is gated above `bottom: 88px` (line 489) so the input stays reachable — good.

The right panel is `w-[380px] ... hidden lg:block` (`ChatRightPanel.tsx:87`). Tailwind's `lg:` breakpoint is **1024px** — so tablet portrait (iPad Mini 768px, iPad 820px) gets **no** artifact panel and falls back to the mobile overlay. But these devices have enough horizontal room to show a narrower side panel; forcing them into overlay mode means a tablet buyer tapping "Compare" loses the chat context. No `md:` breakpoint exists.

Starter cards are `grid-cols-2 gap-3` (`ChatCenter.tsx:376`) with no `sm:grid-cols-3` — on an iPad landscape 1024px it still renders 2 columns stretched across ~700px, wasting horizontal real estate.

**Gap.** Tablet portrait gets a mobile-only UX despite having a 768px viewport capable of a split layout.

**Severity.** LOW (tablet portrait is a small traffic share, but iPad is common in Ahmedabad family buyer demo).

**Min fix.** Introduce an `md:w-[320px] md:block` variant on ChatRightPanel and trim header pad on tablet; or explicitly confirm tablet should use overlay and add a comment.

---

## 6. Admin workflow

**Current state.** `/admin/projects` list (`src/app/admin/projects/page.tsx:111-170`) shows columns: Project, Builder, Score, ₹/sqft, Price Range, RERA, Grade, Status, Action. The list surfaces a "Score needed" amber pill at line 159-161 when `!project.decisionTag || !project.honestConcern` — but **no "Price needed" pill** despite 11/16 projects missing `minPrice`. The Price Range column shows "Price on request" (line 139) for these, which is the same copy the buyer sees — no visual admin cue that this needs action.

The `/admin/projects/[id]/pricing` page exists (`src/app/admin/projects/[id]/pricing/page.tsx`) but there is no link to it from the list row's "Edit →" (line 162) — the admin has to enter the detail page first, then navigate to pricing. Two clicks minimum, with no visual gate telling them which 11 projects need it.

**Gap.** 11 unpriced projects are indistinguishable from 5 priced ones in the list. The new pricing form has no discovery affordance from the list.

**Severity.** MED (slows down operator data entry, which is the root blocker for Demo + landing-page freshness).

**Min fix.** (a) Add `{project.minPrice === 0 && <span>⚠ Price needed</span>}` next to the "Score needed" pill. (b) Add a second "Pricing →" link next to "Edit →" that deep-links to `/admin/projects/${id}/pricing`.

---

## 7. RAG readiness

**Current state.** `embed-writer.ts:30-44` — `chunkForProject` includes **projectName, builderName, microMarket, configurations, priceRange, possession, amenities, honestConcern, analystNote, priceNote, decisionTag**. Solid; honest concerns and analyst notes are included.

`chunkForBuilder` (line 46-61) includes brand, grade, totalTrustScore, and all 5 subscores — but **not a single narrative field**. No "why this builder got this grade", no "known-for", no signature projects. A retriever matching "which builder is reliable?" can only return numeric strings like "Delivery score: 24, RERA compliance score: 18..." — unhelpful for conversational grounding.

`chunkForProject` also misses: **rera number** (for RERA-verification queries), **bank approvals** (mortgage-intent queries), **unit types / sbaSqftMin-carpetSqftMin** (size-filter queries). These fields are populated in the DB per `src/app/chat/page.tsx:23-31`.

**Gap.** If migration is applied tomorrow, retriever will work for project description/concern queries but return sparse numeric chunks for builder/trust queries.

**Severity.** LOW (RAG is not yet wired into prompt rendering anyway per CLAUDE.md line 127).

**Min fix.** Extend `chunkForBuilder` with any narrative fields in `Builder` model (e.g. `notes`, `foundedYear`, `activeProjectsCount`) and add `reraNumber`, `bankApprovals`, `unitTypes` to `chunkForProject`'s select + template.

---

## 8. Positioning / messaging honesty

**Current state.** "Honest" appears 5 times in user-facing chat UI — all as labels on the *Honest Concern* artifact section (`ProjectCardV2.tsx:335`, `ComparisonCard.tsx:114-119`). It does not appear in the chat empty state or input placeholder.

"1.5%" appears **zero times** in the chat surface (only in the landing page at `page.tsx:18`, `page.tsx:371`). Commission is *forbidden* topic per `system-prompt.ts:277, 335`. The chat is therefore less transparent about commission than the marketing site — opposite of what the positioning claims. An injection-attempt example at `system-prompt.ts:431-432` even treats asking about commission as an attack.

The founder quote on the landing page ("I will tell you the real problem with every project — even if that means you buy nothing from me." — `page.tsx:356`) never appears inside `/chat`. There is no persistent "founder voice" anchor in the product.

**Gap.** Marketing promises transparency; product is defensively opaque about the single number that defines the relationship.

**Severity.** HIGH (core brand claim reversed at the point of conversion).

**Min fix.** Same as §3 fix (c): allow the model to state "1.5% of transaction value, paid on close" when directly asked. Move the rule "NEVER expose commission amounts" to mean specifically "NEVER expose per-builder rate differentials" — keep the headline flat number disclosable.

---

## Ranked top-5 actions

1. **Fix the truncated trust line in /chat empty state.** `ChatCenter.tsx:407` — "No builder pays for prom." → "No builder pays for promotion." The 30-second fix with the highest visibility-per-character ratio in the product. (§1)
2. **Make the 1.5% disclosable in chat.** Loosen `system-prompt.ts` PART 8 so a direct "how do you make money" answer is allowed with the flat rate; add a persistent footer line in `ChatCenter.tsx`. Restores brand-product consistency. (§3, §8)
3. **Drive real pricing to the surface.** Replace hardcoded `sampleProjects` in `src/app/page.tsx:152-156` with a DB query gated on `allInPrice > 0`, and add a "Verified ALL-IN" vs "Indicative" pill in `ProjectCardV2.tsx` price block. Operator sees immediate feedback for the data they just entered. (§2)
4. **Admin "Price needed" pill + deep-link.** `src/app/admin/projects/page.tsx:159` — add a `minPrice===0` chip plus a "Pricing →" link next to "Edit →". Unblocks the 45-min data entry task in the master doc. (§6)
5. **Rework the 6 starter chips to lead with pillars.** `ChatCenter.tsx:217-224` — replace 2-3 generic chips with "What's the ALL-IN cost of [X]?", "Show me a project with a real flaw", "Which builder delivers on time?". Anchors Homesty's differentiator in the first click. (§1)
