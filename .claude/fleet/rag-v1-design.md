# RAG v1 Design — Neon pgvector + text-embedding-3-small

Source of truth for I1/I2/I3. Derived from `.claude/AGENTS.md` section 2 and
the current `src/lib/context-builder.ts` / `src/app/api/chat/route.ts`
wiring. Do not deviate without a commit to `AGENTS.md` first.

Produced by R3 (rag-design, opus). Preserved verbatim except for
formatting touch-ups.

---

## 1. Prisma migration

**Path:** `prisma/migrations/<timestamp>_add_rag_embeddings/migration.sql`
(handwritten; run `prisma migrate dev --create-only` then replace body).

**Schema delta** (`prisma/schema.prisma`):

```prisma
model Embedding {
  id         String   @id @default(cuid())
  sourceType String
  sourceId   String
  content    String   @db.Text
  embedding  Unsupported("vector(1536)")
  tokens     Int
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([sourceType, sourceId])
  @@index([sourceType, sourceId])
}
```

The `@@unique` is the idempotency lever: one chunk per (type, id). If a
row ever needs multiple chunks we extend to
`[sourceType, sourceId, chunkIndex]` — v1 is single-chunk per row.

**`migration.sql` raw body** (Prisma cannot model pgvector or ivfflat):

```sql
-- Enable pgvector on Neon (supported natively; no superuser needed).
CREATE EXTENSION IF NOT EXISTS vector;

-- Prisma-generated CREATE TABLE for Embedding goes here as emitted.
-- (Let `migrate dev --create-only` write it; do not hand-roll.)

-- ivfflat index. Target lists = sqrt(rows). ~5k rows -> 71, rounded to
-- 100 for headroom. Revisit when corpus crosses 20k.
CREATE INDEX embedding_vec_idx
  ON "Embedding"
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

Retrieval quality tuning is applied at query time in `retriever.ts`:
`SET LOCAL ivfflat.probes = 10;`.

After bulk insert, run `ANALYZE "Embedding";` (done by the backfill
script, §5).

---

## 2. Chunking strategy

One chunk per source row. Corpus is structured records, not long
documents — no overlap needed. All chunks fit under the 8191-token
model cap.

| sourceType | Fields concatenated into prose                                                                                                                                       | Target tokens |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| project    | projectName, builderName, microMarket, configurations, priceRange, possessionDate, amenities, honestConcern, analystNote, priceNote, decisionTag                     | 200–400       |
| builder    | brandName, grade, totalTrustScore, 1-sentence summary of delivery / RERA / quality / financial / responsiveness (AI-safe fields only per `BuilderAIContext`)          | 120–250       |
| locality   | name, yoyGrowthPct, demandScore, avgPricePerSqft, fixed area descriptor from `locationIntelligence` block                                                             | 200–350       |
| infra      | name, type, priceImpactPct, sourceUrl                                                                                                                                 | 40–80         |
| faq        | question + answer (table ready; no admin UI yet — skipped in I2)                                                                                                     | 100–400       |

Chunk text is plain prose, not JSON — embeddings score prose better.
Templates live in `embed-writer.ts` as `chunkForProject`,
`chunkForBuilder`, etc.

Sensitive fields (`contactPhone`, `contactEmail`, `commissionRatePct`,
`partnerStatus`) MUST NOT appear in any chunk. `BuilderAIContext`
enforces this at compile time for builder chunks.

---

## 3. Write-path — `src/lib/rag/embed-writer.ts`

```ts
export type SourceType = 'project' | 'builder' | 'locality' | 'infra' | 'faq'

export async function upsertEmbedding(
  sourceType: SourceType,
  sourceId: string,
  content: string
): Promise<void>

export async function embedProject(projectId: string): Promise<void>
export async function embedBuilder(builderName: string): Promise<void>
export async function embedLocality(localityId: string): Promise<void>
```

**Deps:** `openai` (already in `package.json`), `@/lib/prisma`,
`js-tiktoken` for deterministic token counts.

**Idempotency:** single `prisma.$executeRaw`
`INSERT ... ON CONFLICT (sourceType, sourceId) DO UPDATE SET embedding = EXCLUDED.embedding, content = EXCLUDED.content, tokens = EXCLUDED.tokens, updatedAt = NOW()`.
Re-saving a row updates the row, never appends.

**Call sites** (I2 wires these):

- `src/app/api/admin/projects/route.ts` — after `prisma.project.create`
  succeeds, `await embedProject(project.id)`. Wrap in try/catch; log on
  failure, do not fail the admin save.
- `src/app/api/admin/projects/[id]/route.ts` — same, on PATCH success.
- `src/app/api/admin/builders/route.ts` and
  `src/app/api/admin/builders/[id]/route.ts` — same for builder.
- Locality has no admin route today; backfill only for v1.

Also call `invalidateContextCache()` in the same hook — structured
context is cached separately from embeddings. Embedding call runs
**after** the DB transaction commits, so an OpenAI outage never rolls
back a legitimate edit.

---

## 4. Read-path — `src/lib/rag/retriever.ts`

```ts
export type RetrievedChunk = {
  sourceType: SourceType
  sourceId: string
  content: string
  similarity: number
}

