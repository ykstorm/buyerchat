# UI Smoothness Audit — homesty.ai

Read-only walk-through. "Bugs" excluded; this is the sensory layer only.
Refs are `file:line`.

---

## 1. First-paint feel

- **HIGH — Hero CLS from split-text + cursor glow stack.** `src/app/page.tsx:81-96,253-259`
  Hero headline animates 16+ character-wrapped `motion.span`s from `y:20→0` with staggered delays while `Cormorant` loads via `display:swap`. A buyer on 3G sees the fallback serif render, then *each letter* springs in after font-swap. Feels stuttery.
  Fix: render headline statically, keep stagger only on eyebrow + subline; add `size-adjust` or `font-display: optional` on Cormorant.

- **MED — Hero "heaviness".** `src/app/page.tsx:196-197,13-14`
  Grain (SVG data-URL, 180px tile), CursorGlow, radial lines, marquee, particle-style reveals all boot simultaneously. Landing LCP element is a hero text node, but the first 600 ms is dominated by motion setup. A snappier hero would defer `Grain` + `CursorGlow` until post-LCP.

- **MED — `/chat` double-paint.** `src/app/chat/page.tsx:64-80`
  Page renders a `.bg-paper` shell + noise layer at `z-50` covering the whole viewport, then Suspense swaps in `ChatClient`. On a cold load the buyer sees beige paper → fade → real chat. The `fixed inset-0 z-50` wrapper is unnecessary and creates a flash.

---

## 2. Transition choreography

- **HIGH — Dark-mode FOUC on everything except `/`, `/projects`.** `src/app/layout.tsx:65-72`
  The inline theme script only reads `homesty-theme === 'dark'`. But `/projects` and `/` each redefine their own `--landing-*` CSS variables via `<style>{...}</style>` injected *after* hydration. For a dark-mode user hitting `/projects` directly, the page paints light-theme landing tokens for one frame before the `[data-theme="dark"]` override cascades in. Same on `/compare`, `/dashboard`, `/builders/[id]`.
  Fix: hoist landing-scope variables to `globals.css` behind `[data-theme]`, drop the per-page `<style>` blocks.

- **MED — Sidebar open/close is fine; mobile artifact modal is a jump-cut.** `src/components/chat/ChatCenter.tsx:486-531`
  Modal has `spring stiffness:350 damping:35` entrance but exits with the same spring from `y:60`. No backdrop ease staging — backdrop and card appear/disappear in lock-step which feels heavier than staggered.

- **LOW — View Transitions declared but unused.** `src/app/globals.css:272-288`
  `@view-transition { navigation: auto }` is on, but route transitions from `/` → `/chat` still look like a hard swap because `/chat`'s fullscreen `fixed z-50` shell blocks the old root from fading out cleanly.

---

## 3. Scroll behavior

- **MED — `scrollIntoView({behavior:'smooth'})` on every message tick.** `src/components/chat/ChatCenter.tsx:256-260`
  Triggers smooth-scroll on `[messages, isLoading]`. During a streaming response with RAF-batched updates (`chat-client.tsx:244-262`), this fires ~30×/sec. On iOS Safari the smooth animation fights itself — buyer sees a jittery auto-scroll that visibly "pumps". Use `scrollTo({top, behavior:'instant'})` when `isLoading`, smooth only on final flush.

- **MED — Input bar "rubber-bands" when artifact modal opens on mobile.** `ChatCenter.tsx:732` sticky input + `env(safe-area-inset-bottom)` + modal that deliberately leaves `bottom: calc(88px + safe-area)` creates a 1-frame gap when the modal mounts. A new buyer perceives the input shifting down-then-up.

- **LOW — No horizontal overflow found** on `/projects`, `/compare`, `/`.

---

## 4. Interaction microfeedback

- **HIGH — `ProjectCardV2` 3D tilt is motion-sickness inducing.** `src/components/chat/artifacts/ProjectCardV2.tsx:21-25,128-137`
  `rotateX / rotateY` from `useTransform([-100,100],[4,-4])` on mousemove. On the right-panel sized card (~320 px wide) this reads as a drunk-wobble. Buyer hovers to read the price and the whole card tilts — including the "Honest Concern" amber block, which is the most information-dense element on the screen.
  Fix: drop the tilt, keep the shadow intensification.

- **MED — Save-button state is ambiguous.** `ProjectCardV2.tsx:165-176`
  Unsaved state = bookmark icon, 20% white background over navy gradient. Saved state = same bookmark filled, solid blue background. They look near-identical at a glance — no checkmark, no color shift to green. Buyer taps once, can't tell if it worked (until the "Saved ✓" toast appears, and only in the post-OAuth flow).

- **MED — Send button disabled opacity.** `ChatCenter.tsx:742-751`
  `disabled:opacity-30` on a near-black button over beige reads as "broken/greyed out", not "fill the input first". At 30% opacity the up-arrow SVG nearly disappears.

- **LOW — Starter chip hover.** `ChatCenter.tsx:384-397`
  `whileHover={{ y:-3, boxShadow }}` + border-color swap with inline `onMouseEnter/onMouseLeave` assigning to `e.currentTarget.style.borderColor`. Two systems fighting — noticeable on slow repaints.

---

## 5. Typography hierarchy

