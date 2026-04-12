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

## COMPLETED DAY 37-38
- Homesty landing page with tagline
- Pre-visit brief button on visits page
- Commission evidence in visit booking
- Project disclosure tracking (projects seen count)
- All admin forms dark themed
- Session quality scores on kanban
- Buyer match engine on projects page
- Mark visit complete + post_visit stage
- Post-visit AI feedback context
- Pricing system Step 3 full UI
- ProjectCard SBU+Carpet+ALL-IN+EMI

## PENDING (priority order)
1. Mobile UX final pass
2. Dark/light mode toggle (Day 40)
3. Homesty rebrand + BuyerChat → Homesty everywhere (Day 42)
4. Cards-first AI response system (Day 42)
5. WhatsApp pre-visit brief auto-send (DLT pending)
6. WhatsApp post-visit auto-send (DLT pending)
7. SMS OTP registration (DLT pending)
8. RERA auto-scraper Puppeteer (Day 42)
9. PDF auto-extract Claude API (Day 42)
10. SOP scoring 10 categories

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