export async function retrieveChunks(
  query: string,
  k: number = 6
): Promise<RetrievedChunk[]>
```

**Pseudo-code:**

1. `queryVec = openai.embeddings.create({ model: 'text-embedding-3-small', input: query.slice(0, 2000) })`
2. `rows = await prisma.$queryRaw` running
   `SET LOCAL ivfflat.probes = 10;` then
   `SELECT sourceType, sourceId, content, 1 - (embedding <=> $vec::vector) AS similarity FROM "Embedding" ORDER BY embedding <=> $vec::vector LIMIT $k`
3. `return rows.filter(r => r.similarity >= 0.30)` — drop irrelevant noise.
4. Wrap in `Promise.race` with a 600 ms ceiling. On timeout, return
   `[]` — chat must never fail because retrieval was slow.

**Splice point in `src/app/api/chat/route.ts`:** after
`buildContextPayload()` (around the current line 116), before
`buildSystemPrompt()`.

```ts
const retrieved = await retrieveChunks(sanitizedMsg, 6).catch(() => [])
// pass into buildSystemPrompt as a new optional `retrievedChunks` arg
```

`buildSystemPrompt` gains one parameter. Chunks render as a block
labeled `RELEVANT KNOWLEDGE (retrieved):` positioned **after** the
structured PROJECT/LOCALITY/INFRA context and **before** the
conversational rules tail. (The `messages` array is passed separately
to `streamText`, so "before history" means inside the system prompt,
last section.)

---

## 5. Backfill

**File:** `scripts/embed-backfill.ts`.
**npm script:** `"embed:backfill": "tsx scripts/embed-backfill.ts"`.

Behavior: for each sourceType, iterate rows in batches of 50, call
`upsertEmbedding`. The `@@unique` key makes reruns cheap. Optional
`--dry` flag counts rows and prints token estimate before spending
money. Final step: `ANALYZE "Embedding";`.

Idempotent by construction — safe to rerun.

---

## 6. Cost estimate

`text-embedding-3-small` = $0.02 per 1M tokens.

- Corpus full backfill: ~50 projects (~300 tok) + ~20 builders (~180) +
  ~15 localities (~300) + ~30 infra (~60) ≈ **~25k tokens** = **$0.0005**.
- Query side: 10k chat messages/month × ~80 tokens/query = 800k tokens =
  **$0.016/month**.
- Writes (admin saves): negligible.

**Total under $0.05/month at current scale.** No budget gate needed.

---

## 7. Explicitly NOT in v1

- No chat-history RAG (conversation memory stays in `ChatSession` fields).
- No HyDE, no multi-vector embeddings, no re-ranking.
- No external vector DB (Pinecone / Upstash / Weaviate).
- No async/queue for embedding writes — admin saves are infrequent;
  synchronous-with-fallback is simpler.
- No per-sourceType filtering in the retriever — top-K across the whole
  corpus is fine at 5k rows. Revisit at 50k.
- No `faq` hooks in I2 (table ready, no admin UI).

---

## Handoff to implementation agents

### For I1 (rag-schema-migration, sonnet)

Scope: schema + migration only.

1. Add `Embedding` model to `prisma/schema.prisma` exactly as §1.
2. Run `npx prisma migrate dev --create-only --name add_rag_embeddings`.
3. Replace generated `migration.sql` body with:
   `CREATE EXTENSION IF NOT EXISTS vector;` + the Prisma-emitted
   `CREATE TABLE "Embedding"` + the ivfflat index in §1.
4. Apply with `npx prisma migrate dev`. Run `npx prisma generate`.
5. Verify: `npx prisma validate` passes, `npm run build` passes.

Deliverable: migration folder + schema diff. No code under
`src/lib/rag/`.

### For I2 (rag-embed-writer, sonnet)

Scope: write-path only. Depends on I1 landed.

1. Create `src/lib/rag/embed-writer.ts` per §3.
2. Add chunk template functions (`chunkForProject`, `chunkForBuilder`,
   `chunkForLocality`, `chunkForInfra`) per §2. Strict on sensitive-field
   exclusion; import `BuilderAIContext` type.
3. Wire hooks in admin routes for Project
   (`src/app/api/admin/projects/route.ts`, `[id]/route.ts`) and Builder
   (`src/app/api/admin/builders/route.ts`, `[id]/route.ts`) — POST +
   PATCH success paths. Skip Locality (no admin route). Call
   `invalidateContextCache()` alongside.
4. Create `scripts/embed-backfill.ts` per §5. Add `embed:backfill`
   npm script.
5. Run backfill once locally. Spot-check 3 rows in `prisma studio`.
6. `npm run build` must pass.

Deliverable: `embed-writer.ts`, 4 admin route edits, backfill script,
npm script registration. No changes to `retriever.ts` or
`/api/chat/route.ts`.

### For I3 (rag-retriever, sonnet)

Scope: read-path only. Depends on I1 landed; can run parallel with I2.

1. Create `src/lib/rag/retriever.ts` per §4, including the 600 ms
   timeout and `similarity >= 0.30` filter.
2. Extend `buildSystemPrompt` signature in `src/lib/system-prompt.ts`
   with an optional `retrievedChunks: RetrievedChunk[]` parameter.
   Render a `RELEVANT KNOWLEDGE (retrieved):` block after structured
   context, before the conversational rules tail.
3. In `src/app/api/chat/route.ts`, after `buildContextPayload()`
   (current line 116) insert
   `const retrieved = await retrieveChunks(sanitizedMsg).catch(() => [])`
   and pass through to `buildSystemPrompt`.
4. No changes to `response-checker.ts`, no changes to rate limits.
5. `npm run build` must pass. Smoke-test `/api/chat` manually with
   "tell me about Shela infrastructure" — verify a chunk appears.

Deliverable: `retriever.ts`, minimal edits to `system-prompt.ts` and
`/api/chat/route.ts`. No schema or admin-route changes.
