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

## PENDING (priority order)
1. Visit confirmation screen after OTP booking
2. New chat welcome screen with suggested prompts  
3. Context-aware suggested chips (change by buyer stage)
4. Buyer match engine
5. Post-visit feedback flow (48h)
6. Commission lock PDF
7. RERA auto-scraper
8. Dark/light mode toggle (Day 40)
9. MSG91 SMS OTP (DLT pending — Balvir)
10. WhatsApp nudge (blocked on DLT)

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
