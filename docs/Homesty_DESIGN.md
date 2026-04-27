# Homesty.ai — DESIGN.md

> Single source of truth for Homesty AI's visual language. This file follows the [awesome-claude-design](https://github.com/VoltAgent/awesome-claude-design) 9-section format. Drop into [claude.ai/design](https://claude.ai/design) to scaffold a full design system, or use it as the design reference for any agent (Claude Code, Cursor, Stitch) building Homesty surfaces.
>
> **Brand short:** AI-powered, buyer-side property intelligence platform for South Bopal & Shela, Ahmedabad. Honest by default. Earns 1.5% only on close.

---

## 1. Visual Theme & Atmosphere

**Direction:** Editorial luxury × structural modernism. Pentagram lineage with a Kenya Hara whisper. Apple's product-page calm meets a serious literary magazine.

**Mood keywords:** *honest · precise · quiet · editorial · grown-up · slightly nocturnal*

**Density:** Generous. Defaults to 70% negative space at hero, 50% at content sections, 35% at data-dense screens. Breathing space is the brand.

**Light/dark:** **Dark by default** — the primary surface is ink black with cream accents, breaking to cream sections for emotional pacing (hero / problem / commission = dark; proof / pillars / visit / founder = cream alternation). Light mode exists for admin/dashboard but is never the marketing-page default.

**Why this direction:** real estate marketing in India defaults to two failure modes — gaudy gold-and-red brochure aesthetic (low-trust) or sterile portal-grid (Magicbricks/99acres, generic). Homesty is the buyer-side honest broker; the visual must read as *deliberate, expensive, calm, considered* — like a private wealth firm or a luxury watch publication, not a real-estate listing.

**The single thing someone should remember:** Cormorant Garamond italic gold accent words on ink-black, with one massive serif number per section as the punctuation.

---

## 2. Color Palette & Roles

CSS variables, in `oklch()` where possible for harmonious math.

```css
:root {
  /* ── Surfaces ──────────────────────────────────── */
  --ink:           #0E0D0C;   /* primary dark surface, hero / commission / closer */
  --ink-soft:      #1C1917;   /* secondary dark surface, geography / chat shell */
  --paper:         #F5F1EA;   /* primary cream surface, proof / visit / founder */
  --cream:         #FAFAF8;   /* lighter cream, foreground text on dark */

  /* ── Brand accent ──────────────────────────────── */
  --gold:          #C49B50;   /* primary brand accent, all italic display words */
  --gold-bright:   #E2B86A;   /* hover / sheen highlight */
  --gold-deep:     #8B6F32;   /* on-cream gold (better contrast on light surfaces) */

  /* ── Functional ────────────────────────────────── */
  --amber-soft:    #FAEEDA;   /* Honest Concern card background */
  --amber-deep:    #633806;   /* Honest Concern text + warning markers */
  --green-deep:    #0F6E56;   /* Strong Buy decision tag, OTP verified */
  --green-soft:    #E1F5EE;   /* Strong Buy pill background */
  --blue-deep:     #1B4F8A;   /* Buy w/ Cond decision tag, price numerals */
  --red-deep:      #791F1F;   /* Wait / Avoid decision tag */

  /* ── Neutrals (text + lines) ───────────────────── */
  --muted:         #8A8377;   /* tertiary text on dark */
  --muted-soft:    #A8A29E;   /* tertiary text on cream */
  --line:          oklch(98% 0 0 / 0.08);   /* hairline on dark */
  --line-dark:     oklch(15% 0 0 / 0.08);   /* hairline on cream */
}
```

**Role mapping:**

| Role | Token | Where it appears |
|---|---|---|
| Primary surface (dark) | `--ink` | Hero, commission moment, closer, admin shell |
| Secondary surface (dark) | `--ink-soft` | Geography section, chat shell, modal backdrops |
| Primary surface (light) | `--paper` | Proof section, visit token, founder quote |
| Brand accent | `--gold` | Italic display words, score-bar fills, dots, accent rules |
| Honesty signal | `--amber-soft` / `--amber-deep` | Honest Concern blocks — the *moment of truth* on every project card |
| Decision: Strong Buy | `--green-deep` / `--green-soft` | "Strong Buy" pills, OTP-verified badges |
| Decision: Buy w/ Cond | `--blue-deep` | "Buy w/ Cond" pills, price numerals |
| Decision: Wait/Avoid | `--red-deep` | "Wait" / "Avoid" pills (rare; used sparingly) |

