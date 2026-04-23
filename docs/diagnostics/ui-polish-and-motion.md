# UI Polish + Motion Pass — homesty.ai

Read-only audit, 2026-04-21. Scope: NEW polish gaps only — 3D tilt / scroll throttle / `prom` typo / theme FOUC / `FAFAF8` hardcodes / 3-serif mix are already queued in `ui-smoothness.md` and `product-vision-gaps.md` and are excluded here.

Constraint reminder: framer-motion already in tree (LazyMotion + `m.*` in chat surface, full `motion` on `/`). No new libs. Respect `prefers-reduced-motion`.

---

## 1. Landing page (`src/app/page.tsx`)

### 1.1 Hero — nothing ambient in the negative space
- **Current state.** `page.tsx:212-261` — eyebrow + 2-line SplitText headline + subline + CTA + two decorative vertical lines at `:214-215`. Once the initial stagger finishes, the hero is frozen until scroll.
- **Problem.** ~70% of the hero viewport is dead air; a buyer pausing to read "Honesty is rare." sees zero ambient life, which is what the user calls "sleek but boring."
- **Proposed fix.** Add a very slow (`duration: 18s`, linear) left-to-right sheen sweeping across the italic `is rare.` gold word via `background-clip: text` + `motion.span` gradient-position animation — 1 px, infinite. Gives the accent word a "jewelry under light" feel that reinforces the luxury-honest tone.
- **Effort.** 20 min. **Risk.** low (pure decoration, guarded by `prefers-reduced-motion`).

### 1.2 Hero — CTA arrow is the only motion anchor
- **Current state.** `page.tsx:251` — `motion.span animate={{ x: [0,4,0] }}` infinite pulse on the arrow glyph. Same one used in CTA section at `:352`. It's the only "still alive" signal on the hero fold.
- **Problem.** Arrow pulse is a generic affordance; doesn't ladder to brand.
- **Proposed fix.** Add a thin 1px accent line underneath the CTA that "draws in" from 0 → 100% width on scroll-into-view using `scaleX` + `transform-origin: left`, then holds. Pairs with the eyebrow-line motif (already used at `:214,221,284,328`). Keeps geometry honest, gives the CTA a second motion cue.
- **Effort.** 15 min. **Risk.** low.

### 1.3 Marquee — identical direction every loop
- **Current state.** `page.tsx:17-35` — six items duplicated, animated `x: ['0%', '-50%']` linear 25s.
- **Problem.** After one loop a buyer has seen everything; no reason to read it twice. No hover-pause, no opacity gradient at the edges — the items hard-cut at the viewport edge.
- **Proposed fix.** (a) Add a 64px `mask-image: linear-gradient(90deg, transparent, black 10%, black 90%, transparent)` so items fade in/out at edges — more "editorial" feel. (b) On hover, pause via `animationPlayState` (set via `whileHover` on wrapper) so a buyer can actually *read* "Builder Trust Score — RERA verified."
- **Effort.** 10 min. **Risk.** low.

### 1.4 Project preview — resting cards look like dead links
- **Current state.** `page.tsx:99-127` — 3 cards + "view all 50+" dashed card, `whileHover={y:-4, borderColor: accent}` only.
- **Problem.** At rest the cards have no character: tiny 32×2px gold bar + name + area + price + tag. No photo, no gradient, no visual weight. The Homesty card (`ProjectCardV2`) is richer; landing preview feels like a stepchild.
- **Proposed fix.** Stagger-reveal cards on scroll-into-view (`whileInView` + `viewport={{ once: true }}` + delay `i*0.08`). On hover, also animate the gold 32px bar to `64px` width (`whileHover` on child via variants) — subtle, but tells the eye "selecting this card extends into a deeper commitment." Bonus: add a `transform: translateY(-4px)` on the PRICE text only on hover so the number "lifts to attention." One element, one axis.
- **Effort.** 20 min. **Risk.** low.

