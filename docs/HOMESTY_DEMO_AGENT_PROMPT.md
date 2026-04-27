# Claude Code Agent Prompt — `/demo` route (HOMESTY-DEMO-V2)

> Paste this entire file into Claude Code in a fresh terminal session.
> Single agent, single commit, ~3-4 hours.
> Replaces the failed vanilla GSAP+Lenis approach with the proper Aceternity UI + Magic UI stack.

---

## SESSION CONTEXT — READ FIRST

1. Read `docs/SESSION_HANDOFF.md` — confirm current commit + state.
2. Read `docs/AGENT_DISCIPLINE.md` sections 1, 4, 5, 9, 10.
3. Read `Homesty_DESIGN.md` (uploaded with this brief, or reference at the design system review tab in claude.ai/design). This is the **single source of truth** for visual decisions on this route. If any choice is ambiguous, the DESIGN.md wins.
4. `npm run verify` must pass before commit. Baseline: 159/159 tests.
5. Verdict format: `[OK] {sha} demo-v2 +{kbDelta}kB tests {pass}/{total}`.

## CONTEXT — WHY THIS EXISTS

The first attempt at a marketing demo (vanilla HTML + GSAP + Lenis) had broken scroll behavior and felt amateur. We're rebuilding inside the actual Next.js app using **Aceternity UI** (cinematic motion library, Framer Motion based) + **Magic UI** (companion landing-page library, also Framer Motion based) on top of **shadcn/ui**. All three install via the same shadcn CLI registry pattern. All three are MIT licensed and copy-paste — code lands in `components/ui/`, owned by us.

**Goal:** A `/demo` route that is so visually arresting it can be the screen-recording source for builder pitches, investor calls, and Instagram. Apple-tier scroll storytelling. Designed for landscape desktop screen-recording (1920×1080 ideal); also works on mobile with graceful section-stacking.

---

## DELIVERABLE

A single new route at `src/app/demo/page.tsx` (plus `layout.tsx` for `noindex` metadata), composed of installed Aceternity + Magic UI components arranged into 11 scenes that match the DESIGN.md narrative.

**No DB calls. No API calls. No auth.** The route is fully static so it works offline and screen-records cleanly on any environment.

---

## SETUP STEPS (do these first, in order)

### 1. Initialize shadcn/ui

```bash
# Existing repo already has tailwind 4 + framer-motion + clsx + tailwind-merge.
# We just need shadcn's components.json + lib/utils.ts.
npx shadcn@latest init
```

When prompted:
- Style: **New York**
- Base color: **Zinc**
- CSS variables: **Yes**
- React Server Components: **Yes** (default)
- Import alias: keep `@/components` and `@/lib/utils`

This creates `components.json`, `src/lib/utils.ts` (with the `cn()` helper), and updates `tailwind.config.ts` (note: with Tailwind 4 PostCSS plugin we may need to align tokens manually — see step 4).

### 2. Add registry config for Aceternity + Magic UI

Edit `components.json` after init to add the third-party registries:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  },
  "registries": {
    "@aceternity": "https://ui.aceternity.com/registry/{name}.json",
    "@magicui":    "https://magicui.design/r/{name}.json"
  }
}
```

### 3. Install the components needed for `/demo`

Run these one at a time, accepting any peer dependency prompts:

```bash
# Aceternity
npx shadcn@latest add @aceternity/spotlight
npx shadcn@latest add @aceternity/background-beams
npx shadcn@latest add @aceternity/sticky-scroll-reveal
npx shadcn@latest add @aceternity/container-scroll-animation
npx shadcn@latest add @aceternity/3d-card
npx shadcn@latest add @aceternity/lamp
npx shadcn@latest add @aceternity/tracing-beam
npx shadcn@latest add @aceternity/world-map
npx shadcn@latest add @aceternity/bento-grid

# Magic UI
npx shadcn@latest add @magicui/marquee
npx shadcn@latest add @magicui/number-ticker
npx shadcn@latest add @magicui/border-beam
npx shadcn@latest add @magicui/animated-shiny-text
npx shadcn@latest add @magicui/blur-fade
npx shadcn@latest add @magicui/animated-beam
npx shadcn@latest add @magicui/shimmer-button
npx shadcn@latest add @magicui/word-rotate
```

If any registry URL has changed (rare, but possible): visit the component's page on `ui.aceternity.com/components` or `magicui.design/docs/components` and copy-paste the source manually into `src/components/ui/<component-name>.tsx`. Don't block on broken CLI; fall back gracefully.

### 4. Add the Cormorant Garamond + Sora fonts

In `src/app/layout.tsx` (or whichever root layout currently loads fonts via `next/font`), ensure both families are loaded:

```ts
import { Cormorant_Garamond, Sora } from 'next/font/google'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap'
})
const sora = Sora({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sora',
  display: 'swap'
})

