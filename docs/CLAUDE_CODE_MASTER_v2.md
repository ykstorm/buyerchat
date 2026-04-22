# Homesty.ai — Master Agent Context v2 (Post-P-ADMIN)

**Authoritative context for all agents. Read this FIRST before any code changes — the repo has evolved significantly.**

Last updated: 2026-04-22 | Session Day 46 | 13 commits shipped this session

---

## What this doc is

Single source of truth for agent context. If you're an agent reading this: do exactly what your prompt says. Do not re-scope. Do not add features. Do not skip verification — run `npm run build` + `npm test` before declaring complete. Commits happen in the main session after review.

---

## Stack (locked)

- Next.js **15.2.9** — do not upgrade
- React 19 + TypeScript (strict)
- Prisma **7** (`@prisma/client` + `@prisma/adapter-neon` + `@neondatabase/serverless`)
- Neon Postgres (serverless)
- Auth.js v5 beta (JWT sessions, Google OAuth only)
- Vercel AI SDK 6 (`ai`) + `openai` — GPT-4o streaming
- Tailwind v4 (PostCSS plugin)
- Framer Motion 12 (LazyMotion + `m.*` in chat surface per I12)
- Zustand 5, Zod 4
- Vitest (unit), Playwright (e2e — added in I24)
- Path alias `@/*` → `src/*`

---

## Shipped commits (this session, origin/main)

```
f344cb6  P-ADMIN     Pricing Step 3 — ProjectPricing + PricingHistory + admin form
4e626f7  I22         Sign-in polish (draft persist + 401 handler + avatar chip)
7a1b12c  HOTFIX      NO_MARKDOWN → audit-only (stream abort FP on bullets)
19880ec  I18-final   7 response-checker rules (5 revised + 2 bonus)
5fcf4c6  I15-final   Budget regex expansion (persona priority preserved)
869d2f8  I19+I20     BuilderTrust real subscores + UI P0 fixes
fe49a20  I17a+b      First-load card render + 5-branch price fallback
38938fb  I14         CARD emission fix in PART 16 few-shots
211acdc  I12         /chat bundle 323 → 293 kB (LazyMotion + dynamic artifacts)
01f23ef  I11         Classifier emits {intent, persona} + PART 18
c5ba4f0  I8+I10      Leak stream-abort protective + RAG retriever wired
03902b9  I9          Rule drift audit doc (23 rules / 17 missing)
```

---

## Prisma schema (current, post-P-ADMIN)

18 core models + 2 new from P-ADMIN. Key entities:

- **Project** — 16 active. 11 have `minPrice=0` awaiting P-ADMIN data entry. Fields: `projectName`, `builderName`, `microMarket`, `minPrice`, `maxPrice`, `pricePerSqft`, `pricePerSqftType`, `allInPrice`, `priceNote`, `loadingFactor`, `charges` (Json), `decisionTag`, `honestConcern`, 5 score fields (location/amenities/infrastructure/demand/builderGrade — all 0-100), `reraNumber`, etc.
- **Builder** — 5 subscores: `deliveryScore` (/30), `reraScore` (/20), `qualityScore` (/20), `financialScore` (/15), `responsivenessScore` (/15), summed to `totalTrustScore` (/100). Sensitive fields (`contactPhone`, `contactEmail`, `commissionRatePct`, `partnerStatus`) MUST NOT be exposed to client — use `BuilderAIContext` type.
- **ChatSession** — `intent`, `buyerStage`, `buyerPersona`, `buyerBudget`, `buyerName`, `buyerEmail`, `qualificationDone`, violation flags (added in I18).
- **ChatMessageLog** — per-message audit trail.
- **Embedding** — pgvector RAG table. Migration on disk at `prisma/migrations/20260421000000_add_rag_embeddings/` — UNAPPLIED.
- **ProjectPricing** (NEW, P-ADMIN) — 44 fields. Flat vs villa. Base rate, PLC, floor rise, dev/govt charges, maintenance, fixed charges, tax %. 7 denormalized totals + `grandTotalAllIn`. Cascade from Project.
- **PricingHistory** (NEW, P-ADMIN) — snapshot per change. JSON blob for audit.
- Migration for P-ADMIN on disk at `prisma/migrations/20260421120000_add_project_pricing/` — UNAPPLIED.

Both pending migrations require deliberate operator action (`npx prisma migrate deploy` after reviewing SQL).

---

## Routing surface

### Public pages
`/`, `/chat`, `/projects`, `/projects/[id]`, `/builders/[id]`, `/compare`, `/dashboard`, `/auth/signin`, `/demo` (planned, blocked on data)

