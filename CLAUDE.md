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
1. Sanitizes input (`src/lib/sanitize.ts`) and runs an `INJECTION_KEYWORDS` blocklist inline in the route
2. Classifies intent into 8 types via `src/lib/intent-classifier.ts`
3. Builds context (projects + localities + infrastructure) via `src/lib/context-builder.ts`, cached in-memory by `src/lib/context-cache.ts`
4. Retrieves relevant knowledge chunks via `src/lib/rag/retriever.ts` (Neon pgvector, text-embedding-3-small, 600ms timeout, returns [] on fail)
5. Runs `src/lib/decision-engine/` pipeline: score → recommend → tradeoff → risk → decision cards
6. Streams response via Vercel AI SDK with GPT-4o using the system prompt in `src/lib/system-prompt.ts` (retrieved chunks spliced between PART 12 and PART 13)
7. Validates response against hallucination/leakage rules via `src/lib/response-checker.ts` (post-stream, audit-only — see backlog)

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

## RAG (v1)

Neon Postgres + pgvector + OpenAI `text-embedding-3-small` (1536 dim).
Design doc: `.claude/fleet/rag-v1-design.md`.

- **Write path**: `src/lib/rag/embed-writer.ts` — `embedProject` / `embedBuilder` / `embedLocality`. Hooks fire-and-forget from admin POST/PUT routes for Project and Builder.
- **Read path**: `src/lib/rag/retriever.ts` — `retrieveChunks(query, k=6)`. Returns `[]` on any failure (600ms timeout, cosine similarity ≥ 0.30).
- **Backfill**: `npm run embed:backfill` (idempotent). `--dry` prints token/cost estimate without calling OpenAI.
- **Migration**: `prisma/migrations/20260421000000_add_rag_embeddings/` exists but **must be applied deliberately** — run `npx prisma migrate dev` after resolving any drift. Until applied, the retriever no-ops silently.

## Known Open Issues

- **HIGH**: Rate limiter and context cache use in-memory stores — must migrate to Upstash Redis before production Vercel deployment. Partial mitigation: `src/lib/rate-limit.ts` now has bounded eviction (MAX 10k entries, race-safe).
- **HIGH**: `response-checker.ts` runs post-stream — violations are logged but the buyer already received the response. `CONTACT_LEAK` and `BUSINESS_LEAK` checks need to move to `onChunk` or pre-stream to be protective, not audit-only.
- **MEDIUM**: 13 prompt rules in `system-prompt.ts` have zero counterparts in `response-checker.ts` — model drift is undetected for rules like "2-project hard limit", "100-word cap", "no 1st/2nd/3rd ranking", language matching, "no 'I recommend X'".
- **MEDIUM**: Intent-classifier emits 8 `*_query` intents but the system prompt branches on buyer persona (`family`, `investor`, `value`, `premium`) — these never appear in classifier output. The `intent` parameter threaded into `checkResponse` is accepted but never read.
- **MEDIUM**: `/chat` route is 323 kB First Load JS (8% over target). Needs a `next/dynamic` code-split pass on artifact renderers + framer-motion deferred loading.
- **LOW**: pgvector migration file is on disk but not applied to Neon. RAG retriever no-ops until applied.

Resolved since fleet sweep:
- ISSUE-09 (NextAuth signIn upsert) — already implemented in `src/lib/auth.ts`.
- ISSUE-57 (builder rename block) — already implemented in `src/app/api/admin/builders/[id]/route.ts` with 409 response.
- SCORE-FIX (deliveryScore max) — false alarm; code is consistent on /30 everywhere.