### 1.5 Philosophy pillars — 4 static boxes, 4 revelations
- **Current state.** `page.tsx:293-306` — 4 pillar cards in a 2×2 grid, `Reveal` staggered, `whileHover={ background }`. Roman numerals I–IV.
- **Problem.** The Roman numeral is the liveliest element — but it never moves. Pillars read like a brochure section because they're symmetric, fade-in-and-stop.
- **Proposed fix.** On scroll-into-view, draw a 1px vertical line UP along the left edge of each pillar from 0→100% height, sequenced with `delay: i*0.12`. Gives the "philosophy carved into stone" feel and physically connects the 4 statements into one argument. Use `scaleY` + `transform-origin: bottom` on a pseudo-positioned div.
- **Effort.** 25 min. **Risk.** low.

### 1.6 Honest Concern example block — the section that sells the brand
- **Current state.** `page.tsx:310-322` — a single quote card with amber left-border, static.
- **Problem.** This is the *proof* section — a sample honest disclosure. Buyer reads it and decides "these guys are real." Yet it enters like any other Reveal block. No emphasis, no earned attention.
- **Proposed fix.** Type-on effect for the blockquote only — 50 chars/sec, starting when `inView === true`, cursor blink at end. 2.5 second dwell, then cursor fades. This is the one place where typography performance = persuasion. Already have framer-motion's `animate()` imperatively; use a `useEffect` + character index state. (Alternatively: 3-step mask-reveal from left-to-right with `clip-path` — 90% of the effect at 20% of the code.)
- **Effort.** 40 min for typewriter; 15 min for clip-path mask-reveal. **Risk.** med for typewriter (accessibility: announce full text to SR via `aria-label`; bypass when `prefers-reduced-motion`), low for clip-path.

### 1.7 Founder quote — the centerpiece has zero presence
- **Current state.** `page.tsx:324-335` — 60px vertical gold line → italic quote → founder name. Single `Reveal` fade-in.
- **Problem.** This is the brand's emotional apex and it's smaller/quieter than the pillar grid above.
- **Proposed fix.** Render the quote mark (`"`) as a separate 120px serif glyph behind the quote, at 6% opacity, positioned top-left with `mix-blend-mode: multiply`. Subtle parallax: 0.4× scroll-y offset via `useScroll` + `useTransform`. Adds editorial gravity without adding words.
- **Effort.** 25 min. **Risk.** low.

### 1.8 Final CTA section — pushy-safe
- **Current state.** `page.tsx:337-356` — dark section, headline + subline + Begin CTA. Same arrow-pulse as hero.
- **Problem.** Hero CTA and final CTA use identical motion, so scroll feels like "same button, second time." No tonal shift to signal "we're asking you to commit now."
- **Proposed fix.** On scroll-into-view, fade in a thin hairline gold "— when you're ready" eyebrow above the headline (delay 0.2s). Replace the arrow-pulse with a slow (6s) shimmer sweep across the Begin button's `border`. Different vocabulary = different moment.
- **Effort.** 20 min. **Risk.** low.

---

## 2. Buttons

Landscape inconsistencies (new, not in ui-smoothness):

### 2.1 Primary button shape drift
- **Current state.** Landing CTA (`page.tsx:201-202`) uses `borderRadius: '4px'`. Chat input send button (`ChatCenter.tsx:754`) uses `rounded-2xl`. ProjectCardV2 "Book visit" (`ProjectCardV2.tsx:378`) uses `rounded-xl`. VisitBooking confirm (`VisitBooking.tsx:277`) uses `rounded-full`. Four shapes for one brand.
- **Problem.** Tells the buyer the product was stitched by different hands.
- **Proposed fix.** Lock 2 shapes: `rounded-full` for pill-actions (Book visit, Confirm visit, Compare, Save pill) and `rounded-md (6px)` for landing/primary page CTAs (Begin, Find your home, Ready for your honest answer). Drop `rounded-xl` and `rounded-2xl` in button context.
- **Effort.** 30 min. **Risk.** low (visual only, zero logic change).

### 2.2 Send button dead-state reads as broken
- **Current state.** `ChatCenter.tsx:754` — `disabled:opacity-30` on a near-black `#1C1917` button over beige. Matches an issue in ui-smoothness.md §4; my addition: the arrow SVG inside is also 30% — there is nothing remaining to indicate affordance. (Already covered, skip fix here — just noting the related gap.)