### Admin pages (`session.user.email === process.env.ADMIN_EMAIL`)
- `/admin` (index), `/admin/overview` (founder dashboard, 16 parallel Prisma calls)
- `/admin/projects`, `/admin/projects/new`, `/admin/projects/[id]`
- **NEW**: `/admin/projects/[id]/pricing` — P-ADMIN Step 3 cost-sheet form
- `/admin/builders`, `/admin/builders/new`, `/admin/builders/[id]`
- `/admin/buyers`, `/admin/buyers/[id]`
- `/admin/followup`, `/admin/intelligence`, `/admin/revenue`, `/admin/settings`, `/admin/visits`

### API routes (selected)
- `/api/chat` — stream pipeline (intent → persona → RAG → decision engine → streamText → onChunk leak checks → onFinish audit → persist)
- `/api/auth/[...nextauth]`
- `/api/saved` — save/unsave projects (401 triggers I22 sign-in pill)
- `/api/visit-requests` — OTP visit booking (401 triggers I22 draft-persist)
- **NEW**: `/api/admin/projects/[id]/pricing` — GET/POST/PUT pricing + history

---

## AI chat pipeline (`POST /api/chat`)

1. Rate limit by IP (Upstash if configured, else in-memory fallback).
2. Validate + sanitize (inline `INJECTION_KEYWORDS` blocklist + `src/lib/sanitize.ts`). Cap to 15 messages, 800 chars/message.
3. Classify with `src/lib/intent-classifier.ts` → `{ intent: QueryIntent, persona: Persona }`.
4. Build context via `src/lib/context-builder.ts` (projects + localities + infrastructure).
5. Retrieve RAG chunks via `src/lib/rag/retriever.ts` (`retrieveChunks(query, k=6)`, 600ms timeout, 0.30 similarity floor, returns `[]` on failure).
6. If comparison intent + ≥2 candidate projects: run `src/lib/decision-engine/` pipeline, inject into PART 14.
7. Build system prompt via `src/lib/system-prompt.ts` (18 PARTs).
8. Stream via `streamText` (GPT-4o, temp 0.3, 500 output tokens, 15s timeout).
9. `onChunk`: CONTACT_LEAK + BUSINESS_LEAK aborts (protective). NO_MARKDOWN is audit-only as of hotfix `7a1b12c` — tracking `streamBuffer` but not aborting.
10. `onFinish`: run 7 audit checks in `src/lib/response-checker.ts`:
    - PROJECT_LIMIT (>2 project_cards / name mentions)
    - NO_MARKDOWN (post-stream, audit only)
    - LANGUAGE_MATCH (Hindi-density inversion — buyer Hinglish, model English = flag)
    - WORD_CAP (persona-aware: premium 160 / investor 140 / family 130 / value 110)
    - CARD_DISCIPLINE (exception list matches PART 15)
    - SOFT_SELL_PHRASE ("I recommend X", "you should buy")
    - ORDINAL_RANKING ("1st choice", "top pick")
11. Persist `ChatSession` + `ChatMessageLog`. Partial response NOT persisted on leak abort.

---

## System prompt structure (18 PARTs)

PART 1-5: identity, tone, boundaries, disclosure protocol
PART 6: word cap (~100)
PART 7: no markdown
PART 8: formatting discipline
PART 9-11: response structure + project_json reference
PART 12: pricing accuracy
PART 13: language matching (English + Hinglish only)
PART 14: decision-engine analysis injection
PART 15: CARD emission rules (9 rules, Rule 9 added in I14 for pivot cases)
PART 16: few-shot examples (6 present, I19b adds 3 more for comparison / cost_breakdown / builder_trust)
PART 17: RAG context (rendered only when retrievedChunks.length > 0)
PART 18: ACTIVE PERSONA (4 disjoint blocks — family / investor / value / premium, rendered when persona !== 'unknown')

`buildSystemPrompt(ctx, decisionCard?, buyerMemory?, retrievedChunks?, persona?)` — 5 params, all after the first are optional.

---

## Known constraints & patterns

### DO
- **Audit-first for risky sprints.** 4 read-only agents before I19+I20 caught 3 real problems + cancelled I16 false alarm.
- **Bundle related fixes** when files overlap (I19+I20 as one commit; I8+I10 as one commit).
- **Use Sentry for ground truth.** MARKDOWN_DETECTED regression was invisible in local tests.
- **Cross-delta `streamBuffer`** for patterns spanning text-deltas (I18 solved `**bol + d**` split).
- **Explicit field exclusion** in SSR props (I19 agent caught `contactPhone`/`commissionRatePct` leak risk unprompted).
- **Always run `npm run build` + `npm test` in agent verification step.** I14, I17, I22 agents stalled mid-verification once each — main session must verify green before commit.
- **Always `cat` generated migration SQL before `migrate deploy`** — P-ADMIN migration had pre-existing drift that could have caused data loss.

