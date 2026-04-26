# Project: Homesty.ai — Agent Onboarding

EVERY agent invocation MUST first read `docs/AGENT_DISCIPLINE.md` and
apply the relevant sections to the work being done. This is
non-negotiable — past production incidents trace back to skipping
these checks.

If you are working on:
- External API integration → sections 1, 2, 9, 10
- Database / Prisma changes → sections 3, 7, 9, 10
- UI form / admin surface → sections 4, 5, 9, 10
- AI prompt / response logic → sections 7, 8, 9, 10
- Config / infra / CSP / cron → sections 1, 2, 9, 10

When in doubt, read all 10. The checklist is short.

After completing work, your report MUST conclude with a section
"Discipline checklist applied:" listing which sections you walked
through. If you skipped any that applied, state why.

## Agent infrastructure

This repo has agent-friendly infra committed at `.claude/settings.json`,
`.husky/pre-commit`, and `.github/workflows/ci.yml`:

- `.claude/settings.json` `permissions.allow` allowlists the common
  Bash commands sub-agents need (npm, git, prisma, grep, ls, head,
  tail, node, etc.) — sub-agents inherit these and don't hit
  permission prompts. Extend the allowlist (and commit the diff) if a
  new agent needs a tool.
- `.husky/pre-commit` blocks commits that drift `prisma/schema.prisma`
  without a matching migration, runs `prisma format` + `prisma
  validate`, and runs the test suite. Never bypass with
  `--no-verify` on schema-drift errors.
- `.github/workflows/ci.yml` runs lint + build + test + prisma format
  check on every PR and push to `main`. If CI is red, fix it; do not
  merge around it.

See sections 11 and 12 of `docs/AGENT_DISCIPLINE.md` for the full
delegation + CI rules.

---

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

Tests: `npm test` (vitest). Current coverage is `src/lib/decision-engine/*.test.ts` — score-engine invariants and risk-engine A/B direction.

## Stack (locked versions)

- Next.js **15.2.9** — never upgrade beyond this
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

**Public pages:** `/`, `/chat`, `/projects`, `/projects/[id]`, `/builders/[id]`, `/compare`, `/dashboard`, `/auth/signin`

**Admin pages** (`/admin/...`): protected by `session.user.email === process.env.ADMIN_EMAIL`. Current pages include overview, projects (+ new/edit), builders (+ new/edit), buyers (+ detail), followup, intelligence, revenue, settings, visits, and `/admin` index.

**API routes** (`src/app/api/`): 33 route handlers split into public (rate-limited), authenticated-user, and admin (email-gated under `/api/admin/`), plus auth route (`/api/auth/[...nextauth]`).

### AI Chat System

The chat flows through `POST /api/chat` which:
1. Rate limits by IP, validates request shape, caps history to 15 messages, and caps latest message to 800 chars
2. Runs inline normalization and `INJECTION_KEYWORDS` blocklist in the route, then sanitizes with `src/lib/sanitize.ts`
3. Classifies intent into 8 types via `src/lib/intent-classifier.ts`
4. Builds context (projects + localities + infrastructure) via `src/lib/context-builder.ts`
5. Builds the system prompt via `src/lib/system-prompt.ts`
6. Runs `src/lib/decision-engine/` pipeline for comparison intent and injects decision-card analysis
7. Streams response via Vercel AI SDK with GPT-4o
8. Audits response with `src/lib/response-checker.ts` post-stream, persists `ChatSession` + `ChatMessageLog`, and sends critical alerts via Resend

RAG status:
- **Implemented infrastructure**: `src/lib/rag/retriever.ts`, `src/lib/rag/embed-writer.ts`, `scripts/embed-backfill.ts`, and `Embedding` model
- **Current route behavior**: `/api/chat` currently builds prompt from structured context and does not pass retrieved chunks into `buildSystemPrompt`

The system prompt (`system-prompt.ts`) is the core product logic — AaiGhar SOP v2.0 with a 6-layer project disclosure protocol and psychology-driven conversation branching.

### Database Models (key ones)

- **Project** — property listings with 5 score fields (all default 50), relations to Builder, PriceHistory, SiteVisit, Deal, SavedProject
- **Builder** — developer profiles; sensitive fields (`contactPhone`, `contactEmail`, `commissionRatePct`, `partnerStatus`) are intentionally excluded from AI context via `BuilderAIContext` type in `src/lib/types/builder-ai-context.ts`
- **ChatSession** — stores conversation metadata: intent, buyerStage, buyerPersona, buyerBudget, qualificationDone
- **ChatMessageLog** — per-message audit trail (role, content, tokensUsed, responseMs, violations)
- **Deal** — commission tracking tied to a ChatSession