- **MED — Three serifs active.** `src/app/layout.tsx:9-22`
  `Playfair Display`, `Cormorant Garamond`, plus Georgia fallback. `ChatCenter` h1 uses Playfair (`ChatCenter.tsx:357`); `ProjectCardV2.tsx:226` uses Playfair; every other page (`/dashboard`, `/projects/[id]`, `/compare`, `/builders/[id]`, `/`) uses Cormorant. Feels inconsistent — buyer sees "Find your home." in Playfair on `/chat` then "Side-by-side comparison" in Cormorant on `/compare` and subconsciously flags a style break.
  Fix: pick one (Cormorant, based on brand) and drop Playfair.

- **LOW — Mixed dashes.** Em (`—`), en (`–`), hyphen (`-`) all present in user-facing copy: `page.tsx:267` uses em-dash; `ProjectCardV2.tsx:284` uses `–`. Minor, but visible.

---

## 6. Color + contrast

- **MED — Leftover hardcoded `#FAFAF8`.** `src/app/chat/page.tsx:74`, `src/app/chat/error.tsx:9`. Both paint hardcoded cream under a Suspense/error fallback — in dark mode the buyer sees cream flash before the real dark shell renders.

- **LOW — Landing accent `#B8924A` vs chat accent `#C49B50` vs dashboard `#C49B50`.** Close but not identical gold. Visible when buyer flows `/` → `/chat`.

- **LOW — `--text-label: #454560` in dark mode** (`globals.css:109`) is nearly invisible on `--bg-base: #1C1917`. Contrast ratio ~2.1:1 — fails WCAG AA for small text. Used in `/compare`, `/projects/[id]` meta rows.

---

## 7. Mobile (375px)

- **HIGH — iOS Safari keyboard covers artifact modal footer.** `ChatCenter.tsx:488-489,732`
  Modal uses `bottom: calc(88px + env(safe-area-inset-bottom))`. When input focuses and keyboard opens, visual viewport shrinks but the modal's bottom anchor doesn't react — the VisitBooking form's "Book visit" CTA gets pushed below the fold. Buyer has to dismiss keyboard → scroll → retap.
  Fix: use `100dvh` + `visualViewport` listener, or move CTA above phone-number input.

- **MED — Tap target: artifact modal close button is 28×28.** `ChatCenter.tsx:556-565`. Below 44 px minimum. Same for the artifact-back/forward chevrons at `7×7`.

- **LOW — Hamburger at `top-3 left-3` (`chat-client.tsx:566-574`) is 36×36** and shares the same row as the avatar chip (`top-3 right-3`) and artifact pill (`top-3 right-14`). Visually crowded on small screens.

---

## 8. Empty / edge states

- **MED — `/chat` first visit — "Homesty earns only when you buy. No builder pays for prom."** `ChatCenter.tsx:407`. "prom" is a typo (should be "promotion" or "placement"). Prominent trust-line under the starter grid. This copy is the last thing a buyer reads before their first message.

- **MED — `/compare` with 1 project queued.** `src/app/compare/page.tsx:315-332,456`.
  Compare page gates table on `projects.length >= 2` → shows `EmptyState` for 0 AND 1 selected. A buyer who selected one project gets the same "Select projects to compare" message — no acknowledgement that their first pick landed. Fix: conditional copy "1 selected — pick one more" with the selected card styled as active.

- **LOW — `/dashboard` empty-state mini-icons** (`dashboard/page.tsx:340-346`) are fine.

- **LOW — `/projects` no-filter-match** is graceful (`projects/page.tsx:279-290`).

---

## Top 10 ranked (impact ÷ effort)

| # | Fix | Sev | Effort |
|---|---|---|---|
| 1 | Remove 3D tilt on `ProjectCardV2` | HIGH | 5 min |
| 2 | Fix "prom" typo — `ChatCenter.tsx:407` | MED | 30 sec |
| 3 | Replace smooth `scrollIntoView` during stream with instant scroll | MED | 10 min |
| 4 | Expand theme pre-hydration script to cover `/projects`, `/`, `/compare` landing tokens (hoist to globals.css) | HIGH | 20 min |
| 5 | Replace hero char-stagger with word-stagger (3 nodes not 16) | HIGH | 10 min |
| 6 | Save-button state: add green fill + checkmark on saved | MED | 10 min |
| 7 | `/chat` Suspense shell: drop `fixed inset-0 z-50` wrapper, use plain container | MED | 5 min |
| 8 | Pick one serif: drop Playfair, standardise on Cormorant | MED | 20 min |
| 9 | `/compare` single-select state copy | MED | 15 min |
| 10 | Mobile tap targets: bump modal close/chevron to 40 px | MED | 10 min |

## Three-fix 30-min sprint
**#1, #2, #3** — single-file, zero-risk changes: kill the tilt wobble (ProjectCardV2), fix the "prom" typo (ChatCenter empty state), and swap smooth for instant scroll during streaming. All three hit the "feels broken" perception buyers form in the first 90 seconds of `/chat`.

## HIGH warranting separate hotfix
- **#4 — theme FOUC** is visible to every dark-mode returning user on every page except `/chat` and `/dashboard`. Not a "polish" — it's a "site looks broken on reload" problem. One PR, ~20 min.
- **iOS keyboard covering VisitBooking CTA (§7)** is a conversion blocker. Separate hotfix.

## Just-landed vs pre-existing
- **Just landed this session:** I22 top-right avatar chip (`ChatCenter.tsx:652-690`) is well-gated but crowds the mobile top-bar alongside hamburger + artifact pill (§7 LOW).
- **Pre-existing:** tilt, scroll-jitter, FOUC, "prom" typo, 3-serif mix, `#FAFAF8` hardcodes — all predate this session.