// Apply to <html> or <body>:
<html className={`${cormorant.variable} ${sora.variable}`}>
```

Then in `src/app/globals.css`, add the design tokens from `Homesty_DESIGN.md` § 2 + § 3 if they don't already exist. **Do NOT remove existing tokens** used by other surfaces — append, don't replace.

```css
@layer base {
  :root {
    --ink: #0E0D0C;
    --ink-soft: #1C1917;
    --paper: #F5F1EA;
    --cream: #FAFAF8;
    --gold: #C49B50;
    --gold-bright: #E2B86A;
    --gold-deep: #8B6F32;
    --amber-soft: #FAEEDA;
    --amber-deep: #633806;
    --green-deep: #0F6E56;
    --green-soft: #E1F5EE;
    --line: rgb(255 255 255 / 0.08);
    --line-dark: rgb(14 13 12 / 0.08);
    --font-serif: var(--font-cormorant), Georgia, serif;
    --font-sans: var(--font-sora), system-ui, sans-serif;
  }
}
```

---

## FILE STRUCTURE TO CREATE

```
src/app/demo/
├── layout.tsx                  -- noindex metadata
├── page.tsx                    -- composes 11 scenes, no DB/auth
└── _components/
    ├── DemoHero.tsx            -- Scene 1
    ├── DemoMarquee.tsx         -- Scene 2
    ├── DemoProblem.tsx         -- Scene 3 (3-stage pinned)
    ├── DemoProof.tsx           -- Scene 4 (3D project card)
    ├── DemoPillars.tsx         -- Scene 5 (sticky scroll reveal)
    ├── DemoTrust.tsx           -- Scene 6 (number ticker + bento)
    ├── DemoVisitToken.tsx      -- Scene 7 (border beam token card)
    ├── DemoCommission.tsx      -- Scene 8 (lamp + 1.5%)
    ├── DemoGeography.tsx       -- Scene 9 (world map cropped to India)
    ├── DemoFounder.tsx         -- Scene 10 (tracing beam quote)
    └── DemoCloser.tsx          -- Scene 11 (background beams + shimmer button)
```

Each `Demo*.tsx` is a `"use client"` component (Aceternity + Magic UI all need client-side Framer Motion).

---

## SCENE-BY-SCENE COMPONENT MAP

The DESIGN.md narrative lives in 11 sections. Each section uses one signature Aceternity or Magic UI component as its anchor — no two scenes use the same anchor (avoids monotony).

### Scene 1 — Hero · `DemoHero.tsx`
**Anchor:** Aceternity `<Spotlight />` + Magic UI `<AnimatedShinyText />` + Magic UI `<BlurFade>`
**Layout:**
- Full viewport `min-h-screen`, `bg-[--ink]`
- `<Spotlight />` absolute positioned, top-left, gold tint (`fill="#C49B50"`), opacity 0.3
- Eyebrow: "AI-POWERED PROPERTY INTELLIGENCE" wrapped in `<BlurFade delay={0.1}>`
- Headline (h1) in Cormorant Garamond, `clamp(56px, 9.2vw, 168px)`, weight 400, line-height 0.94:
  - Line 1: `<BlurFade delay={0.3}>Honesty is rare.</BlurFade>`
  - Line 2: `<BlurFade delay={0.5}>It comes with <em>Homesty</em>.</BlurFade>`
  - The `<em>Homesty</em>` wraps in `<AnimatedShinyText>` with gold-bright shimmer
- Lead italic Cormorant 24px in `--muted-soft`: "South Bopal & Shela. Ahmedabad's first honest, buyer-side property advisor."
- CTA: `<a href="#begin" className="btn-primary">Begin your HomeSearch →</a>`
- Bottom-left meta: "RERA-VERIFIED · 2026" in 11px Sora uppercase, 0.22em tracking

**Don't:** Don't add a parallax orb. Don't add the SVG grain texture (Spotlight handles atmosphere).

### Scene 2 — Marquee · `DemoMarquee.tsx`
**Anchor:** Magic UI `<Marquee />`
**Items (italic Cormorant 22px, gold ◆ separators):**
- Honest concerns disclosed
- ALL-IN pricing, no surprises
- RERA-verified projects only
- Builder Trust Scores, five-axis
- 1.5% commission, paid only on close
- Built for buyers, not builders

```tsx
<Marquee pauseOnHover className="[--duration:60s] py-6">
  {items.map(item => <span className="mx-12 italic font-serif text-2xl">{item}</span>)}
