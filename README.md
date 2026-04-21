# Homesty.ai — buyerchat

Property-buying copilot for Ahmedabad (South Bopal + Shela). Buyers chat
with an AI advisor trained on the AaiGhar SOP, compare shortlisted
projects, and book site visits. Admins triage the pipeline, log deals,
and curate the corpus that powers the chat.

Production: [www.homesty.ai](https://www.homesty.ai) ·
Staging: [buyerchat-ten.vercel.app](https://buyerchat-ten.vercel.app)

---

## Quickstart

```bash
npm install
cp .env.example .env        # fill in the keys below under "Environment"
npx prisma generate
npm run dev                 # http://localhost:3000
```

### Scripts

| Command                           | What it does                                             |
| --------------------------------- | -------------------------------------------------------- |
| `npm run dev`                     | Next.js dev server on :3000                              |
| `npm run build`                   | Production build (type-check + bundle)                   |
| `npm run lint`                    | ESLint (flat config, Next.js preset via FlatCompat)      |
| `npm run embed:backfill`          | One-shot RAG backfill (idempotent; `--dry` = cost check) |
| `npx prisma migrate dev`          | Apply pending migrations to the local/Neon DB            |
| `npx prisma studio`               | DB browser UI                                            |
| `npx prisma generate`             | Regenerate Prisma client after schema edits              |

No test runner is configured — verification is `npm run build` + manual
browser smoke on the `/chat` page.

---

## Stack (locked — do not upgrade past these)

- **Next.js 15.2** (App Router) · **React 19** · **TypeScript strict**
- **Prisma 7** on **Neon Postgres** (`@prisma/adapter-neon`)
- **pgvector** (via `Unsupported("vector(1536)")`) for RAG embeddings
- **Auth.js 5 beta** — Google OAuth, JWT sessions
- **Vercel AI SDK 6** + `openai` client — GPT-4o streaming
- **Tailwind CSS v4** (PostCSS plugin form) · **Framer Motion 12**
- **Zod 4** for validation · **Zustand 5** for client state

Path alias: `@/*` → `src/*`.

---

## Architecture at a glance

```
User ─► POST /api/chat ─► sanitize + injection blocklist
                     │
                     ├─► classifyIntent (8 types)
                     ├─► buildContextPayload  (projects, localities, infra)
                     ├─► retrieveChunks       (pgvector, top-6, 600ms cap)
                     ├─► buildDecisionCard    (if comparison intent)
                     └─► streamText (GPT-4o, 15s abortSignal)
                             │
                             └─► onFinish → response-checker (audit) + ChatSession persist
```

### Key directories

```
src/
  app/                    Next.js App Router
    api/                  22 routes: public (rate-limited), auth, admin (email-gated)
    admin/                7 admin pages (overview / projects / builders / buyers / ...)
    chat/                 The chat UI
    projects/ builders/   Public detail pages
    compare/              Side-by-side project comparison
  components/
    chat/                 ChatCenter, ChatSidebar, ChatRightPanel, artifacts/*
    FloatingChatWidget    Non-chat pages embed this
    VisitBookingModal     OTP-gated site-visit capture
  lib/
    auth.ts               NextAuth v5 config; signIn callback upserts User
    context-builder.ts    Structured context for the LLM
    context-cache.ts      In-memory (known issue — needs Upstash)
    decision-engine/      score → difference → tradeoff → risk → card (7 files)
    intent-classifier.ts  8 intent regexes
    rag/
      embed-writer.ts     Chunk templates + upsert (raw SQL ON CONFLICT)
      retriever.ts        pgvector cosine top-K with graceful fallback
    rate-limit.ts         In-memory fallback + Upstash Redis wrapper
    response-checker.ts   Post-stream audit (not blocking — see backlog)
    sanitize.ts           INJECTION_PATTERNS + 800-char cap
    system-prompt.ts      AaiGhar SOP v2.0 (6-layer disclosure protocol)
    types/builder-ai-context.ts  Compile-time guard against sensitive-field leaks
  middleware.ts           Admin-route gate + CSRF origin check
prisma/
  schema.prisma           26 models; pgvector Embedding added for RAG
  migrations/             On-disk migrations (Embedding migration UNAPPLIED)
scripts/
  embed-backfill.ts       Batched idempotent backfill
.claude/
  AGENTS.md               15-agent fleet root source
  fleet/rag-v1-design.md  RAG v1 design doc (source of truth)
  rules/                  Full-stack + git best-practice rules
CLAUDE.md                 Project guide for Claude Code
```

---

## Environment variables

Copy `.env.example` to `.env` and fill in:

```
DATABASE_URL, DIRECT_URL          # Neon Postgres — pooled + direct
NEXTAUTH_SECRET, AUTH_SECRET      # JWT signing (same value; both names)
NEXT_PUBLIC_APP_URL               # Canonical origin (https://www.homesty.ai)
OPENAI_API_KEY                    # GPT-4o chat + text-embedding-3-small
ADMIN_EMAIL                       # Sole admin gate (case-insensitive)
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET   # OAuth
MSG91_API_KEY                     # SMS/OTP for site-visit booking
RESEND_API_KEY, FROM_EMAIL        # Transactional email
CLOUDINARY_CLOUD_NAME/API_KEY/SECRET      # Image uploads
UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN  # Optional; rate-limit fallback otherwise
```

---

## RAG (v1)

Live-knowledge retrieval grounded in the existing corpus — projects,
builders, localities, infrastructure. Full design doc:
[`.claude/fleet/rag-v1-design.md`](.claude/fleet/rag-v1-design.md).

| Piece              | Where                          | Notes                                                              |
| ------------------ | ------------------------------ | ------------------------------------------------------------------ |
| Vector store       | Neon Postgres + pgvector       | `Embedding` model; `ivfflat` cosine index with `lists=100`         |
| Embedding model    | `text-embedding-3-small`       | 1536 dim · ~$0.05/month at current scale                           |
| Write path         | `src/lib/rag/embed-writer.ts`  | Fired fire-and-forget from admin Project/Builder POST and PUT      |
| Read path          | `src/lib/rag/retriever.ts`     | Top-6 chunks, similarity ≥ 0.30, 600ms timeout, `[]` on fail       |
| Backfill           | `scripts/embed-backfill.ts`    | Idempotent. `npm run embed:backfill -- --dry` for cost estimate    |
| Chunk templates    | `embed-writer.ts`              | `chunkForProject` / `chunkForBuilder` (uses `BuilderAIContext`)    |

### To go live with RAG

1. Resolve any schema drift: `npx prisma migrate status`.
2. Apply the migration: `npx prisma migrate dev`. This enables pgvector
   on Neon and creates the `Embedding` table + `ivfflat` index.
3. Backfill: `npm run embed:backfill` (one-time; safe to rerun).
4. Deploy. Subsequent admin saves auto-update embeddings via the
   fire-and-forget hooks.

Until step 2 runs, `retrieveChunks` returns `[]` on every call and the
chat falls through to the structured context only — zero user-visible
impact.

---

## Security guardrails

- **Admin gate**: every `/api/admin/*` route and the admin-page
  middleware enforce `session.user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()`.
- **CSRF**: admin mutations require an `Origin` header matching one of
  the allowlisted origins (`middleware.ts`).
- **Input sanitization**: all user-visible LLM-bound strings
  (projectName, builderName, honestConcern, analystNote, market-alert
  message) pass through `sanitizeAdminInput` — strips injection patterns
  and caps at 800 chars.
- **Rate limits**: chat 30/min, builders/projects 60/min, admin 30/min.
  In-memory fallback has bounded eviction (10k entries).
- **Response-level checks**: `response-checker.ts` audits every GPT-4o
  response for fake projects, contact-detail leaks, and commission
  leaks. **Note**: currently audit-only (post-stream) — see open issues.
- **CSP + HSTS**: `next.config.ts` pins script/style sources and sets
  `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
- **Sensitive-field exclusion**: `BuilderAIContext` type in
  `src/lib/types/builder-ai-context.ts` compile-time guards
  `contactPhone`, `contactEmail`, `commissionRatePct`, `partnerStatus`
  from ever reaching the LLM.

---

## Known open issues

See the **Known Open Issues** section of [`CLAUDE.md`](CLAUDE.md) for
the current backlog. Highlights for v1.0:

- In-memory rate limiter / context cache — fine for a single Vercel
  instance but will reset on cold starts. Migrate to Upstash Redis
  before multi-region scale-out.
- `response-checker.ts` is audit-only (post-stream). Moving its
  `CONTACT_LEAK` and `BUSINESS_LEAK` gates to `onChunk` is the highest-
  value hardening for the chat pipeline.
- `/chat` bundle is 323 kB First Load JS (8% over target). Code-split
  artifact renderers via `next/dynamic` to bring it under 300 kB.
- RAG migration is on disk but unapplied — deliberate operator step.

---

## The agent fleet

This codebase was stabilized for v1.0 release by a coordinated
**15-agent fleet**. The fleet root source is
[`.claude/AGENTS.md`](.claude/AGENTS.md) — it defines agent scopes,
model tiers, shared conventions, and the startup protocol every
subagent follows.

- **Research cohort (R1–R7)**: read-only audits (backend, frontend,
  RAG design, system-prompt, decision-engine, build-perf, DB queries).
- **Implementation cohort (I1–I8)**: apply fixes + RAG scaffold,
  verify build, refresh docs.

Each agent runs on a model tier appropriate to its work: opus for
design, sonnet for implementation, haiku for mechanical grep-heavy
audits.

---

## Deploying

Target: Vercel (Fluid Compute, Node 24).

Before a production deploy:

1. `npm run build` must pass locally.
2. Apply any pending migrations (`npx prisma migrate deploy` in CI).
3. Confirm `ADMIN_EMAIL` is set and `AUTH_SECRET` is ≥ 32 chars.
4. If enabling RAG, run the backfill script against the production DB
   once (idempotent).
5. Smoke-test `/chat` with a realistic buyer query.

---

## Contributing

Read
[`.claude/rules/git-best-practices.md`](.claude/rules/git-best-practices.md)
and
[`.claude/rules/full-stack-development.md`](.claude/rules/full-stack-development.md)
before opening a PR. Every change must land across all layers it
touches (frontend + API + DB) — there is no partial-change policy here.

Commit convention: `<type>(<scope>): <subject>` where `<type>` is one
of `feat` / `fix` / `perf` / `chore` / `docs` / `refactor`. Body
explains the *why*, not the *what*. Trailer must include
`Co-Authored-By:` if any AI assistance was used.
