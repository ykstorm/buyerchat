# BuyerChat / AaiGhar — Claude Code Context
> Read this file at the start of every session: `cat CLAUDE_CONTEXT.md`

## Product
India's first buyer-side property platform. South Bopal & Shela, Ahmedabad.
Revenue: 1.5% commission only. No builder pays for promotion.
Live: buyerchat-ten.vercel.app | Admin: /admin
Build Day: 37 of 42. Launch: Day 42.

## Stack
Next.js 15, Neon PostgreSQL, Prisma 7, GPT-4o, Auth.js v5, Vercel, Upstash Redis, Resend

## Rules — NEVER CHANGE
- Builder phone never shown to buyer
- Commission 1.5% only, never shown to buyer  
- No paid rankings ever
- decisionTag='Avoid' projects hidden from AI
- honestConcern=null projects hidden from AI
- Price quotes require Balvir review
- OTP before visit = commission protection

## Key Files
- src/lib/system-prompt.ts — AI SOP 15 parts
- src/lib/context-builder.ts — Avoid + honestConcern filters
- src/app/api/chat/route.ts — chat endpoint, buyerStage detection
- src/app/chat/chat-client.tsx — artifact history, sessions
- src/components/chat/ChatCenter.tsx — mobile artifact sheet
- src/components/chat/ChatRightPanel.tsx — desktop panel
- src/components/admin/DarkCard.tsx — shared dark admin components
- src/app/admin/followup/page.tsx — follow-up with AI draft button

## Workflow
- Claude Code: cd C:\Users\pc\Documents\buyerchat && claude --dangerously-skip-permissions
- One file per task. Never run tsc. Commit after every task.

## COMPLETED DAY 37
- Visit confirmation screen with OTP token card
- Context-aware suggested chips
- Artifact history reconstructed on session load
- Artifact dedup + multi-project detection
- Artifact menu outside-click close
- Saved projects real-time sidebar update
- Dashboard visits field mapping fix
- Auto session naming from first message
- Pricing system UI in admin Step 3
- Scoring queue on projects page
- Post-visit silence KPI on overview
- Follow-up draft button on all priority cards
- Mark visit complete button + post_visit transition
- OTP sign-in prompt for anonymous buyers
- Settings page with functional tabs
- Buyer CRM Sessions tab rename

## PENDING (priority order)
1. Post-visit feedback prompt in chat (buyer return after visit)
2. Buyer match engine UI on projects page
3. Mobile UX final pass
4. Dark/light mode toggle (Day 40)
5. Homesty rebrand (Day 42)
6. MSG91 SMS OTP (DLT pending — Balvir)
7. WhatsApp nudge (blocked on DLT)
8. Commission lock PDF
9. RERA auto-scraper

## Data Issues (Balvir)
- 10 projects minPrice=maxPrice=0 — enter via admin
- Sky Villa all zeros — ask builder
- Commission rates unconfirmed

## Admin Pages Status
All dark revamped: Overview, Buyers, Projects, Builders, Follow-up, Revenue, Intelligence, Visits, Settings

## Blocked
- MSG91 DLT (3-7 days, needs GST + company docs)
- WhatsApp Business API (needs Meta + DLT)
- RERA scraper (Puppeteer not set up)
