# AGENTS.md — Fleet Root Source

This is the canonical root-source file. All subagents MUST read this first
and scope their work strictly to the role assigned below. The file is loaded
by human operators, by subagents during mandatory-startup (per
`.claude/rules/git-best-practices.md` section 2), and by the main thread
when assigning work.

> Keep this file short. If it grows past ~300 lines, split a section into
> `.claude/fleet/<topic>.md` and link from here.

---

## 1. Mission

Ship `homesty.ai` v1.0. The app is a Next.js 15 + Prisma 7 property-listing
chat that uses GPT-4o to help buyers decide. Hard-locked stack:
Next.js 15.2.2, Prisma 7, Auth.js v5 beta, Tailwind v4, Framer Motion v12,
Vercel AI SDK 6 (`ai` package), React 19, TypeScript strict.

Non-negotiables:
- Never upgrade beyond the locked stack versions.
- Deployable to Vercel Fluid Compute on Node.js 24 (no Edge-only APIs).
- No test suite exists — validation is `npm run build` + manual browser test.

---

## 2. RAG Architecture (v1 decision)

**Vector store: Neon Postgres + pgvector.** Already on Neon; no new service.
Platform-native, one DB to back up, one connection pool to tune.

**Embedding model:** `text-embedding-3-small` (1536 dim, cheap, OpenAI key
already wired). Generated server-side at write time, not on every query.

**Corpus & schema (new table, to be added in a migration):**

```prisma
model Embedding {
  id         String                 @id @default(cuid())
  sourceType String   // 'project' | 'builder' | 'locality' | 'infra' | 'faq'
  sourceId   String   // FK-shaped but not declared (polymorphic)
  content    String   @db.Text      // the chunk text used to embed
  embedding  Unsupported("vector(1536)")
  tokens     Int
  createdAt  DateTime @default(now())

  @@index([sourceType, sourceId])
  // ivfflat index added by raw migration SQL; Prisma can't model it yet
}
```

**Retrieval pipeline (replaces `context-cache.ts` warm-path in time, does
not replace it now):**

1. `context-builder.ts` continues to pull structured rows (projects,
   localities, infra) for the current query's filters.
2. NEW: `rag-retriever.ts` embeds the user's message, runs `<=> ` cosine
   similarity against `Embedding`, returns top-K (K=6 initially) chunks.
3. Merge retrieved chunks into the system-prompt window AFTER the
   structured context, BEFORE the conversation history.
4. `response-checker.ts` continues to gate leaks — unchanged.

**What NOT to do in v1:**
- No external vector DB (Pinecone, Upstash, Weaviate). Kills portability.
- No embedding re-generation on every write (batch on admin save; async).
- No multi-vector or HyDE yet. Optimize K and chunk size first.
- No RAG for chat-history retrieval yet (scope creep — do corpus first).

---

## 3. The 15-Agent Fleet

Every agent has a single scope. Agents never write outside their scope. If
an agent discovers an issue outside its scope, it files a note in its
returned report — it does NOT edit the file.

Model tiers (controlled via the `model` parameter on the Agent tool):

| Tier   | Model         | When                                         |
|--------|---------------|----------------------------------------------|
| opus   | Opus 4.7      | Design/architecture; reads many files        |
| sonnet | Sonnet 4.6    | Implementation work; focused file edits      |
| haiku  | Haiku 4.5     | Mechanical audits (grep-heavy, no synthesis) |

Note: Only Anthropic models are callable from subagents. Requests for Pi /
Gemini / other providers must be filed as human-side changes.

### Research/audit cohort (read-only, parallel, run first)

| #  | Agent                      | Tier   | Scope                                                                |
|----|----------------------------|--------|----------------------------------------------------------------------|
| R1 | backend-audit              | sonnet | All `src/app/api/**` routes: auth, validation, rate limits, errors  |
| R2 | frontend-audit             | sonnet | `src/app/**` pages, `src/components/**`: a11y, perf, dark-mode, SSR |
| R3 | rag-design                 | opus   | Produce concrete RAG schema + retrieval code sketch per section 2    |
| R4 | system-prompt-audit        | sonnet | `src/lib/system-prompt.ts` + `few-shot-examples.ts` consistency      |
| R5 | decision-engine-audit      | sonnet | `src/lib/decision-engine/**` correctness, weight sanity              |
| R6 | build-perf-audit           | haiku  | Bundle report, slow routes, cold-start triggers                      |
| R7 | db-query-audit             | haiku  | N+1s, unindexed query sites, missing `select` narrowing              |