### DON'T
- Don't deploy `onChunk` protective checks for formatting drift. Only leak/safety justifies mid-stream abort.
- Don't swap classifier persona priority without testing canonical cases. I15 draft wanted `investor > value > premium > family` — would regress `"4BHK penthouse under 2Cr"` from premium to value. Budget regex expansion was the real fix.
- Don't invent project IDs in prompts. Query Neon via temp script, delete after. The Planet: `cmn0jn3kp0000zwfy4r5mf5s1`.
- Don't modify Prisma schema without `--create-only` — pending migrations must be reviewed and applied deliberately.

### Agent verification pattern (MANDATORY)
```bash
npm run build 2>&1 | grep -E "(error|Error|/chat |/admin|Failed)" | tail -10
npm test -- --run 2>&1 | tail -8
```
Target: build passes, tests stay green (currently 64/64), `/chat` bundle ≤ 300 kB.

---

## File tree (current, post-13-commit session)

```
src/
├── app/
│   ├── admin/
│   │   ├── projects/
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx                  — detail view
│   │   │   │   └── pricing/page.tsx          — NEW (P-ADMIN) Step 3 form
│   │   │   └── page.tsx                      — list (p75 5.15s, I21 fix pending)
│   │   ├── buyers/[id]/page.tsx              — name display WIP (I23)
│   │   └── overview/, followup/, ...
│   ├── api/
│   │   ├── admin/projects/[id]/pricing/route.ts — NEW (P-ADMIN)
│   │   ├── auth/[...nextauth]/
│   │   └── chat/route.ts                     — stream pipeline
│   └── chat/
│       ├── page.tsx                          — SSR projects + builders
│       └── chat-client.tsx                   — 401 handler, avatar chip, CARD parse
├── components/
│   ├── admin/
│   │   ├── PricingStep3Form.tsx              — NEW (P-ADMIN)
│   │   ├── LiveCostBreakup.tsx               — NEW (P-ADMIN)
│   │   └── PricingHistory.tsx                — NEW (P-ADMIN)
│   └── chat/
│       ├── ChatCenter.tsx                    — top-bar avatar chip (I22)
│       ├── ChatRightPanel.tsx                — real builder subscores (I19)
│       ├── ChatSidebar.tsx                   — sidebar footer sign-in
│       └── artifacts/
│           ├── ProjectCardV2.tsx             — 5-branch price + save pill (I22)
│           ├── BuilderTrustCard.tsx          — hasSubscores prop (I19)
│           ├── VisitBooking.tsx              — sessionStorage draft (I22)
│           ├── ComparisonCard.tsx
│           ├── CostBreakdownCard.tsx
│           ├── VisitPromptCard.tsx
│           └── UnresolvedArtifactCard.tsx    — NEW (I19c fallback)
├── lib/
│   ├── intent-classifier.ts                  — expanded regex (I15-final)
│   ├── intent-classifier.test.ts             — NEW (I15-final, 8 tests)
│   ├── response-checker.ts                   — 7 rules (I18-final)
│   ├── response-checker.test.ts              — NEW (I18-final, 28 tests)
│   ├── system-prompt.ts                      — 18 PARTs
│   ├── context-builder.ts                    — builds Project/Builder/Locality context
│   ├── sanitize.ts                           — 800-char + injection blocklist
│   ├── types/
│   │   ├── chat.ts                           — Artifact, ProjectType, BuilderAIContext ref
│   │   └── builder-ai-context.ts             — client-safe builder shape
│   ├── pricing/
│   │   ├── calculator.ts                     — NEW (P-ADMIN) pure math
│   │   ├── calculator.test.ts                — NEW (P-ADMIN, 13 tests)
│   │   └── validator.ts                      — NEW (P-ADMIN) Zod
│   ├── rag/
│   │   ├── retriever.ts                      — pgvector query
│   │   └── embed-writer.ts                   — embedProject/Builder/Locality
│   └── decision-engine/
│       ├── score-engine.ts + .test.ts
│       ├── risk-engine.ts + .test.ts
│       ├── difference-engine.ts
│       └── decision-card.ts

prisma/
├── schema.prisma                             — 20 models (18 + 2 new)
└── migrations/
    ├── 20260421000000_add_rag_embeddings/    — UNAPPLIED (I10 pgvector)
    └── 20260421120000_add_project_pricing/   — UNAPPLIED (P-ADMIN)

docs/
├── CLAUDE_CODE_MASTER_v2.md                  — THIS FILE
├── rule-drift-matrix.md                      — I9 audit
├── intent-alignment.md                       — I11 mapping
├── architecture.md, chat-flow.md, decision-engine.md, rag.md, database.md,
├── security.md, admin.md, testing.md, agents.md
└── README.md

scripts/
├── embed-backfill.ts                         — RAG backfill (--dry available)
└── import-projects.mjs                       — CSV bulk import (I17c pending patch)

tests/                                        — e2e added in I24
```

