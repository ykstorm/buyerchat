# Demo Recording Script — 3-Minute Buyer Journey

> The locked content for the Phase 2 demo video. Recorded against the
> `/showcase` cinematic surface (when shipped) — NOT the real `/chat`,
> which stays minimalist per Brand 2.0 spec.
>
> Record in 1080p 60fps. Audio overlay optional (Hindi/Hinglish voice).

## Cold open (0:00 - 0:15)

- Open homepage in clean private browser
- Tagline visible: **"Honesty is rare. It comes with Homesty."**
- Hero CTA: **"Begin your HomeSearch →"**

## Buyer journey scene (0:15 - 1:40)

| Time | Action | What's on screen |
|------|--------|------------------|
| 0:15 | Click hero CTA | Lands on `/chat` empty state |
| 0:20 | Empty state visible | Hinglish welcome + 6 starter chips |
| 0:30 | Click chip "3BHK family ke liye, 85L budget" | Input prefills, submit |
| 0:35 | AI responds via stream | Qualification questions |
| 0:50 | AI delivers PROJECT_CARD | Honest Concern + Insider Note + Visit CTA visible |
| 0:55 | Stage A capture form appears below AI message | Soft capture, no OTP |
| 1:00 | Click "Skip" | Form disappears, chat continues |
| 1:05 | Type "compare planet vs sarathya" | Comparison intent |
| 1:10 | Stage B blocker appears | Phone-only ask (Option 1, no OTP language) |
| 1:15 | Enter phone `9876543210` | Comparison delivers with side-by-side |
| 1:40 | Click "Visit book" on artifact | 4-step inline flow begins |

## Visit booking + admin (1:40 - 2:50)

| Time | Action | What's on screen |
|------|--------|------------------|
| 1:40 | Step 1: micro-commitment | 4 buttons (weekend/weekday × morning/evening) |
| 1:50 | Click weekend morning | Step 2 form appears |
| 2:00 | Enter name + phone + slot | Step 3 skipped (`VERIFY_METHOD=none`) |
| 2:10 | Step 4 confirmation | HST-2026-XYZ token visible with checklist |
| 2:20 | Cut to admin: `/admin/buyers` | Buyer shows HOT score + visit booked |
| 2:35 | Click "Mark as junk" on a different test buyer | Strikethrough, removed from kanban |

## Trust + close (2:50 - 3:00)

| Time | Content |
|------|---------|
| 2:50 | Tagline reprise: "Honesty is rare. It comes with Homesty." |
| 2:55 | Footer line: "South Bopal & Shela, Ahmedabad" |
| 3:00 | End card with logo + URL |

## Pre-record checklist

- [ ] Wave 2 fully shipped (Stage B, visit booking, scoring)
- [ ] `/showcase` route deployed
- [ ] All 5 critical-path smokes pass on prod
- [ ] No new Sentry classes since last verify
- [ ] Test buyer accounts seeded for the recording (1 HOT, 1 junk)
- [ ] Browser: Chrome 1080p, no extensions, private mode
- [ ] Screen recorder: 60fps, 1080p, separate audio track

## Rough cut vs polished cut

- **Rough cut**: record TODAY against the current product (without
  Wave 2). Use it for internal review with Mama. Pinpoints copy bugs
  + flow gaps before polish-cut investment.
- **Polished cut**: record after Wave 2 ships + `/showcase` is live.
  This is the public/shareable cut.

Don't skip rough cut. Cheap, fast, surfaces issues.
