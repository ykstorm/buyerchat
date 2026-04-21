# Homesty.ai - buyerchat

Property-buying copilot for Ahmedabad (South Bopal + Shela). Buyers chat with an AI advisor, compare shortlisted projects, and book site visits. Admins run lead operations, manage listings/builders, and monitor the pipeline.

Production: [www.homesty.ai](https://www.homesty.ai)  
Staging: [buyerchat-ten.vercel.app](https://buyerchat-ten.vercel.app)

## Quickstart

```bash
npm install
cp .env.example .env
npx prisma generate
npm run dev
```

Verification: `npm test` runs the vitest suite (decision-engine NaN + A/B correctness); `npm run build` for type/bundle checks; manual smoke testing on `/chat` and admin flows for anything UI-heavy.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js dev server on `:3000` |
| `npm run build` | Production build (type-check + bundle) |
| `npm run lint` | ESLint |
| `npm test` | Run vitest suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run embed:backfill` | RAG embedding backfill (`--dry` for estimate) |
| `npx prisma migrate dev` | Apply migrations locally |
| `npx prisma studio` | Open Prisma Studio |
| `npx prisma generate` | Regenerate Prisma client |

## Stack

- Next.js `15.2.9` (App Router), React `19`, TypeScript strict
- Prisma `7` with Neon Postgres (`@prisma/adapter-neon`)
- Auth.js `5` beta (Google OAuth, JWT session strategy)
- Vercel AI SDK `6` + OpenAI client (`gpt-4o`)
- Tailwind CSS `4`, Framer Motion `12`, Zod `4`, Zustand `5`
- Path alias: `@/* -> src/*`

## Current Product Surface

- Public pages: `/`, `/chat`, `/projects`, `/projects/[id]`, `/builders/[id]`, `/compare`, `/dashboard`, `/auth/signin`
- Admin pages (email-gated): `overview`, `projects`, `projects/new`, `projects/[id]`, `builders`, `builders/new`, `builders/[id]`, `buyers`, `buyers/[id]`, `followup`, `intelligence`, `revenue`, `settings`, `visits`, plus `/admin` index
- API route handlers: `33` routes under `src/app/api`, grouped into public, authenticated-user, and admin namespaces

## Chat Pipeline (Implemented)

`POST /api/chat` currently does:

1. Per-IP rate limiting (`10/min` in this route)
2. Request shape validation and 15-message history cap
3. 800-char latest-message cap
4. Inline normalization + injection keyword check
5. `sanitizeAdminInput` sanitization
6. Intent classification (`classifyIntent`)
7. Structured context build (`buildContextPayload`)
8. System prompt generation (`buildSystemPrompt`)
9. Decision-card augmentation for comparison intent
10. GPT-4o streaming (`streamText`)
11. Post-stream audit (`checkResponse`) and session/log persistence

RAG status:
- Implemented infrastructure: `src/lib/rag/embed-writer.ts`, `src/lib/rag/retriever.ts`, `scripts/embed-backfill.ts`, `Embedding` model in Prisma.
- Code is wired end-to-end: `/api/chat` calls `retrieveChunks()` after intent classification, threads the result into `buildSystemPrompt`, and renders it as PART 17 (RETRIEVED KNOWLEDGE BASE CONTEXT) when any chunks return. Retriever has a 600ms timeout, a 0.30 cosine-similarity floor, and returns `[]` on any failure — chat flow continues normally on empty.
- NOT LIVE yet: migration `prisma/migrations/20260421000000_add_rag_embeddings/` is on disk but **UNAPPLIED**. Until an operator runs `npx prisma migrate deploy` (after enabling the `pgvector` extension on the Neon database), the retriever no-ops silently and PART 17 is never rendered. Do not claim retrieval-augmented responses in production until the migration has been applied and an `embed:backfill` has been run.

## Security Posture

Preventive controls (actively enforced):
- Admin/email gate in middleware and admin routes
- Origin check for admin mutations
- Input normalization and keyword blocklist in chat route
- Request-size/history limits in chat route
- Endpoint-level rate limits (`rate-limit.ts`, with Upstash when configured and in-memory fallback)
- Sensitive builder fields omitted from AI context type

Audit/detective controls (not blocking response delivery):
- `response-checker.ts` runs after stream completion and logs violations to DB
- Critical violations trigger alert emails when `ADMIN_EMAIL` and `FROM_EMAIL` are configured

## Environment Variables

See `.env.example` for canonical values and required/optional annotations.

High-impact required values in normal deployments:
- `DATABASE_URL`, `DIRECT_URL`
- `AUTH_SECRET` (or `NEXTAUTH_SECRET` fallback)
- `OPENAI_API_KEY`
- `ADMIN_EMAIL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `RESEND_API_KEY`, `FROM_EMAIL`

Common optional values:
- `NEXT_PUBLIC_APP_URL`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_BASE_URL`

## RAG Operations

Design doc: `.claude/fleet/rag-v1-design.md`

To activate on a target environment:
1. Run `npx prisma migrate dev` (or deploy migration in CI/prod)
2. Run `npm run embed:backfill`
3. Re-run backfill as needed after major corpus updates (idempotent)

## Docs Freshness Checklist

When changing product scope, update docs in the same PR:

1. If adding/removing page routes, update this README + `CLAUDE.md` routing surface
2. If adding/removing API routes, update route inventory counts and category map
3. If introducing/removing env vars, update `.env.example` first, then references in README/CLAUDE
4. If changing runtime security behavior, label it as preventive vs audit-only
5. If changing AI pipeline flow, update the `POST /api/chat` step list and RAG status

## Deployment Notes

Target runtime: Vercel Node.js runtime.

Before production deploy:
1. `npm run build` passes
2. Migrations are applied
3. Required env vars are set
4. `/chat` and admin critical paths are smoke-tested

## Contributing

Read `.claude/rules/git-best-practices.md` and `.claude/rules/full-stack-development.md` before opening a PR.
