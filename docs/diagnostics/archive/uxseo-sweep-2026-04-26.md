# UX / SEO / Performance Sweep — 2026-04-26 (P2-WAVE2)

Stack: Next.js 15.2.9, React 19, Tailwind 4, Framer Motion 12.

Build snapshot: `/chat` route = **298 kB First Load JS** (down from 323 kB
target was 280 kB → still ~6% over). Other routes 217–268 kB.

---

## Top 5 ship-this-week fixes

| # | Fix | Severity | File | ETA |
|---|---|---|---|---|
| 1 | `prefers-reduced-motion` guards on Framer Motion animations | P1 | `ChatCenter.tsx`, `page.tsx`, `artifacts/*` | 30 min |
| 2 | iOS `visualViewport` listener so VisitBooking CTA stays visible above keyboard | P2 | `src/components/chat/artifacts/VisitBooking.tsx` | 40 min |
| 3 | `focus-visible:ring-*` on artifact card buttons (a11y) | P2 | `ProjectCardV2.tsx`, `ComparisonCard.tsx`, `CostBreakdownCard.tsx` | 25 min |
| 4 | Finish LazyMotion in ChatCenter (full `m` import still present) | P2 | `src/app/chat/chat-client.tsx`, `src/components/chat/ChatCenter.tsx` | 20 min |
| 5 | `robots: { index: false }` on `/dashboard` + `/auth/signin` | P1 | `dashboard/layout.tsx`, `auth/signin/page.tsx` | 10 min |

---

## /chat bundle deep dive

Current First Load JS = **298 kB** (target 280 kB). Path to target:

1. **LazyMotion finalize** — ChatCenter still imports full `m` from
   framer-motion. Win: ~12 kB. Effort: 20 min.
2. **ReactMarkdown lazy import** — defer to first message. Win: ~8 kB.
   Effort: 30 min.

Together: **278 kB** ✓ under target.

Other split candidates (lower priority):
- Decision-engine could be moved server-only (~8 kB win, 25 min, med risk)

