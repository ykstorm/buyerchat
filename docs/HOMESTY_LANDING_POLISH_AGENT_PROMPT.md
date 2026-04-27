# Claude Code Agent Prompt — Landing Page Polish (HOMESTY-LANDING-V2)

> **Fire AFTER `HOMESTY_DEMO_AGENT_PROMPT.md` lands.** That agent installs shadcn + Aceternity + Magic UI registries and the components we need. This agent then surgically applies the same components to the production landing page (`src/app/page.tsx`) — no redesign, just better implementations of what's already there.
>
> Single agent, single commit, ~1.5–2 hours.

---

## SESSION CONTEXT — READ FIRST

1. Read `docs/SESSION_HANDOFF.md` — confirm the demo route shipped clean.
2. Read `docs/AGENT_DISCIPLINE.md` sections 4, 5, 9, 10.
3. Read `Homesty_DESIGN.md` — the type system, color tokens, and "do's and don'ts" govern every choice on this surface.
4. Cross-check `docs/diagnostics/ui-polish-and-motion.md` and `docs/diagnostics/product-vision-gaps.md` — the gaps this agent closes are already audited there. Don't re-audit; execute.
5. `npm run verify` must pass before commit. Baseline after demo agent: 160/160.

## PRINCIPLE

**Keep the landing page minimal. Add luxury through ONE motion-anchor per section, not five.** The brand's signature is editorial calm — if every section has a different effect competing for attention, the brand reads as a tech-demo, not as Pentagram-meets-private-wealth.

The point isn't to make the page louder. The point is to make the page's *answer* land harder — the Honest Concern block, the founder line, the 1.5% promise. Aceternity and Magic UI components are tools to draw the eye to the brand promise, not to decorate the negative space.

---

## SCOPE — WHAT THIS AGENT TOUCHES

**Files (touch ONLY these):**
- `src/app/page.tsx` — surgical edits to existing sections
- `src/app/_components/` — NEW folder for landing-only client components
- `src/app/globals.css` — only if a new design token is needed (most should already exist from the demo agent)
- `prisma` — NO. Don't touch the schema.
- DB queries — read-only via existing `prisma` client; if `page.tsx` is currently `"use client"`, refactor to server component + client child (see step 2 below).

**Files DO NOT touch:**
- `src/components/chat/*` — chat surface is owned by Agent F.
- `src/app/demo/*` — owned by demo agent.
- `src/app/admin/*` — separate concern.
- `src/app/projects/*`, `src/app/builders/*`, `src/app/dashboard/*` — Agent B owns.
- `src/lib/system-prompt.ts`, `src/lib/response-checker.ts` — never touch from a UI agent.

---

## SIX SURGICAL CHANGES (in execution order)

### 1. Replace SplitText character stagger with `<BlurFade>` line stagger (HERO)

**Problem (per `ui-smoothness.md` §1 HIGH):** Current hero uses `motion.span` per *character* on the headline. Cormorant Garamond loads via `display:swap` so on slow networks the buyer sees fallback Georgia render → font-swap cascade → letters spring in. Reads as broken.

**Fix:** Three `<BlurFade>` blocks — eyebrow, headline (whole-line, not per-char), lead paragraph.

```tsx
import { BlurFade } from '@/components/ui/blur-fade'

<section className="hero ...">
  <BlurFade delay={0.1} duration={0.6}>
    <span className="eyebrow">AI-POWERED PROPERTY INTELLIGENCE</span>
  </BlurFade>
  <BlurFade delay={0.3} duration={0.8}>
    <h1 className="display-xl">
      Honesty is rare. <br/>
      It comes with <em>Homesty</em>.
    </h1>
  </BlurFade>
  <BlurFade delay={0.5} duration={0.7}>
    <p className="lead">South Bopal &amp; Shela. Ahmedabad's first honest, buyer-side property advisor.</p>
  </BlurFade>
  {/* CTA wraps in BlurFade with delay 0.7 */}
</section>
```

**Drop entirely:** The character-by-character SplitText animation. Drop the cursor-glow component if it's only on the hero — it adds boot-time motion noise per `ui-smoothness §1 MED`.

### 2. Wrap "is rare." with Magic UI `<AnimatedShinyText>` (HERO ACCENT)