</Marquee>
```

Wrap in a section with `border-y border-[--line]` and `mask-image` for edge fade.

### Scene 3 — The Problem (3-stage pinned morph) · `DemoProblem.tsx`
**Anchor:** Aceternity `<ContainerScrollAnimation />` OR a custom Framer `useScroll` morph using Magic UI `<WordRotate>` for the cycling phrase
**Recommendation:** Use the custom `useScroll` approach for tighter control. Three stages in one pinned section:
- Stage 1: "Every project has a flaw." (display-xl Cormorant, all white)
- Stage 2: "Most platforms hide it."
- Stage 3: "We **surface** it." (italic gold "surface")

Each stage opacity-and-y morphs as `scrollYProgress` enters its band (`[0, 0.33], [0.33, 0.66], [0.66, 1]`). Pin via `position: sticky` + parent `height: 300vh`.

**On mobile (<880px):** drop pin, stack the three stages vertically with `<BlurFade>` per item.

### Scene 4 — The Proof (3D project card) · `DemoProof.tsx`
**Anchor:** Aceternity `<CardContainer />` + `<CardBody />` + `<CardItem />` (the 3D Card Effect — a *real* 3D card that handles tilt properly, unlike the broken vanilla version)
**Layout:** two-column on `lg:`, single column below.
- Left: eyebrow + h2 ("An *honest* concern, on every card.") + body paragraph
- Right: the 3D card. Uses `<CardItem translateZ={50}>` for the project title, `translateZ={20}` for body content, `translateZ={70}` for the Honest Concern footer (it lifts off the card the most — emphasis through depth)

Inside the card: identical to the actual ProjectCardV2 visual (cream bg, blue photo header with shimmer, Strong Buy pill, ₹6,800/sqft, possession Dec 2030, and the Honest Concern amber footer with ⚠ + 3px left rule).

**Honest Concern subtle pulse:** wrap in Magic UI `<BorderBeam>` with `duration={8}` and gold color, OR keep flat and rely on the `translateZ` depth alone.

### Scene 5 — The 4 Pillars · `DemoPillars.tsx`
**Anchor:** Aceternity `<StickyScroll />` (the Sticky Scroll Reveal component — text scrolls vertically on the left, content swaps on the right)
**Content array:**

```tsx
const pillars = [
  {
    title: 'Honest Concern',
    description: "Every project's flaw, declared upfront — possession risk, construction stage, financial stress.",
    content: <PillarVisual emblem="I" theme="amber" />
  },
  {
    title: 'ALL-IN Price',
    description: 'One number. Basic rate, GST, stamp duty, registration, parking — all of it.',
    content: <PillarVisual emblem="II" theme="green" />
  },
  {
    title: 'Builder Trust Score',
    description: 'Five axes: delivery, RERA, quality, finance, response. From verified data.',
    content: <PillarVisual emblem="III" theme="gold" />
  },
  {
    title: 'OTP-Protected Visit',
    description: 'Token-locked at booking. Builder cannot reroute. Commission protected.',
    content: <PillarVisual emblem="IV" theme="ink" />
  }
]
```

`<PillarVisual />` is a small inline component: a tall card with a Roman numeral, a gold 32px top bar, and a single illustrative motif (could be an inline SVG icon set — keep it minimal). Resist the urge to add stock photos; placeholders are honest, fakes are slop.

### Scene 6 — Trust Score · `DemoTrust.tsx`
**Anchor:** Magic UI `<NumberTicker />` + Aceternity `<BentoGrid>` for the supporting score breakdown
**Layout:**
- Left column: eyebrow + h2 "Not a star rating. A *verified* grade." + body
- Right column: the trust display
  - `<NumberTicker value={78} />` rendered at `clamp(160px, 22vw, 320px)` Cormorant 300, `font-variant-numeric: tabular-nums`
  - `/100` in muted at clamp(48px, 6vw, 84px)
  - "Grade B · Reliable" pill below in green-deep
  - Below the number: a 5-row score-bar component (custom; not a library piece). Each bar: 2px track in `--line`, fill animated 0→target% with `--gold-deep` to `--gold` gradient, staggered `i*0.13` delay. Use `useInView` + `motion.div` with `whileInView` for the trigger.

Optional: wrap the whole right column in `<BentoGrid>` if it makes the layout feel more editorial.

### Scene 7 — Visit Token · `DemoVisitToken.tsx`
**Anchor:** Magic UI `<BorderBeam />` wrapping the token card
**Layout:** centered card on `--paper` background section.
- Eyebrow + h2 "A token that *won't* break."
- Token card (cream bg, 12px radius, Border Beam animated gold beam tracing the perimeter)
- Inside the card:
  - Top row: "VISIT TOKEN" label (left) + "● Locked" status (right, green-deep, pulse)
  - Center: token code "HST-A4B9F2" in 64px Cormorant 500, tabular-nums, characters animate in stagger via Framer (initial `{opacity: 0, y: -16, scale: 1.4}` → `{opacity: 1, y: 0, scale: 1}` with `back.out` easing)
  - Bottom row: "PROJECT: The Planet" + "SLOT: Sat · 11:00 AM"

```tsx
<div className="relative rounded-xl bg-[--cream] p-8 ...">
  <BorderBeam size={250} duration={12} delay={9} colorFrom="#C49B50" colorTo="#E2B86A" />
  {/* token contents */}