### Security Guardrails

- **Preventive**: admin/email gate on admin pages and `/api/admin/*`; origin checks for admin mutations; chat normalization + injection keyword blocklist; 800-char and 15-message caps; route-level rate limiting.
- **Rate limiting backend**: Upstash Redis is used when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are configured; otherwise bounded in-memory fallback is used.
- **Detective/audit-only**: `response-checker.ts` runs post-stream and logs violations; it does not block already-streamed output.
- **Admin gate**: all `/api/admin/*` routes check `session.user.email === process.env.ADMIN_EMAIL`.

## Environment Variables

Primary required (see `.env.example`):
```
DATABASE_URL, DIRECT_URL          # Neon Postgres
NEXTAUTH_SECRET, AUTH_SECRET      # JWT signing
OPENAI_API_KEY                    # GPT-4o
ADMIN_EMAIL                       # Admin access gate
GOOGLE_CLIENT_ID/SECRET           # OAuth
RESEND_API_KEY, FROM_EMAIL        # Transactional email
CLOUDINARY_CLOUD_NAME/API_KEY/SECRET  # Image uploads
```

Common optional:
```
NEXT_PUBLIC_APP_URL               # Canonical app URL (metadata, middleware origin allowlist)
UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN  # Distributed rate limit/context cache backend
SENTRY_DSN, NEXT_PUBLIC_SENTRY_DSN # Observability
NEXT_PUBLIC_BASE_URL              # Share URL fallback on project detail page
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
- All queries in one `Promise.all` — 16 parallel DB calls, wrapped in try/catch with zeroed fallbacks.

## RAG (v1)

Neon Postgres + pgvector + OpenAI `text-embedding-3-small` (1536 dim).
Design doc: `.claude/fleet/rag-v1-design.md`.

- **Write path**: `src/lib/rag/embed-writer.ts` — `embedProject` / `embedBuilder` / `embedLocality`. Hooks fire-and-forget from admin POST/PUT routes for Project and Builder.
- **Read path**: `src/lib/rag/retriever.ts` — `retrieveChunks(query, k=6)`. Returns `[]` on any failure (600ms timeout, cosine similarity ≥ 0.30).
- **Backfill**: `npm run embed:backfill` (idempotent). `--dry` prints token/cost estimate without calling OpenAI.
- **Migration**: `prisma/migrations/20260421000000_add_rag_embeddings/` exists but **must be applied deliberately** — run `npx prisma migrate dev` after resolving any drift. Until applied, the retriever no-ops silently.

## Known Open Issues

- **HIGH**: `response-checker.ts` runs post-stream — violations are logged but the buyer already received the response. `CONTACT_LEAK` and `BUSINESS_LEAK` checks need to move to `onChunk` or pre-stream to be protective, not audit-only.
- **MEDIUM**: 13 prompt rules in `system-prompt.ts` have zero counterparts in `response-checker.ts` — model drift is undetected for rules like "2-project hard limit", "100-word cap", "no 1st/2nd/3rd ranking", language matching, "no 'I recommend X'".
- **MEDIUM**: Intent-classifier emits 8 `*_query` intents but the system prompt branches on buyer persona (`family`, `investor`, `value`, `premium`) — these never appear in classifier output. The `intent` parameter threaded into `checkResponse` is accepted but never read.
- **MEDIUM**: `/chat` route is 323 kB First Load JS (8% over target). Needs a `next/dynamic` code-split pass on artifact renderers + framer-motion deferred loading.
- **MEDIUM**: RAG infrastructure exists, but `src/app/api/chat/route.ts` does not currently pass retrieval chunks into `buildSystemPrompt`; retrieval integration should be completed before claiming retrieval-augmented responses.
- **LOW**: pgvector migration file is on disk but not applied to Neon in environments where migrations were not run.

## Docs Freshness Guardrail

When adding features, update docs in the same PR:
- Route additions/removals -> update routing/API surface in this file and `README.md`
- Env var additions/removals -> update `.env.example` first, then `README.md` and this file
- Security behavior changes -> mark each control as preventive vs audit-only
- AI pipeline changes -> update the numbered `/api/chat` flow and RAG status

Resolved since fleet sweep:
- ISSUE-09 (NextAuth signIn upsert) — already implemented in `src/lib/auth.ts`.
- ISSUE-57 (builder rename block) — already implemented in `src/app/api/admin/builders/[id]/route.ts` with 409 response.
- SCORE-FIX (deliveryScore max) — false alarm; code is consistent on /30 everywhere.