Already split (don't re-split): artifact renderers via `next/dynamic`
with skeletons, AI SDK + OpenAI client (already minimal).

---

## Mobile UX issues

### Critical (P1)
- **iOS keyboard covers VisitBooking CTA**. Modal uses `bottom: calc(88px + env(safe-area-inset-bottom))` which doesn't react to keyboard-induced viewport shrink. Fix: `visualViewport` listener + CSS custom property for dynamic height.

### High (P2)
- Tap targets <44px on modal close (28×28) and chevrons (~7×7) — bump to 40px.
- `scrollIntoView({behavior:'smooth'})` jitters during streaming on iOS Safari. Use `instant` while streaming.
- Header crowding on 375px viewport (hamburger + avatar + artifact pill in 60px) — move artifact pill to left.

### Medium (P3)
- StageACapture phone input lacks "(10 digits)" hint.

---

## SEO state of the union

| Route | Title | Desc | OG title | OG image | Twitter | Sitemap | JSON-LD | Noindex |
|---|---|---|---|---|---|---|---|---|
| `/` | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | – |
| `/chat` | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | – |
| `/projects` | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | – |
| `/projects/[id]` | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | **✗ should add `Apartment`** | – |
| `/builders/[id]` | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | **✗ should add `Organization`** | – |
| `/compare` | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | – |
| `/dashboard` | ✓ | ✓ | – | – | – | ✗ | – | **✗ should be index:false** |
| `/auth/signin` | ✓ | ✓ | – | – | – | ✗ | – | **✗ should be index:false** |

Top SEO fixes (ranked by SERP impact × effort):
1. Add `robots: { index: false }` to `/dashboard` + `/auth/signin` (10 min, P1).
2. Add `Apartment` JSON-LD to `/projects/[id]` (45 min, P2).
3. Add `Organization` JSON-LD to `/builders/[id]` (30 min, P2).
4. Generate OG images via `ImageResponse` for `/` + `/projects/[id]` (60 min, P2).

---

## Accessibility findings (WCAG AA)

### Failing
- **Contrast**: `--text-label: #454560` on `--bg-base: #1C1917` = **2.1:1** (fails AA). Used in `/projects/[id]`, `/compare`. Fix: use `#6B7280` or rethink token.
- **Focus indicators missing** on artifact buttons (ProjectCardV2, ComparisonCard, CostBreakdownCard, ChatCenter send). Add `focus-visible:ring-*`.

### Missing
- AI message stream lacks `aria-live="polite"` (screen-reader silent during stream).
- Artifact modal lacks `role="dialog"` + `aria-modal="true"`.
- Project cards lack `aria-label`.

WCAG AA readiness: ~70%. The gaps are 1-hour fixable.

---

## Motion / smoothness

Wins since last audit:
- "prom" typo fixed.
- 3D tilt: ±4deg → ±1.5deg.
- Dark-mode FOUC resolved (commit `c38682d`).
- Artifact renderers dynamic-imported.
- Hinglish empty state (commit `5c972d4`).

Still open:
- `prefers-reduced-motion` not respected anywhere — all Framer Motion runs full speed even when OS asks for reduced motion. Fix: utility hook + apply across 8+ components (45 min).
- ProjectCardV2 save action has no loading feedback (10 min).
- Context-chip row appears without stagger after AI message (10 min).

---

## Workflow gaps

### Buyer happy path: `/` → `/chat` → first card → save → visit → OTP
- 1–3: clean.
- 4 **CRITICAL GAP**: iOS keyboard hides booking CTA. Conversion blocker.
- 5 OTP: works (via `verify-phone.ts` flow with `VERIFY_METHOD=none` default).

### Admin happy path: `/admin` → `/admin/buyers` → mark junk → followup
- Dashboard 16-parallel-query layout works (`Promise.all` with `.catch` fallback).
- Urgent session queue (sessions idle >2 days) functioning.
- No critical workflow gaps for Mama's daily flow.

### Empty states
- `/chat` empty state: ✓ good (Hinglish copy lands).
- `/projects` empty: ✓ good.
- `/compare` with 1 selected: copy says "Select projects to compare" → should say "1 selected — pick one more".
- `/dashboard` empty: ✓ good.

---

## Effort-sorted backlog

### Quick wins (<1 hr total: 1h 25min)
- Add noindex to `/dashboard` + `/auth/signin` — 10 min
- Fix `/compare` 1-selected copy — 10 min
- Bump tap targets to 40px — 10 min
- Fix `--text-label` contrast — 5 min
- StageACapture phone hint "(10 digits)" — 5 min
- Add `aria-modal` to artifact modals — 5 min
- Lazy-load ReactMarkdown — 20 min
- AI stream `aria-live="polite"` — 10 min
- Focus-visible rings on artifact buttons — 20 min

### Medium (1–4 hr total: 4h 5min)
- `prefers-reduced-motion` hook + apply — 45 min
- iOS keyboard fix on VisitBooking — 40 min
- LazyMotion finalize in ChatCenter — 20 min
- OG images via ImageResponse — 60 min
- Apartment JSON-LD on `/projects/[id]` — 45 min
- Organization JSON-LD on `/builders/[id]` — 30 min
- Tokenize Navbar (theme tokens) — 30 min
- Fix iOS scroll jitter during streaming — 15 min
- ProjectCardV2 save loading feedback — 10 min
- Stagger context chips after AI msg — 10 min
- Move artifact pill to left on mobile — 20 min

### Bigger (>4 hr each)
- Locality SEO pages `/localities/[slug]` — 2–3 hr
- Canonical URL pass + redirect rules — 1–2 hr
- RAG integration into `/api/chat` system prompt — 2–3 hr
- Upstash Redis rollout for rate-limit/context cache — 1–2 hr

---

## Summary

| Metric | State |
|---|---|
| /chat bundle | 298 kB (target 280, fixable this week) |
| WCAG AA | ~70%, 1-hr quick wins close most gaps |
| SEO | 75%, biggest miss is JSON-LD on detail pages + OG images |
| Mobile UX | iOS keyboard blocker is the only conversion-critical gap |
| Motion | Improved this sprint; `prefers-reduced-motion` guard is the last big polish item |

Recommended this-week scope: ship the Top 5 (above) + the <1hr quick
wins. That clears the conversion blocker, gets WCAG AA across the
line, hits the bundle target, and ships the noindex SEO hygiene.