</div>
```

### Scene 8 — The 1.5% (Commission) · `DemoCommission.tsx`
**Anchor:** Aceternity `<LampContainer />` — the dramatic conic-light lamp effect, Apple-product-page-tier
**Layout:**
- `<LampContainer>` wraps the whole scene (gold conic light from above)
- Eyebrow: "THE MODEL, IN ONE NUMBER"
- The massive 1.5% number in `clamp(180px, 28vw, 460px)` Cormorant 300 italic, gold:
  - Use Framer Motion: `initial={{ scale: 0.7, opacity: 0, letterSpacing: '0.1em' }}` → `whileInView={{ scale: 1, opacity: 1, letterSpacing: '-0.04em' }}` over 1.8s `ease: 'easeOut'`
- Sub: "Of transaction value. Paid only on close." (italic Cormorant 30px, muted)
- Fine print row: "◆ No application fee · ◆ No advance · ◆ No builder kickbacks" (gold ◆, 13px Sora uppercase 0.12em tracking)

This is the most important "wow" moment in the piece. Lean into the lamp drama.

### Scene 9 — Geography · `DemoGeography.tsx`
**Anchor:** Aceternity `<WorldMap />` with custom `dots` prop centered on India + Magic UI `<AnimatedBeam>` connecting Bopal/Shela area
**Layout:** two-column
- Left: eyebrow + h2 "Hyper-local. *By design.*" + body + 3-row stat list (South Bopal · 42 · Shela · 38 · Bopal · 21)
- Right: cropped world map showing India highlighted, with 2 active dots near Ahmedabad (~23°N, 72.5°E). The WorldMap component takes a `dots` array of `{ start: {lat, lng, label}, end: {lat, lng, label} }` — use this to animate beams between Bopal ↔ Shela.

```tsx
const dots = [
  { start: { lat: 23.0225, lng: 72.5714, label: 'BOPAL' },
    end:   { lat: 22.9897, lng: 72.4858, label: 'SHELA' } }
]
<WorldMap dots={dots} lineColor="#C49B50" />
```

If the WorldMap's default render covers the whole world (it does), wrap it in a `clip-path` or transform-origin to crop visually to India + adjacent. Or zoom CSS-scale the SVG by ~3x and translate to center on Gujarat.

### Scene 10 — Founder Quote · `DemoFounder.tsx`
**Anchor:** Aceternity `<TracingBeam />` (the gold beam that traces along the right edge as you scroll)
**Layout:**
- Cream surface (`--paper`)
- Centered max-width: 960px content
- A massive `"` glyph ghost at top-left, 320px Cormorant, opacity 0.08, gold-deep, pointer-events-none, aria-hidden
- The quote in italic Cormorant `clamp(28px, 3.4vw, 56px)`, line-height 1.25:
  - "I will tell you the *real* problem with every project — even if that means you buy nothing from me."
- Below: "— BALVIR, FOUNDER" in 12px Sora uppercase 0.18em tracking, gold-deep, prefixed by a 32px gold-deep hairline

`<TracingBeam>` lives on the right edge of the section, tracing as the user scrolls — adds editorial weight.