### 2.3 No loading-state affordance on Book Visit / Save
- **Current state.** `ProjectCardV2.tsx:89-113` — `setSaving(true)` state is set but UI doesn't react. Save icon doesn't spin, pulse, or stroke-dash. Same for `Book visit →` (no `isLoading` state at all — event dispatches and returns synchronously; but for VisitPromptCard confirm and VisitBooking confirm the state exists — see `VisitBooking.tsx:279`, which uses `Booking...` text-only.)
- **Problem.** On slow 3G, save tap + 400ms network = unclear whether the tap registered.
- **Proposed fix.** During `saving`, animate the bookmark SVG's `stroke-dashoffset` on a 0.6s loop (`m.svg animate={{ strokeDashoffset: [20,0] }}`). Universal idiom.
- **Effort.** 15 min. **Risk.** low.

### 2.4 No focus-visible ring on buyer-facing buttons
- **Current state.** Most `m.button` in artifacts (`ProjectCardV2.tsx:167-178`, `ComparisonCard.tsx:128-139`, `CostBreakdownCard.tsx:172-191`) have only `whileHover`/`whileTap` — no `focus-visible:ring-*` class. Keyboard users see nothing.
- **Problem.** Accessibility + polish.
- **Proposed fix.** Add `focus-visible:ring-2 focus-visible:ring-[#1B4F8A]/50 focus-visible:ring-offset-2 focus-visible:outline-none` class globally to artifact buttons.
- **Effort.** 15 min. **Risk.** low.

### 2.5 Starter-chip "two-systems-fighting" already flagged
- `ChatCenter.tsx:400-401` — inline `onMouseEnter` sets `borderColor` while `whileHover` sets `y` + `boxShadow`. Known (ui-smoothness §4 LOW). Skip.

### 2.6 Admin vs buyer button visual separation
- **Current state.** Admin primary action buttons (checked at `admin/projects/page.tsx:162` "Edit →") use same `#1B4F8A` solid blue as buyer `Book visit`. Same shape, same color.
- **Problem.** Operator brain mis-reads "book visit" as admin when switching tabs.
- **Proposed fix.** Introduce an admin accent (the amber `#BA7517` already used for "hot stages" in overview) for admin CTAs; keep `#1B4F8A` + green reserved for buyer-facing. Cross-surface identity without a redesign.
- **Effort.** 45 min. **Risk.** low.

---

## 3. Cards

### 3.1 ProjectCardV2 — shimmer runs only while hovered
- **Current state.** `ProjectCardV2.tsx:151-156` — white-gradient shimmer on photo header, animates only `on hover`.
- **Problem.** Mobile has no hover. The card looks totally static on phones (where 70%+ of traffic lives).
- **Proposed fix.** Run one 1.5s shimmer sweep on mount (`animate` with `useEffect` + single cycle), then idle. Desktop hover re-triggers infinite loop. Mobile sees the "wake-up" once.
- **Effort.** 15 min. **Risk.** low.

### 3.2 ProjectCardV2 — "Honest Concern" block deserves an entrance
- **Current state.** `ProjectCardV2.tsx:329-340` — fades in with `delay: 0.2`, same as card. Feels simultaneous.
- **Problem.** This is the BRAND PROMISE. It should arrive *after* the buyer has read the price, as a second beat.
- **Proposed fix.** Stagger: card fade-in (0), price block (0.2s), Honest Concern (0.5s with a subtle 3deg tilt-settle via `rotateZ: [-1, 0]`). Sequence telegraphs "here's the happy surface… and here's what we don't hide."
- **Effort.** 10 min. **Risk.** low.

### 3.3 ProjectCardV2 — trust score bar animates to full, then nothing
- **Current state.** `ProjectCardV2.tsx:360-366` — width animates 0 → `${trustScore}%` over 0.8s. Good motion but the number next to it (`:355-356`) appears fully rendered from frame 0.
- **Problem.** Eye sees the full 75/100 before the bar has finished drawing — the reveal is spoiled.
- **Proposed fix.** Use `useMotionValue` + `useTransform` to count the integer from 0 → `trustScore` over the same 0.8s (`animate()` imperative). Number races the bar.
- **Effort.** 20 min. **Risk.** low.