**Why:** The italic gold "rare." is the brand's signature word. Currently it has a CSS keyframe sheen that's fine but generic. `AnimatedShinyText` does the same thing with better easing and pre-tuned timing.

```tsx
import { AnimatedShinyText } from '@/components/ui/animated-shiny-text'

<h1 className="display-xl">
  Honesty is <em><AnimatedShinyText shimmerColor="#E2B86A" duration={3}>rare.</AnimatedShinyText></em>
  <br/>
  It comes with <em>Homesty</em>.
</h1>
```

The italic + gold styling stays in CSS. AnimatedShinyText handles the shimmer overlay only.

### 3. Replace hardcoded `sampleProjects` with DB-driven `<HeroParallax>` (FEATURED PROJECTS)

**Problem (per `product-vision-gaps.md` §2 HIGH):** Landing page has hardcoded `sampleProjects = [...]` with stale prices. If Mama updates a real price in `/admin/projects/[id]/pricing`, the landing page doesn't update. **This is the biggest brand-honesty gap on the page** — we promise verified data, then ship hardcoded numbers.

**Fix:** convert `page.tsx` to a server component, query the DB, and feed real projects into Aceternity's `<HeroParallax>` component (multi-row parallax of cards on scroll — visually impressive, looks expensive, and *every project shown is verified-real*).

**Step A — split page.tsx into server + client:**

```tsx
// src/app/page.tsx (now a SERVER component)
import { prisma } from '@/lib/prisma'
import LandingClient from './_components/LandingClient'

export const revalidate = 300 // refresh every 5 min

export default async function Page() {
  const featured = await prisma.project.findMany({
    where: {
      OR: [
        { allInPrice: { gt: 0 } },
        { pricePerSqft: { gt: 0 } }
      ]
    },
    orderBy: { updatedAt: 'desc' },
    take: 12, // HeroParallax needs ~12 to look full
    select: {
      id: true,
      projectName: true,
      microMarket: true,
      decisionTag: true,
      pricePerSqft: true,
      allInPrice: true,
      builder: { select: { brand: true } }
    }
  })

  return <LandingClient featured={featured} />
}

// src/app/_components/LandingClient.tsx — "use client" with all the existing landing markup
"use client"
import { HeroParallax } from '@/components/ui/hero-parallax'
// ...
export default function LandingClient({ featured }: { featured: Featured[] }) {
  // map DB rows to HeroParallax product shape:
  const products = featured.map(p => ({
    title: `${p.projectName} · ${p.microMarket}`,
    link: `/projects/${p.id}`,
    thumbnail: '/og/project-card.svg' // placeholder; replace if/when real images exist
  }))
  return (
    <>
      <HeroSection />
      <Marquee />
      <HeroParallax products={products} />
      <Pillars />
      <HonestConcernExample />
      <FounderQuote />
      <Closer />
    </>
  )
}
```

**Step B — placeholder thumbnails:** HeroParallax expects images. Until we have real project photos, ship a single SVG placeholder at `/public/og/project-card.svg` that renders the project name + "Verified by Homesty AI" on a gradient. Don't fake stock photos — the placeholder is honest, a fake is slop. Leave a `// TODO: real project thumbnails` comment.

**Step C — replace existing 3-card "featured projects" markup** in the old page with the `<HeroParallax>`. The old hardcoded section is fully gone.

### 4. Swap CSS marquee for Magic UI `<Marquee>` (TRUST STRIP)

**Problem:** Current marquee uses CSS keyframes — works, but no hover-pause, no edge mask, no ability to layer two rows in opposite directions.

**Fix:**

```tsx
import { Marquee } from '@/components/ui/marquee'

const promises = [
  'Honest concerns disclosed',
  'ALL-IN pricing, no surprises',
  'RERA-verified projects only',
  'Builder Trust Scores, five-axis',
  '1.5% commission, paid only on close',
  'Built for buyers, not builders'
]

<section className="border-y border-[--line] bg-white/[0.015] py-7">
  <Marquee pauseOnHover className="[--duration:50s]">
    {promises.map(p => (
      <span key={p} className="mx-12 font-serif italic text-[22px] text-[--cream]">
        {p}
        <span className="ml-12 text-[8px] text-[--gold]">◆</span>
      </span>
    ))}
  </Marquee>
</section>
```