---

## Operator actions required (before further shipping)

### 1. Apply P-ADMIN migration (5 min, DB-MUTATING)
```bash
npx prisma migrate status                              # review drift
cat prisma/migrations/20260421120000_add_project_pricing/migration.sql
# Confirm: 2 CREATE TABLE, 2 CREATE INDEX, 1 UNIQUE INDEX, 3 FK constraints. No DROPs.
npx prisma migrate deploy
```

### 2. Apply pgvector migration (10 min, DB-MUTATING)
```sql
-- Neon SQL editor:
CREATE EXTENSION IF NOT EXISTS vector;
```
```bash
npx prisma migrate deploy
npm run embed:backfill -- --dry                        # preview cost
npm run embed:backfill                                  # actual
```

### 3. Enter pricing via new admin form (45 min)
`/admin/projects/[id]/pricing` — start with The Planet (`cmn0jn3kp0000zwfy4r5mf5s1`), Riviera Elite, Vernis Villa, Gala Marvella. `Project.minPrice`/`maxPrice`/`allInPrice` auto-denormalize on save.

### 4. OAuth env/redirect verification (5 min)
- Vercel prod env: confirm `AUTH_URL=https://www.homesty.ai` OR `AUTH_TRUST_HOST=true`.
- GCP OAuth Console: authorised redirect URIs include BOTH `https://www.homesty.ai/api/auth/callback/google` AND `https://homesty.ai/api/auth/callback/google`.

---

## Remaining sprints (as of 2026-04-22 22:45 IST)

### In flight (Group A, parallel)
- **I19b** — 3 missing few-shots in PART 16 (comparison / cost_breakdown / builder_trust).
- **I23** — Buyer name surfaced in admin CRM (4 render points).
- **I24** — Playwright e2e + a11y scaffolding.

### Queued (Group B, after Group A)
- **I21** — `/admin/projects` p75 5.15s → target <800ms. Trim query, add Redis cache.

### Blocked on operator data entry
- **P1 /demo landing page** — needs ≥5 projects with real prices + BuilderTrustCard now fixed.

### Queued after P1
- **SKILLS** — 5 `.claude/skills/` reusables.

### External blockers (non-code)
- DLT registration (msg91.com) → unblocks WhatsApp OTP
- RERA verification for 16 projects
- Google Maps amenity data
- Builder agreements (3)
- Venus Group commission (₹1.27L overdue)

---

## Production incident playbook (proven this session)

1. **Don't panic, don't revert.** Check timing — Sentry error may be from pre-deploy tail.
2. **Run `analyze_issue_with_seer` via Sentry MCP** if authenticated.
3. **Deploy parallel read-only diagnostic agents** when root cause isn't obvious.
4. **Hotfix pattern:**
   - Minimum-diff fix (e.g., demote protective check to audit-only).
   - Agent verifies build + tests.
   - Main session commits + pushes.
   - Verify Sentry silence within 5-10 min.
5. **Post-hotfix cleanup:**
   - Resolve Sentry issue with release hash.
   - Update this doc's "known constraints" section.
   - Queue proper fix (not hotfix) for next sprint.

Proven recovery time: ~10 min (audit → diagnose → hotfix → push → verify).

---

## Agent quickstart

When spawned:
1. Read this doc first.
2. Read `CLAUDE.md` in repo root.
3. Read the sprint-specific files in your prompt.
4. If editing response-checker → read `docs/rule-drift-matrix.md`.
5. If editing classifier → read `docs/intent-alignment.md`.
6. Do the work.
7. Run `npm run build` + `npm test` — fail fast if broken.
8. Report back with file-by-file changes + verification output.
9. Never commit. Never push. Main session owns git state.

---

*Maintained by Lakshyaraj Rao | Homesty AI Technology LLP | keep updated after each sprint.*