### Scene 11 — Closer · `DemoCloser.tsx`
**Anchor:** Aceternity `<BackgroundBeams />` + Magic UI `<ShimmerButton />`
**Layout:**
- Dark surface (`--ink`), full viewport
- `<BackgroundBeams />` absolute positioned behind content (atmospheric diagonal beams)
- Eyebrow: "WHEN YOU'RE READY"
- h2 in Cormorant 300, `clamp(56px, 8vw, 144px)`:
  - Line 1: "Built for buyers."
  - Line 2: "*Honest* by default."
- `<ShimmerButton>` for the CTA: "Begin your HomeSearch →"
- Below: minimal footer row with "© 2026 Homesty AI LLP · South Bopal · Shela · Ahmedabad" in 11px Sora uppercase 0.14em tracking, muted

---

## CRITICAL CONSTRAINTS

1. **No DB / no API / no auth.** This route works fully offline.
2. **Every scene file is `"use client"`.** Don't try to render Aceternity components from a server component.
3. **Tailwind 4 compatibility:** Aceternity examples often reference Tailwind 3 token names. If `@apply` or class names break, check `tailwind.config.ts` (or the v4 `@theme` block in globals.css) and add the missing values rather than rewriting Aceternity's components.
4. **Fonts:** Cormorant Garamond and Sora must load via `next/font/google` in the root layout. Do NOT @import them in CSS — that's the slow path.
5. **`prefers-reduced-motion`:** Aceternity and Magic UI components mostly respect this via Framer Motion's `useReducedMotion`. For our custom motion (Scene 3 problem morph, Scene 6 score bars, Scene 8 1.5% entrance, Scene 7 token glyph stagger), wrap each in a `useReducedMotion()` check that produces a static endpoint when reduced.
6. **Don't break existing routes.** Run `npm run build` and confirm `/`, `/chat`, `/projects`, `/admin/*` all still build clean. If a globally-applied CSS change (like Cormorant in `<body>`) regresses an existing surface, scope the new fonts to `/demo` only via a layout-scoped className.
7. **Don't fabricate brand assets.** The 3 areas (South Bopal, Shela, Bopal) and counts (42/38/21) are placeholder estimates — leave a `/* TODO: Mama to confirm verified-project counts */` comment so we don't ship a fabricated number to investors.

---

## TESTS

Add a single Playwright smoke test:

```ts
// tests/e2e/demo-route.spec.ts
import { test, expect } from '@playwright/test'

test('demo route loads and reaches the closer', async ({ page }) => {
  await page.goto('/demo')
  await expect(page.locator('h1')).toContainText('Honesty is rare.')
  // Scroll to the bottom; the closer CTA should be visible
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await expect(page.locator('text=Begin your HomeSearch')).toBeVisible()
})
```

Maintain 159/159 baseline (the new test brings it to 160).

---

## SCREEN-RECORDING WORKFLOW (FOR MAMA)

Once deployed:

1. Open `homesty.ai/demo` in Chrome on a 1920×1080 monitor (or set browser zoom to 90% on a 1440p MacBook).
2. Press F11 for full-screen.
3. Mac: ⇧⌘5 → "Record Selected Portion" → drag to cover the viewport → Record.
4. Slowly scroll through (use trackpad or arrow keys) — about 60–90 seconds end-to-end.
5. Stop. The MP4 lives in `~/Desktop`.
6. Trim front/back in QuickTime if needed.
7. Optional: drop into Descript for captioning, or upload directly to LinkedIn / Instagram / pitch deck.

If we want a programmatic export later (Remotion-rendered MP4 with deterministic timing), that's Agent J — separate sprint, post-launch.

---

## REPORT-BACK

When done, append to `docs/SESSION_HANDOFF.md`:

```
- {sha} feat(demo): /demo marketing route — Aceternity + Magic UI scenes
  (Spotlight hero, Sticky Scroll pillars, Lamp commission, Tracing Beam
  founder, Background Beams closer). 11 scenes, 1 commit, +X kB shared
  bundle (lazy-loaded, doesn't affect /chat or /). Tests 160/160.
```

VERDICT FORMAT:
```
[OK] {sha} demo-v2 +{shared kB delta on / and /chat}kB tests 160/160
files: 12 created (11 scenes + 1 layout + 1 page), 0 modified outside /demo
new deps: shadcn config, Aceternity registry, Magic UI registry
known TODOs: real verified-project counts (placeholder), real builder
brand asset for project card photo header (currently gradient-only)
```
