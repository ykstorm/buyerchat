# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start local dev server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
npx prisma migrate dev   # Apply schema changes + generate client
npx prisma studio        # DB browser UI
npx prisma generate      # Regenerate Prisma client after schema edits
```

No test suite is configured.

## Stack (locked versions)

- Next.js **15.2.2** — never upgrade beyond this
- Prisma **7** — config in `prisma.config.ts`
- Auth.js **v5** beta — JWT sessions, Google OAuth
- Tailwind **v4** — PostCSS plugin
- Framer Motion **v12**

- **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS 4** — PostCSS plugin, not the old v3 config style
- **Prisma 7** with **Neon serverless Postgres** (`@prisma/adapter-neon` + `@neondatabase/serverless`)
- **NextAuth.js 5 beta** — Google OAuth only, JWT sessions
- **Vercel AI SDK 6** (`ai` package) + `openai` client — GPT-4o streaming
- **Zustand 5** for client state, **Zod 4** for validation
- Path alias: `@/*` → `src/*`

## Architecture

### Routing

**Public pages:** `/`, `/projects/[id]`, `/builders/[id]`, `/compare`, `/auth/signin`

**Admin pages** (`/admin/...`): protected by `session.user.email === process.env.ADMIN_EMAIL`. Tabs: overview, projects, builders, buyers, followup, intelligence, revenue.

**API routes** (`src/app/api/`): 22 routes split into public (rate-limited), auth (`/api/auth/[...nextauth]`), and admin (email-gated under `/api/admin/`).

### AI Chat System

The chat flows through `POST /api/chat` which:
1. Sanitizes input (`src/lib/sanitize.ts`) and checks for prompt injection (`src/lib/few-shot-examples.ts`)
2. Classifies intent into 8 types via `src/lib/intent-classifier.ts`
3. Builds context (projects + localities + infrastructure) via `src/lib/context-builder.ts`, cached in-memory by `src/lib/context-cache.ts`
4. Runs `src/lib/decision-engine/` pipeline: score → recommend → tradeoff → risk → decision cards
5. Streams response via Vercel AI SDK with GPT-4o using the system prompt in `src/lib/system-prompt.ts`
6. Validates response against hallucination/leakage rules via `src/lib/response-checker.ts`

The system prompt (`system-prompt.ts`) is the core product logic — AaiGhar SOP v2.0 with a 6-layer project disclosure protocol and psychology-driven conversation branching.

### Database Models (key ones)

- **Project** — property listings with 5 score fields (all default 50), relations to Builder, PriceHistory, SiteVisit, Deal, SavedProject
- **Builder** — developer profiles; sensitive fields (`contactPhone`, `contactEmail`, `commissionRatePct`, `partnerStatus`) are intentionally excluded from AI context via `BuilderAIContext` type in `src/lib/types/builder-ai-context.ts`
- **ChatSession** — stores conversation metadata: intent, buyerStage, buyerPersona, buyerBudget, qualificationDone
- **ChatMessageLog** — per-message audit trail (role, content, tokensUsed, responseMs, violations)
- **Deal** — commission tracking tied to a ChatSession

### Security Guardrails

- **Rate limiting**: In-memory, resets on cold start (known issue — Upstash Redis migration pending). Chat: 10 req/min, Projects: 30 req/min.
- **Input**: Unicode NFKC normalization, invisible char stripping, injection keyword blocklist, 800-char message cap, 15-message history cap.
- **Response**: `response-checker.ts` blocks responses that mention non-real projects, leak sensitive builder fields, or misalign with detected intent.
- **Admin gate**: All `/api/admin/*` routes check `session.user.email === process.env.ADMIN_EMAIL`.

## Environment Variables

Required (see `.env`):
```
DATABASE_URL, DIRECT_URL          # Neon Postgres
NEXTAUTH_SECRET, AUTH_SECRET      # JWT signing
OPENAI_API_KEY                    # GPT-4o
ADMIN_EMAIL                       # Admin access gate
GOOGLE_CLIENT_ID/SECRET           # OAuth
MSG91_API_KEY                     # SMS/OTP
RESEND_API_KEY, FROM_EMAIL        # Transactional email
CLOUDINARY_CLOUD_NAME/API_KEY/SECRET  # Image uploads
```

## Admin Overview Page (Founder Dashboard)

Layout (v3): greeting header → deal banner (conditional) → 5 metric cards → 2-col priority actions (follow-up queue + system alerts) → 4-stat this-week row → 2-col pipeline funnel + pipeline snapshot table.

Key design decisions:
- **Deal banner**: queries `Deal.findFirst` — shown only when a deal exists; gradient `#1F3864 → #2B4F8E` matching admin topbar.
- **Pipeline value metric**: `ChatSession.aggregate(_sum.buyerBudget) * 0.015` — real budget-based estimate, not a fake multiplier.
- **Hot stages** (comparison, visit_trigger, pre_visit, post_visit): bars shown in amber `#BA7517`; earlier stages in blue `#185FA5`.
- **Pipeline snapshot table**: sessions in hot stages only, commission = `buyerBudget * 0.015`, sorted by budget desc. No chart library — pure Tailwind.
- **This week activity**: 4 `StatPill` components with a left-border accent, querying `createdAt >= startOfWeek`.
- **Follow-up queue**: filters sessions with `lastMessageAt < 2 days ago` via `twoDaysAgo` date; uses `getUrgency()` from `admin-utils.ts`.
- All queries in one `Promise.all` — 14 parallel DB calls, wrapped in try/catch with zeroed fallbacks.

## Known Open Issues (backlog.md)

- **ISSUE-04 / ISSUE-18/19 (HIGH)**: Rate limiter and context cache use in-memory stores — must migrate to Upstash Redis before production Vercel deployment (cold starts reset state).
- **ISSUE-09 (HIGH)**: User DB upsert not yet implemented in NextAuth `signIn` callback.
- **ISSUE-57 (HIGH)**: Builder rename not blocked when projects are attached.
- **SCORE-FIX (MEDIUM)**: `deliveryScore` max is 30 (not 20) — scoring math in `score-engine.ts` is off.