### Implementation cohort (writes, runs after research lands)

| #   | Agent                      | Tier   | Scope                                                               |
|-----|----------------------------|--------|---------------------------------------------------------------------|
| I1  | rag-schema-migration       | sonnet | Prisma migration + pgvector extension + `Embedding` model           |
| I2  | rag-embed-writer           | sonnet | `src/lib/rag/embed-writer.ts` + hooks on admin save for project/builder |
| I3  | rag-retriever              | sonnet | `src/lib/rag/retriever.ts` called from `context-builder.ts`         |
| I4  | backend-p0-fixer           | sonnet | Consumes R1's report; applies P0/P1 fixes only                      |
| I5  | frontend-p0-fixer          | sonnet | Consumes R2's report; applies P0/P1 fixes only                      |
| I6  | decision-engine-fixer      | sonnet | Consumes R5's report; applies correctness fixes                     |
| I7  | doc-writer                 | haiku  | Update `CLAUDE.md` backlog section to reflect reality               |
| I8  | verification-runner        | sonnet | `npm run build`, `npx prisma validate`, smoke-test `/api/chat`      |

Total: 15 agents (7 research + 8 implementation). Main thread coordinates,
commits, and runs the verification agent at the end of each cohort.

---

## 4. Shared Conventions

Agents MUST follow these. They are contract, not suggestion.

**Commits.** One logical change per commit. Conventional prefix
(`feat:`, `fix:`, `perf:`, `chore:`). Body explains the *why*, not the
*what*. Trailer: `Co-Authored-By: Claude <model> <noreply@anthropic.com>`.

**File edits.** Use `Edit` for targeted diffs, `Write` only for brand-new
files or full rewrites. Never edit files outside your declared scope.

**Build verification.** Before reporting a task complete, an implementation
agent MUST run `npm run build` and include the build status in its report.
If the build fails, the agent keeps working — do not hand back a broken
tree.

**Comments.** Prefer naming. Only write a comment when the *why* is
non-obvious. Never write task-log comments like "added for R3 feedback".

**No hypothetical abstractions.** Three similar lines beats a premature
helper. Build for the v1.0 surface, not for imagined v2 flexibility.

**Scope discipline.** If a P0 falls in your lane and a P2 beside it needs
touching for the P0 to land, fix both. If a P2 is beside your lane but
unrelated, file it in the report and leave it.

---

## 5. Startup Protocol for Subagents

Every subagent invocation MUST, as its first action:

1. Read this file (`.claude/AGENTS.md`).
2. Read `CLAUDE.md` for project-specific gotchas.
3. Read its own scope row in section 3 and confirm it understands the
   bounds.
4. If the scope is unclear or appears to overlap with another agent's row,
   return a clarification request instead of guessing.

---

## 6. Report Format

All research-cohort agents return findings in this structure:

```
## Summary (3 sentences max)

## P0 (ship-blocker)
- file:line — what is wrong, why it blocks ship, concrete fix

## P1 (before GA)
- file:line — same shape

## P2 (nice to have)
- file:line — same shape

## Out-of-scope notes (for other agents)
- agent-name: short handoff note
```

Implementation-cohort agents return:

```
## Changed files
- path/to/file.ts — one line on the change

## Build status
- `npm run build` — pass/fail (+ tail if fail)

## Follow-ups discovered
- short list; don't fix, just report
```

---

## 7. Versioning this file

This doc is v1.0. Any change to sections 2 or 3 requires a commit of its
own (`docs(agents): ...`) so agents spawned after the change see a coherent
tree. Do not intersperse AGENTS.md edits with code edits.