**Hard rules:**
- **Never use pure black `#000000`.** Always `--ink` (warm dark) — pure black reads as "screen off," not "premium."
- **Never use pure white `#FFFFFF`.** Always `--paper` or `--cream` (warm whites). Pure white reads as "default Material," not "editorial."
- **One accent per moment.** Gold is reserved for italic display accent words and key scoring elements. Amber is reserved for Honest Concern ONLY (don't use it elsewhere — it dilutes the signal). Green is reserved for Strong Buy and OTP-locked status.
- **Decision colors are data-driven, never decorative.** A button rendered green means "Strong Buy on this project." A button rendered green for visual reasons is a bug.
- **No gradients on backgrounds** except: (a) gold sheen on italic accent words, (b) score-bar fills (gold-deep → gold), (c) the soft radial in the commission section. No purple-to-cyan landing-page slop. No mesh gradients. Ever.

---

## 3. Typography Rules

Two families. Two roles. Zero exceptions.

```css
:root {
  --font-serif: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
  --font-sans:  'Sora', system-ui, sans-serif;
  --font-mono:  'JetBrains Mono', ui-monospace, monospace; /* numbers + token codes only */
}
```

**Why these:** Cormorant Garamond is editorial, distinctly calligraphic in italic, free on Google Fonts, pairs naturally with Hindi/Devanagari extension fonts for future Hinglish typography. Sora is geometric without being generic; sharper than DM Sans, warmer than Inter (which is on the skill's "avoid" list anyway).

**Type scale (display + body):**

| Token | Size | Family | Weight | Use |
|---|---|---|---|---|
| `display-mega` | `clamp(180px, 28vw, 460px)` | serif | 300 | The 1.5% number, hero "Honesty is rare." |
| `display-xl` | `clamp(56px, 9.2vw, 168px)` | serif | 400 | Hero h1, section title moments |
| `display-lg` | `clamp(48px, 7vw, 120px)` | serif | 400 | Visit-token section, geography |
| `display-md` | `clamp(40px, 5.6vw, 88px)` | serif | 400 | Proof section, pillars title |
| `display-sm` | `clamp(36px, 4.4vw, 64px)` | serif | 400 | Trust score callout, founder quote |
| `body-large` | `clamp(18px, 1.6vw, 24px)` | serif | 300 italic | Subheads, lead paragraphs |
| `body-base` | `16px` | sans | 300 | All running text |
| `body-small` | `13px` | sans | 400 | UI labels, dense data |
| `eyebrow` | `11px` | sans | 500 | Section eyebrows, all-caps + 0.32em tracking |
| `data-large` | `clamp(48px, 6vw, 84px)` | serif | 300 | Trust score "78" out-of "100" |
| `data-token` | `64px` | serif | 500 | OTP token glyph code "HST-A4B9F2" |

**Italic = gold.** Every italic Cormorant word in a display position is rendered in `--gold` (or `--gold-deep` on cream surfaces). This is the brand's strongest signature move. Don't break it.

**Do:**
- Use Cormorant italic on the *one* accent word per section: "Honesty is **rare**" / "An **honest** concern" / "1.**5**%" / "**Built** for buyers" / "Hyper-local. **By design**".
- Use the `eyebrow` style above every section heading. It's the editorial section-numbering equivalent.
- Lead paragraphs in `body-large` italic serif — quiet authority.

**Don't:**
- Mix Playfair, Times New Roman, Georgia, or any other serif alongside Cormorant. One serif. One sans. That's the system.
- Use bold weights on display type (>500). Cormorant Garamond is calligraphic — bold-bold-bold reads as a wedding card. Lean on weight 300 and 400.
- Use ALL CAPS on serif display type. Eyebrows can be all-caps (sans). Display can't (serif).
- Underline on body. We use weight contrast, italic, color — never underline outside `<a>` tags.

**Number rendering:** Use `font-variant-numeric: tabular-nums` on every numeric block (price, score, token). Misaligned digits in a "we're precise" brand is a self-own.

---

## 4. Component Stylings

### Buttons

Two shapes only. Drop everything else.

| Variant | Shape | Use |
|---|---|---|
| Primary CTA (page-level) | `rounded-md` (6px) | "Begin your HomeSearch", landing CTAs, Closer CTA |
| Action pill (in-card) | `rounded-full` | "Book Visit", "Save", "Compare", token actions |

```css
/* Primary CTA — landing/closer */
.btn-primary {
  display: inline-flex; align-items: center; gap: 14px;
  padding: 18px 36px;
  background: var(--cream);
  color: var(--ink);
  font: 500 14px/1 var(--font-sans);
  letter-spacing: 0.02em;
  border-radius: 6px;
  transition: transform 280ms cubic-bezier(0.2, 0.9, 0.3, 1),
              box-shadow 280ms ease;
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 48px oklch(70% 0.15 80 / 0.18); /* warm gold haze */
}
.btn-primary .arrow {
  transition: transform 280ms cubic-bezier(0.2, 0.9, 0.3, 1);
}
.btn-primary:hover .arrow { transform: translateX(6px); }

/* Action pill — in-card */
.btn-pill {
  padding: 10px 22px;
  background: var(--blue-deep);   /* default; decision-color overrides for ProjectCardV2 */
  color: var(--cream);
  border-radius: 999px;
  font: 500 13px/1 var(--font-sans);
  letter-spacing: 0.01em;
}
```

**Hard rules:**
- Decision-color buttons in artifact cards: green = Strong Buy, blue = Buy w/ Cond, neutral grey = Wait/Avoid. Never decorative.
- Disabled state: `opacity: 0.5` plus a muted background swap, not `opacity: 0.3` (which reads as broken on dark surfaces).
- Focus-visible: `2px ring var(--blue-deep)/50` with `2px offset`. Always. No keyboard-user is left guessing.

### Cards

Three card archetypes. Anything else is a layout div.

**ProjectCardV2 (artifact card):**
```
border-radius: 14px
background: var(--cream)
photo header: 140px gradient (ink-blue → blue-deep), shimmer sweep on mount
body padding: 22px
honest-concern footer: amber-soft bg, amber-deep 3px left rule, 9px uppercase label "HONEST CONCERN" with ⚠ glyph
shadow: 0 60px 120px oklch(0% 0 0 / 0.5), 0 8px 24px oklch(0% 0 0 / 0.2)
```

**Pillar card (marketing):**
```
border-radius: 12px
background: var(--cream)
border: 1px solid var(--line-dark)
top accent: 32px × 2px gold bar at top-left
padding: 48px 40px
roman numeral pillar number in gold-deep
serif title 44px, body 15px sans 1.65 line-height
```

**Token card (visit confirmation):**
```
border-radius: 12px
background: var(--cream)
border: 1px solid var(--line-dark)
shadow: 0 40px 80px oklch(0% 0 0 / 0.12)
center: token code in 64px serif weight 500, letter-spacing 0.04em, monospace tabular-nums
status pulse on "Locked" indicator, green-deep
```

**Hard rules:**
- **Never use rounded-corner cards with left-border accent stripes.** That's the most-used AI-design slop. Use 32px gold bar at top instead, or no accent at all.
- **No 3D tilt.** Mouse-tracked rotateX/rotateY on hover causes motion sickness in 320px-wide cards (we tested it; it loses the buyer). Use Aceternity's `3D Card Effect` only on cards >480px wide and only when explicitly intended.
- **Cards on dark surfaces:** add 60px y-offset shadow to lift them. On cream, 40px is enough.

### Inputs

Single style, used in chat input, capture forms, admin pricing.

```css
.input {
  height: 48px;
  padding: 0 18px;
  background: oklch(98% 0 0 / 0.04);  /* glass on dark */
  color: var(--cream);
  border: 1px solid var(--line);
  border-radius: 6px;
  font: 400 16px/1 var(--font-sans);  /* 16px prevents iOS zoom on focus */
  transition: border-color 200ms ease, background 200ms ease;
}
.input:focus { border-color: var(--gold); outline: none; }
.input::placeholder { color: var(--muted); }
```

### Pills (status / decision tags)

```
9px label uppercase + 0.18em tracking
6px circular dot (matching color)
padding: 6px 12px
border-radius: 999px
```

Color combinations:
- Strong Buy: `bg: --green-soft` / `text: #085041` / `dot: #34D399`
- Buy w/ Cond: `bg: #E6F1FB` / `text: #0C447C` / `dot: #60A5FA`
- Wait: `bg: #FAEEDA` / `text: #633806` / `dot: #FBBF24`
- Avoid: `bg: #FCEBEB` / `text: var(--red-deep)` / `dot: #F87171`

### Score bars

Used for trust scores, progress.

```
height: 2px
track: oklch(98% 0 0 / 0.08)
fill: linear-gradient(90deg, var(--gold-deep), var(--gold))
animation: width 0 → target over 1.3s, ease 'expo.out', staggered i*0.13s
```

---

## 5. Layout Principles

**Container:** `max-width: 1280px`. Above 1280, content centers; viewport extras stay neutral.

**Spacing scale:** `4 / 8 / 12 / 16 / 22 / 32 / 48 / 64 / 96 / 144 / 200 / 240 / 320`. Anything not on the scale is wrong. (px, not rem — designers think in px on this brand.)

**Section padding (vertical):**
- Hero: `100svh` minimum height, padded top 120px nav, bottom 96px
- Marketing sections: `200px` top + bottom on dark, `240px` on cream (cream "feels" tighter)
- Compact data sections (admin / chat): `48px`

**Grid rhythm:**
- Hero / closer: single column, content centered or left-flush, max 760px text width
- Two-column proof / trust / geography: `1fr 1fr`, `gap: 96px`, on `>1024px` only — single column at smaller
- Pillars (horizontal pinned scroll): each card 480px wide, gap 64px, padding 8vw on the rail

**Text width:** body paragraphs cap at 480px. Captions cap at 320px. Display headlines have no cap (they're meant to fill).

**Section headers:** every section gets an eyebrow (11px sans uppercase, 0.32em tracking) above the display heading. Eyebrow is `--gold` on dark, `--gold-deep` on cream.

**Hairlines:** `1px solid var(--line)`. Use to separate marquee top/bottom, footer rows, table sections. Never use `2px` lines — that reads as "border emphasis," which is admin UI, not editorial.

**Negative space rule:** if you can remove one element from a hero or section without losing meaning, remove it. The brand reads as "considered" because we're aggressive about subtraction.

---

## 6. Depth & Elevation

Three elevation levels. Don't invent more.

| Level | Token | Shadow value | Use |
|---|---|---|---|
| 0 | flat | `none` | Body surfaces, marquee, founder section |
| 1 | resting | `0 8px 24px oklch(0% 0 0 / 0.12)` | Pillar cards, token cards on cream |
| 2 | lifted | `0 40px 80px oklch(0% 0 0 / 0.12)` | Token card focal, modal backdrops |
| 3 | hero | `0 60px 120px oklch(0% 0 0 / 0.5), 0 8px 24px oklch(0% 0 0 / 0.2)` | ProjectCardV2 in proof section, hero artifact |

**Hard rules:**
- **No drop shadows on dark surfaces** unless the element is cream (cards in dark sections). Shadows exist to lift surfaces above their base — there's no "above" on a flat dark.
- **No glow effects.** Aceternity's spotlight, lamp, and beam components count as atmospheric lighting (allowed); but `box-shadow: 0 0 32px gold` on every gold element is slop. The gold sheen on italic display words is the *only* "glow" allowed.
- **Z-index scale:** `0` content, `10` nav, `40` toast, `80` modal backdrop, `100` modal foreground. Don't use `z-index: 99999`.

---

## 7. Do's and Don'ts

### DO

- Commit to ink black + cream + gold. Three colors carry the brand. Add a fourth only when functional (decision color, status color).
- Lead every section with the eyebrow + display heading + lead-italic-paragraph triplet. Editorial pacing.
- Use one massive serif moment per section as visual punctuation: "78", "1.5%", "HST-A4B9F2". The eye needs an anchor.
- Render numbers in tabular-nums monospaced sans OR serif — never proportional.
- Use Cormorant italic + gold for accent words. It's the signature move.
- Animate from invisible to visible with patience — `expo.out` curves over `0.8–1.4s`. Slower than feels right.
- Respect `prefers-reduced-motion`. Wrap every animation behind a guard.
- Use Hindi/Hinglish in chat surfaces (per brand voice rules) but keep marketing-page copy English-first; demo for Indian buyers can be Hinglish at section headlines only.

### DON'T

- Don't use Inter, Roboto, Arial, system-ui as the primary font. Sora + Cormorant. Period.
- Don't use purple→cyan gradients. Don't use blur(40px) on coloured circles to fake "ambient glow." That's 2022 SaaS slop.
- Don't render emojis in user-facing UI. Lineart SVGs only.
- Don't use rounded-corner cards with left-border accent stripes (the canonical AI-slop pattern).
- Don't show the same arrow-pulse animation on every CTA. The hero CTA and final CTA need different motion vocabulary.
- Don't auto-play audio, use parallax that exceeds 0.4× scroll velocity, or build sections >100vh tall except for pinned scroll-driven scenes.
- Don't use mouse-tracked 3D card tilt on cards <480px wide. Motion-sick UX.
- Don't use the word "stunning," "beautiful," or "amazing" anywhere in product copy. The product is *honest*, *precise*, *useful*. Adjectives that mean nothing erode trust.

---

## 8. Responsive Behavior

**Breakpoints (matches Tailwind defaults, used as conventions):**

| Token | Width | Treatment |
|---|---|---|
| `xs` | <480px | Hero h1 down to 56px, single-column everywhere, pillars stack vertically |
| `sm` | 480–767px | Pillars stack with snap-scroll, marquee speed 1.5x to compensate for shorter loop |
| `md` | 768–1023px | Two-column proof/trust collapses to single (768px is too narrow for 96px gap + two readable text columns) |
| `lg` | 1024–1279px | Full two-column, horizontal pillar pinned scroll engages |
| `xl` | ≥1280px | Container caps at 1280px; viewport extras get neutral surface (`--ink` or `--paper` per section) |

**Touch targets:** ≥44×44px always. Modal close, chevrons, mobile menu — bump up where needed.

**Typography scaling:** display sizes use `clamp()` (already in section 3 above), so scale is fluid by viewport without breakpoint cutovers. Cleaner than `text-[40px] md:text-[80px]` Tailwind chains.

**Pinned scroll on mobile:** `<880px`, switch from horizontal pinned scroll (pillars, problem) to vertical stacked sections with `BlurFade` per item. Keep the narrative; drop the pin gymnastics.

**iOS-specific:**
- `-webkit-text-size-adjust: 100%` on `html`
- All input fonts `≥16px` (anything smaller triggers iOS zoom-on-focus)
- Use `100svh` not `100vh` for hero; `dvh` for chat surfaces (handles keyboard correctly)
- `visualViewport` listener on chat input for keyboard awareness

**Reduced motion:** all GSAP/Framer scroll-pin sections degrade gracefully — show all states stacked, drop animations. Never rely on motion to deliver information.

---

## 9. Agent Prompt Guide

Reusable prompts to embed in `SKILL.md` or hand to a coding agent.

### When asked to build a marketing page or section

```
Build using Aceternity UI + Magic UI components on top of the existing
shadcn/ui foundation. The file lives at app/<route>/page.tsx (Next.js
App Router, "use client" only when the section needs Framer Motion
client-side hooks).

System anchors (do not deviate without explicit instruction):
- Surface: --ink (#0E0D0C) on dark sections, --paper (#F5F1EA) on
  cream sections. Alternate dark/cream/dark to create emotional pacing.
- Brand accent: --gold (#C49B50) reserved for italic Cormorant accent
  words and key data emphasis. NEVER decorative.
- Type: Cormorant Garamond display (weight 300/400, never bold), Sora
  body. ONE italic gold accent word per section.
- Spacing: 200/240px section vertical padding. 96px column gap on
  two-column. Container caps at 1280px.

Each section must follow this pattern:
  <eyebrow> · <display-heading-with-one-italic-gold-accent> ·
  <body-large-italic-lead> · <content> · <quiet-CTA-or-stat-anchor>
```

### When asked to add an artifact card / data card

```
Cream surface (--paper). Border 1px var(--line-dark), radius 14px.
Title in Cormorant 22-32px weight 500. Decision tag pill (Strong Buy/
Buy w/ Cond/Wait), color from data not aesthetics. Honest Concern footer
in --amber-soft with --amber-deep 3px left rule and uppercase 9px label
"HONEST CONCERN" prefixed by ⚠. Footer is the moral anchor of the card —
never omit, never style differently per project.

NEVER use rounded-corner card with left-border accent stripe pattern.
NEVER use mouse-tracked 3D tilt unless card width >= 480px.
Always include focus-visible rings on action buttons.
```

### When asked to add motion

```
Default to Framer Motion (already in tree). For complex scroll-driven
sections, prefer Aceternity components over hand-rolled GSAP+Lenis:
- Hero atmosphere → Aceternity Spotlight + Magic UI BlurFade
- Pinned section morph → Aceternity Container Scroll Animation
- Two-column scroll-reveal → Aceternity Sticky Scroll Reveal
- Floating ambient lines → Aceternity Background Beams
- Marquee → Magic UI Marquee (NOT hand-rolled CSS animations)
- Number animation → Magic UI Number Ticker
- Border accent → Magic UI Border Beam
- Connecting two elements → Magic UI Animated Beam
- Geographic emphasis → Aceternity World Map (region-cropped)
- Tracing on scroll → Aceternity Tracing Beam
- Dramatic moment (e.g. 1.5%) → Aceternity Lamp Container

Easing: expo.out for entrances, expo.inOut for exits. Duration 0.8–1.4s
on display motion, 0.18–0.3s on UI feedback. Never use spring on exit
animations (exits should feel quick + decisive, not bouncy).

Wrap every motion in `useReducedMotion()` (framer-motion). Reduced
motion = static endpoints, no animation.
```

### When asked to add Hinglish copy

```
- Roman alphabet only. NEVER Devanagari or Gujarati script.
- Real estate terms in English: 3BHK, sqft, lakh, crore, RERA.
- Self-reference always "Homesty AI" or "AI" in third person, never
  first-person (no I/me/my/main/mera/maine).
- "aap/aapke/aapko" only. NEVER "tu/tum/tera/tujhe".
- Casual "bhai" can coexist with "aap." Sir/ji used sparingly.
- Mirror buyer's casualness — formal English buyer gets formal English,
  casual Hinglish buyer gets casual Hinglish.
```

### When asked to validate an output is on-brand

```
Checklist:
[ ] Surface is --ink or --paper (no pure black/white)
[ ] Body has Sora, display has Cormorant Garamond — no third font
[ ] Exactly one italic gold accent word per section
[ ] Eyebrow above each display heading (11px uppercase 0.32em sans)
[ ] No purple→cyan gradients, no aggressive shadows, no emoji in UI
[ ] No rounded-corner cards with left-border accent stripe
[ ] No 3D tilt on cards <480px
[ ] Touch targets ≥44px
[ ] Input font ≥16px (iOS zoom prevention)
[ ] prefers-reduced-motion respected
[ ] Honest Concern always present on project cards (amber)
[ ] Decision tag colors driven by data, not aesthetics
[ ] No "stunning/beautiful/amazing" in copy

If any unchecked, the output is not on-brand. Fix before shipping.
```

---

## Appendix: brand voice in one screen

**The promise:** *Honesty is rare. It comes with Homesty.*

**The product:** AI-powered, buyer-side property advisor. South Bopal & Shela, Ahmedabad.

**The proof:** Every project shows its honest concern. Every price is ALL-IN. Every builder has a five-axis trust score. Every visit is OTP-locked.

**The model:** 1.5% commission, paid only on close. No ads. No builder kickbacks. No hidden fees.

**The voice:** Quiet. Editorial. Confident. Never breathless. Never apologetic. Hinglish is fine in chat — formal English in marketing is fine too. The product is the same either way.

**The visual:** Ink black. Cream. One gold accent word per section. Cormorant italic where it matters. Sora body. Two cards. Two buttons. Three elevations. No more.

That's the system. Hold the line.