### 3.4 ComparisonCard — winner ✓ has no flourish
- **Current state.** `ComparisonCard.tsx:14-17` — `Winner` component renders a static green ✓ checkmark next to the value.
- **Problem.** Comparison is the *decision moment*. The winning cell should feel selected, not decorated.
- **Proposed fix.** On mount, stagger-reveal each winning ✓ with a 0.3s delay per row (`i*0.15` starting after card entrance), using `scale: [0, 1.3, 1]` bounce. Bonus: very subtle 1-frame background flash (`#E1F5EE` opacity 0→0.4→0) on the winning cell behind the value. Reads as "ding — this one."
- **Effort.** 25 min. **Risk.** low.

### 3.5 ComparisonCard — "Visit X" buttons are twin blue+green
- **Current state.** `ComparisonCard.tsx:135` — button A uses `#1B4F8A` blue, button B uses `#0F6E56` green — fixed by index, not by decision.
- **Problem.** Color implies "pick green" regardless of which is the Strong Buy. If project A is the Strong Buy, the green button under project B contradicts the winner-✓s above.
- **Proposed fix.** Color the CTA by `decisionTag` instead of index: Strong Buy = green, Buy w/ Cond = blue, Wait/Avoid = muted grey.
- **Effort.** 15 min. **Risk.** low (data-driven, no logic change).

### 3.6 CostBreakdownCard — line items arrive as a wall
- **Current state.** `CostBreakdownCard.tsx:110-122` — lines render simultaneously on card mount.
- **Problem.** 6-8 cost lines reading at once = cognitive dump. Opportunity missed: a cost breakdown should *assemble* like a receipt.
- **Proposed fix.** `motion.div` per line with `initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay: 0.15 + i*0.06}}`. Sub-Total + GST + Stamp Duty are grouped into a second "beat" with an extra 0.2s gap. ALL-IN total ticks up from ₹0 using `animate()` over 0.8s, mirroring 3.3. Feels like a calculator pulling the number down.
- **Effort.** 30 min. **Risk.** low.

### 3.7 CostBreakdownCard — empty state is a single paragraph
- **Current state.** `CostBreakdownCard.tsx:61-78` — "Cost breakdown not available for X. Ask me for a price estimate."
- **Problem.** Reads like a 404. No illustration, no action, no brand voice.
- **Proposed fix.** Replace with a 2-line treatment: icon (scales/coin SVG) + "Pricing for {project.name} is still being verified." + subtle primary button "Ask Balvir for an estimate" that dispatches a `compose-message` event prefilling the input with "What's the estimated all-in for {project.name}?".
- **Effort.** 25 min. **Risk.** low.

### 3.8 BuilderTrustCard — 5 subscore bars animate together
- **Current state.** `BuilderTrustCard.tsx:85-91` — all 5 bars use the same `delay: 0.3`.
- **Problem.** 5 bars expand simultaneously = information flood.
- **Proposed fix.** Stagger `delay: 0.3 + i*0.12` so bars draw in order top-to-bottom. Gives the eye time to read each label.
- **Effort.** 5 min. **Risk.** low.

### 3.9 BuilderTrustCard — grade pill has no explanatory tooltip
- **Current state.** `BuilderTrustCard.tsx:51-54` — grade pill, no tooltip. (Product gap already noted in product-vision-gaps §3; adding motion here.)
- **Problem.** On hover, nothing happens to educate.
- **Proposed fix.** On pill hover/focus, slide down (`y: [-4,0]` + opacity) a one-line caption below the pill: "Grade C = acceptable track record with moderate risk." Uses `AnimatePresence`. 200ms in / 150ms out.
- **Effort.** 25 min. **Risk.** low.

### 3.10 VisitPromptCard — slot buttons lack differentiation
- **Current state.** `VisitPromptCard.tsx:51-68` — 6 slots in 2×2 grid; selected gets border+bg swap.
- **Problem.** Selection flash is instant; no spring. Feels like radio-button, not "picking a time with Balvir."
- **Proposed fix.** On select, add `layoutId="slot-selected"` to an inner wrapper so the selected indicator *animates between slots* via framer's shared-layout transition. Cheap magic.
- **Effort.** 20 min. **Risk.** low.