Magic UI's Marquee handles the edge mask, hover pause, and reverse-direction toggle natively.

### 5. Wrap the Honest Concern example block with `<BorderBeam>` (THE BRAND-DEFINING BLOCK)

**Why this matters most:** The Honest Concern example block (the one that quotes a real-feeling concern: "Builder is at early construction — possession push of 6 months is realistic") is the **single most brand-defining paragraph on the entire site**. Every other section is preamble; this is where the buyer goes "ohhh, they're actually serious."

It currently renders as a static amber-bordered card. Add a slow gold Border Beam tracing the perimeter — *not* the typical 4-second beam, but a long 12-second one so it reads as ambient, not gimmicky.

```tsx
import { BorderBeam } from '@/components/ui/border-beam'

<section className="relative ...">
  <div className="relative rounded-xl bg-[--amber-soft] border border-[rgb(99_56_6_/_0.12)] p-10">
    <BorderBeam
      size={200}
      duration={12}
      delay={2}
      colorFrom="#C49B50"
      colorTo="#E2B86A"
    />
    {/* existing Honest Concern example content unchanged */}
  </div>
</section>
```

The beam is barely-noticeable — gold on amber — but it makes the block read as "alive" without breaking the editorial calm. **Don't add BorderBeam to any other section.** It loses meaning if it's everywhere; it's reserved for this one block as the signal that this is the moral anchor of the page.

### 6. Add Aceternity `<TracingBeam>` to founder quote + `<BackgroundBeams>` to closer

**Founder quote:**

```tsx
import { TracingBeam } from '@/components/ui/tracing-beam'

<TracingBeam className="px-6">
  <section className="founder-section ..."> {/* existing markup */}
    <blockquote className="...">
      I will tell you the <em>real</em> problem with every project — even if that means you buy nothing from me.
    </blockquote>
    <cite>— Balvir, founder</cite>
  </section>
</TracingBeam>
```

The TracingBeam draws a gold line down the page edge that follows scroll progress as you read the quote. Editorial gravitas.

**Closer:**

```tsx
import { BackgroundBeams } from '@/components/ui/background-beams'
import { ShimmerButton } from '@/components/ui/shimmer-button'

<section className="relative bg-[--ink] py-60 text-center overflow-hidden">
  <BackgroundBeams />
  <div className="relative z-10">
    <span className="eyebrow">When you're ready</span>
    <h2 className="display-lg">
      Built for buyers. <br/>
      <em>Honest</em> by default.
    </h2>
    <ShimmerButton background="hsl(0 0% 98%)" shimmerColor="#C49B50">
      <span className="text-[--ink] font-medium">Begin your HomeSearch →</span>
    </ShimmerButton>
  </div>
</section>
```

BackgroundBeams provides atmospheric diagonal-line motion that adds depth without busy-ness. ShimmerButton replaces the existing CTA — same destination, sharper feedback.

---

## WHAT NOT TO TOUCH ON THE LANDING PAGE

Be aggressively conservative on these — they're already on-brand and don't need any added motion:

1. **Philosophy pillars (4-box section).** Already minimal, already on-brand. **Do not** wrap in StickyScrollReveal or any other component. The current static reveal is correct restraint. The skill says: "A style done at 30% reads as hesitant; at 80% it reads as deliberate." Pillars at minimum is the deliberate choice here.

2. **Type system.** Cormorant + Sora are locked. Don't introduce a third font even if some Aceternity component example uses Inter — override it.

3. **Color palette.** Don't add purple, cyan, or any hue not in `Homesty_DESIGN.md` § 2. If an Aceternity component ships with a default purple gradient (some do), explicitly pass color props to override to gold/amber/ink.

4. **Existing copy.** Don't rewrite headlines or paragraphs. We're polishing implementation, not redesigning the message.

---

## CRITICAL CONSTRAINTS

1. **Tailwind 4 + Aceternity:** some Aceternity components reference Tailwind 3 utility classes that don't exist by default in v4. If a component breaks, add the needed utility to `globals.css` `@theme` block — don't delete the component or rewrite it inline.