### 3.11 Empty state in ChatRightPanel — character exists but hidden on mobile
- **Current state.** `ChatRightPanel.tsx:200-223` — animated radial gradient bg + arrow glyph + "Project details appear here as you chat." Nice, but lives in `hidden lg:block` (panel line 87) so mobile buyers never see it.
- **Problem.** Inconsistent first impression.
- **Proposed fix.** Not a motion fix — surface this empty state on mobile via a one-time sheet after the first AI message, or as the closed state of the artifact pill. Low priority but worth noting.
- **Effort.** 40 min. **Risk.** low.

---

## 4. Navbar + sidebar + modals

### 4.1 Navbar scroll-state transition is abrupt
- **Current state.** `page.tsx:180-183` — `background` swap + `backdropFilter: blur(20px)` + border-bottom all triggered by `scrolled > 40` via React state. CSS `transition: all 300ms ease` on the wrapper.
- **Problem.** `all` transition includes `backdropFilter`, which browsers don't animate smoothly. Result: the blur snaps on. Also, the transition has no staging between border/bg/blur.
- **Proposed fix.** (a) Replace `transition: all` with specific props (`background-color, border-color, box-shadow`) and accept that blur snaps. (b) Add a subtle `box-shadow: 0 4px 24px rgba(0,0,0,0.04)` at scrolled state to give weight. (c) Scroll threshold should debounce on the `scrolled` boolean — ui-smoothness already calls this out indirectly.
- **Effort.** 15 min. **Risk.** low.

### 4.2 Mobile artifact modal entrance/exit uses same spring
- **Current state.** `ChatCenter.tsx:512-516` — enter: `y:60→0, scale:0.95→1` spring; exit: same spring in reverse.
- **Problem.** Exit feels as "springy" as enter, which is emotionally off — dismissal should feel heavier/quicker than arrival. Already noted in ui-smoothness §2.
- **Proposed fix (ADDITIVE).** Make exit `type: 'tween', duration: 0.18, ease: 'easeIn'` while keeping enter spring. This is the standard Material motion principle (quick out, measured in).
- **Effort.** 5 min. **Risk.** low.

### 4.3 Modal backdrop has no ease
- **Current state.** `ChatCenter.tsx:503-509` — backdrop `opacity:0→1` with no duration, default (0.2s linear).
- **Problem.** Backdrop lands at same moment as card, lock-step. Known issue but new fix suggestion:
- **Proposed fix.** Sequence: backdrop fades in over 0.25s (ease-out), then card springs in at `delay: 0.08`. Reverse on exit. Staggered dismissal feels like a curtain rising/falling.
- **Effort.** 10 min. **Risk.** low.

### 4.4 Toast (compareToast) has no dismiss-on-hover
- **Current state.** `ChatCenter.tsx:635-650` — toast auto-dismisses, no hover-pause, no swipe-dismiss.
- **Problem.** Buyer with slow read speed loses the message.
- **Proposed fix.** Wrap in `onMouseEnter` that clears the dismissal timer and `onMouseLeave` that reschedules it with 1.5s head start. Also add drag-to-dismiss via framer `drag="y"` + `onDragEnd` threshold.
- **Effort.** 20 min. **Risk.** low.

### 4.5 Sidebar — swipe-to-delete has no haptic/pop
- **Current state.** `ChatSidebar.tsx:58-68` — drag-end either animates to `-500` then DELETE API, or springs back to 0.
- **Problem.** Destructive action has no "confirmation moment." Animate-out then fire `DELETE` means no undo window.
- **Proposed fix.** Add a 2.5s toast "Conversation deleted · Undo" (using the same toast pattern) with a server-side soft-delete and restore endpoint. Motion-only version: delay the DELETE call by 2.5s and cancel if undo clicked. Huge confidence gain.
- **Effort.** 60 min (requires small API change). **Risk.** med (data-layer change).

---

## 5. Chat surface specific