2. **CSS variable naming:** Aceternity's components often reference variables like `--background`, `--foreground` from the shadcn defaults. Make sure `globals.css` has these wired to our `--ink` / `--cream` so the components inherit our brand palette.

   ```css
   :root {
     --background: var(--ink);   /* dark default for landing */
     --foreground: var(--cream);
   }
   ```

3. **`"use client"` boundary:** The data fetch lives in the new `page.tsx` server component. The visual components (HeroParallax, BorderBeam, etc.) must render inside the `LandingClient` client component child. Don't try to render Aceternity components from a server context.

4. **Preserve SEO:** Root layout's metadata is unchanged. The H1 stays "Honesty is rare. It comes with Homesty." Don't move or rename it.

5. **`prefers-reduced-motion`:** All Aceternity and Magic UI components respect Framer Motion's `useReducedMotion()` hook by default. Verify by simulating reduced-motion in Chrome DevTools (Rendering panel → Emulate CSS prefers-reduced-motion: reduce). The page should still be fully usable, with motion endpoints static.

6. **Performance:** Adding HeroParallax, BorderBeam, TracingBeam, BackgroundBeams, Marquee, AnimatedShinyText, BlurFade, and ShimmerButton will add ~30-50 kB gzipped to the landing bundle. Verify `npm run build` shows root `/` route under 400 kB First Load. If it goes higher, dynamic-import the non-critical components (BackgroundBeams, TracingBeam) via `next/dynamic` with `ssr: false`.

---

## TESTS

1. Maintain 160/160 baseline (after demo agent shipped its smoke test).
2. Add a smoke test for the DB-wired featured projects:

```ts
// tests/e2e/landing-featured.spec.ts
import { test, expect } from '@playwright/test'

test('landing renders DB-wired featured projects', async ({ page }) => {
  await page.goto('/')
  // HeroParallax mounts ~12 cards; verify at least 6 are visible after load
  const cards = page.locator('[data-hero-parallax-product]') // adjust selector to match Aceternity's actual data attribute
  await expect(cards).toHaveCount(12, { timeout: 5000 }).catch(() => expect(cards.first()).toBeVisible())
})
```

If Aceternity's HeroParallax doesn't expose a stable selector, fall back to checking that at least one project's name from the DB appears on the page.

---

## REPORT-BACK

Append to `docs/SESSION_HANDOFF.md`:

```
- {sha} feat(landing): polish pass with Aceternity + Magic UI —
  BlurFade hero stagger (kills SplitText CLS), AnimatedShinyText
  on "rare." accent, DB-wired HeroParallax (closes hardcoded
  sampleProjects gap from product-vision-gaps §2), Magic UI
  Marquee with hover-pause, BorderBeam on Honest Concern block,
  TracingBeam on founder quote, BackgroundBeams + ShimmerButton
  on closer. Pillars unchanged (intentional minimalism).
```

VERDICT FORMAT:
```
[OK] {sha} landing-v2 +{kbDelta}kB tests {pass}/{total}
files: src/app/page.tsx (split into server + client), 1 new client
component, 0 components touched outside of /demo and /
new deps: none (all components installed by demo agent)
SEO: H1 unchanged, metadata unchanged, sitemap unaffected
known TODOs: real project thumbnails for HeroParallax (placeholder
  SVG at /public/og/project-card.svg), real builder photos
```

---

## WHAT DOES "MAKING OUR ANSWER SEEN" MEAN HERE

Balvir asked for "rich luxurious aesthetic while minimalism but making our answer seen."

The answer Homesty gives is: **honest, verified, hyper-local, 1.5%.** Across the landing page, the agent's job is to make those four things land harder, not to add visual noise.

- **Honest** → BorderBeam on Honest Concern block. The one place luxury motion is justified.
- **Verified** → DB-wired HeroParallax with real project names. The product *is* the proof.
- **Hyper-local** → no new component needed; existing copy mentions South Bopal & Shela; don't add a map (geography lives on /demo).
- **1.5%** → no new component on landing; the founder quote and the closer carry it. The Lamp moment lives on /demo.

If the agent finds itself adding a component to a section that doesn't directly serve one of those four answers — stop and revert. Restraint is the brand.