### 5.1 Bubble entrance is stock fade-in
- **Current state.** Assumed from stream pipeline (didn't inspect `ChatBubble` directly but visible by behavior) — new message appears with default opacity transition.
- **Problem.** User messages feel identical to AI messages in arrival motion.
- **Proposed fix.** User bubbles slide from right (`x: 16 → 0`), AI bubbles slide from left (`x: -8 → 0`) + `scale: 0.98 → 1`. Directional motion tells the eye who spoke. 180ms, ease-out.
- **Effort.** 20 min. **Risk.** low.

### 5.2 Typing indicator is generic
- **Current state.** `ChatCenter.tsx:466-484` — 3 dots bouncing `y: [0,-3,0]`. Universal AI-chat pattern.
- **Problem.** Brand-neutral. Every Anthropic/OpenAI clone uses this.
- **Proposed fix.** Replace with a single gold pulse dot (`#C49B50`) that "listens" — a 2-ring radar ping effect (`scale: [0,1.4] + opacity: [0.6,0]` in a 1.8s loop). Pairs with the brand's honest-advisor framing ("I'm considering"). Still lightweight.
- **Effort.** 25 min. **Risk.** low.

### 5.3 Artifact panel slide-in on desktop
- **Current state.** `ChatRightPanel` renders with `AnimatePresence` children — the wrapper at `ChatRightPanel.tsx:87` is `hidden lg:block` static-width panel; the inner content swaps with fade.
- **Problem.** The first time an artifact appears, the panel transitions from an empty-state motion to a card. No visible "slide-in-from-right" of the first artifact — it just swaps.
- **Proposed fix.** On the FIRST artifact appearing, animate the entire artifact wrapper from `x: 40, opacity: 0` to `x: 0, opacity: 1`, spring. Subsequent swaps keep the existing fade. Use a ref/flag.
- **Effort.** 20 min. **Risk.** low.

### 5.4 Context-chip row appears without staging
- **Current state.** `ChatCenter.tsx:448-458` — chips map to plain `<button>` with `hover:scale-[1.04]` transform. No mount transition. They pop into the DOM after the last AI message finishes streaming.
- **Problem.** Eye is still reading the AI response when chips snap in.
- **Proposed fix.** Wrap in `m.div` with staggered children: `initial={{opacity:0, y:4}} animate={{opacity:1, y:0}} transition={{delay:0.15 + i*0.05}}`. Gives the buyer "here's where to go next" with a gentle cadence.
- **Effort.** 10 min. **Risk.** low.

---

## 6. Copy & micro-content

### 6.1 Generic error fallback pages
- **Current state.** `src/app/chat/error.tsx:10`, `src/app/projects/error.tsx:10` — both render literal `Something went wrong` + `Try again`. Widget at `FloatingChatWidget.tsx:118,313` also says `Something went wrong. Please try again.`
- **Problem.** Strips the brand voice at the moment the buyer most needs reassurance. "Homesty is honest" — but also "Something went wrong" (who? when? why?).
- **Proposed fix.** Branded variants:
  - `/chat/error`: "A glitch on our side — not yours. Let's retry." + "Retry ↻"
  - `/projects/error`: "We couldn't pull the list. This happens — click to retry."
  - Widget: "Network hiccup — retry?"
- **Effort.** 10 min (3 files). **Risk.** low.

### 6.2 Save toast is laconic
- **Current state.** `ProjectCardV2.tsx:217` — `Saved ✓` (2-char + glyph).
- **Problem.** The "Homesty remembers what you pick" promise is wasted — toast could say more.
- **Proposed fix.** Change to `Saved · we'll remember this` (matches the master-doc's brand voice). Or Hinglish variant when Hindi intent is detected: `Saved · yaad rahega`. Already have persona detection threaded; reuse.
- **Effort.** 5 min (static copy change) / 30 min (persona-aware). **Risk.** low.

### 6.3 Empty states lack story
- **Current state.** `/compare` empty (`compare/page.tsx:328`) says "Select projects to compare." `/projects` no-match says "No projects match your filters." `/dashboard` saved-empty says "No saved projects yet" + "Start exploring →".
- **Problem.** None use the Balvir/founder voice. "No data" default.
- **Proposed fix.** Add a one-line founder-voice subline under each empty state:
  - Compare: "Pick two — I'll show the honest difference."
  - Projects no-match: "Try a wider budget or area — honest filters shouldn't starve you."
  - Dashboard saved-empty: "Save a project in chat — I'll watch it for price changes."
- **Effort.** 15 min. **Risk.** low.

### 6.4 Success after visit booking lists tips with emoji
- **Current state.** `VisitBooking.tsx:226-232` — 4 tips each starting with an emoji.
- **Problem.** Mixed emoji density on a "luxury-honest" card. 📋🏗📱⏰ is warm, but inconsistent with the rest of the surface (which uses lineart SVGs and ⚠ only).
- **Proposed fix.** Replace emojis with the existing 14×14 SVG icon set (calendar, ID, phone, clock), rendered inline. Keeps warmth through iconography without the consumer-app emoji vibe.
- **Effort.** 30 min. **Risk.** low.

### 6.5 "Ask Balvir" persistent voice anchor is missing
- **Current state.** Balvir/founder voice lives on landing page (`page.tsx:332`) but has zero touchpoint in `/chat`. (Overlaps product-vision-gaps §8; adding motion here.)
- **Proposed fix.** A faint footer line in the chat empty state — under `Homesty earns only when you buy...` — that says `— Balvir, founder` in Cormorant italic. Gives the chat a persistent author.
- **Effort.** 10 min. **Risk.** low.

---

## 7. Landing motion plan (the main ask)

Six additions, ranked impact-to-effort. Each extends the "sleek" base with a single layer of warmth. None break `prefers-reduced-motion` if wrapped with `useReducedMotion()`.

| # | Addition | File:line | Effort | Risk | Impact why |
|---|---|---|---|---|---|
| L1 | **Honest Concern block: clip-path mask-reveal on scroll-into-view** (§1.6) | `page.tsx:310-322` | 15 min | low | This is the single most brand-defining paragraph. Motion elevates it from decoration to proof. |
| L2 | **Featured-projects row: staggered card reveals + `y:-4` + gold-bar width extension on hover** (§1.4) | `page.tsx:99-127` | 20 min | low | Dead cards → "try me" cards. Zero risk, high perceived quality. |
| L3 | **Philosophy pillars: vertical line draws up on scroll-into-view, staggered** (§1.5) | `page.tsx:293-306` | 25 min | low | Ties 4 claims into one visual argument; reinforces "carved in stone" brand voice. |
| L4 | **Marquee edge-mask + hover-pause** (§1.3) | `page.tsx:17-35` | 10 min | low | Cheapest editorial upgrade; makes the strip feel intentional not decorative. |
| L5 | **Hero accent-word sheen: slow diagonal sweep across "is rare."** (§1.1) | `page.tsx:228-232` | 20 min | low | Gives the hero ambient life without adding noise or elements. "Jewelry under light." |
| L6 | **Final CTA: hairline gold eyebrow + border shimmer replaces arrow-pulse** (§1.8) | `page.tsx:337-356` | 20 min | low | Differentiates the closing CTA from the opening one — "this is the moment." |

Total: ~110 min. All use motion already in tree; wrap each with a `useReducedMotion()` guard.

---

## Top-10 fixes ranked by impact-to-effort

| # | Fix | Effort | Dim |
|---|---|---|---|
| 1 | Error fallback copy (chat + projects + widget) — branded, not generic | 10 min | §6.1 |
| 2 | BuilderTrustCard: stagger 5 subscore bar animations (delay `i*0.12`) | 5 min | §3.8 |
| 3 | Mobile artifact modal: quick exit tween (0.18s) vs current spring | 5 min | §4.2 |
| 4 | Marquee edge-mask + hover-pause | 10 min | §1.3 / L4 |
| 5 | Honest Concern block: clip-path mask-reveal on scroll-into-view | 15 min | §1.6 / L1 |
| 6 | Landing CTA: hairline eyebrow + border shimmer replaces arrow-pulse | 20 min | §1.8 / L6 |
| 7 | Featured-projects row: stagger + hover gold-bar extend | 20 min | §1.4 / L2 |
| 8 | ProjectCardV2: trust-score number races the bar (0 → `trustScore`) | 20 min | §3.3 |
| 9 | ComparisonCard: winner ✓ pop-in stagger + cell bg flash | 25 min | §3.4 |
| 10 | Lock button shapes to two: pill (action) + 6px-md (page CTA) | 30 min | §2.1 |

Total sprint: ~160 min, zero data-layer changes, no new deps, all respect `prefers-reduced-motion`.

---

*Audit complete. Findings are additive to `ui-smoothness.md` + `product-vision-gaps.md`; none overlap known issues.*
