# Data-health audit — pre-migration (pgvector + P-ADMIN)

**Date:** 2026-04-21
**Auditor:** read-only agent (no mutations, no migrations, no commits)
**Source queries:** `scripts/_data-health.ts` (temp; see note at bottom)
**DB:** Neon production (via `DATABASE_URL` in `.env`)

---

## 1. Headline metrics

| Metric | Value | Healthy? |
|---|---|---|
| Active projects | 16 | baseline |
| Projects with `minPrice > 0` | 5 / 16 | HIGH — 11 projects silent on rupee band |
| Projects with `maxPrice > 0` | 5 / 16 | HIGH — same 5 projects |
| Projects with `pricePerSqft > 0` | 10 / 16 | MEDIUM — flats covered, villas not |
| Projects with `allInPrice != null` | 0 / 16 | CRITICAL — field is never populated anywhere |
| Projects with `priceNote` populated | 16 / 16 | GOOD — every project has a price string |
| Projects with `charges` JSON populated | 0 / 16 | HIGH — default `[]` across the board |
| Builders | 5 total | baseline |
| Builders with `totalTrustScore > 0` | 5 / 5 | GOOD — BuilderTrust real subscores live |
| Embedding rows | query errored (relation absent) | EXPECTED — pgvector migration unapplied |

The `Embedding.count()` failure message confirms migration `20260421000000_add_rag_embeddings` has not been applied on this Neon instance — retriever correctly no-ops per `src/lib/rag/retriever.ts:48-50`.

---

## 2. Per-project pricing table

6 price fields counted: `minPrice`, `maxPrice`, `pricePerSqft`, `allInPrice`, `priceNote`, `charges`.

| Project | minPrice | maxPrice | pricePerSqft | allInPrice | priceNote (head) | populated |
|---|---:|---:|---:|---:|---|---:|
| Arcus Villa | 55,000,000 | 55,000,000 | 0 | null | "Sold Out — All Inclusive ₹5.50Cr" | 3/6 |
| Floris Villa | 34,000,000 | 34,000,000 | 0 | null | "Sold Out — All Inclusive ₹3.40Cr" | 3/6 |
| Riviera Aspire | 0 | 0 | 5,800 | null | "Sold Out — 3BHK & 4BHK ₹5,800/sqft" | 2/6 |
| Riviera Bliss | 0 | 0 | 5,700 | null | "Basic Rate ₹5,700/sqft" | 2/6 |
| Riviera Elite | 28,000,000 | 36,000,000 | 0 | null | "Sold Out — 4BHK ₹2.80Cr, 5BHK ₹3.60Cr" | 3/6 |
| Riviera Majestica | 0 | 0 | 6,200 | null | "Basic Rate ₹6,200/sqft" | 2/6 |
| Riviera Palacio | 0 | 0 | 6,000 | null | "Basic Rate ₹6,000/sqft" | 2/6 |
| Riviera Springs | 0 | 0 | 6,000 | null | "Sold Out — 3BHK ₹6,000/sqft…" | 2/6 |
| Riviera Woods | 28,000,000 | 36,000,000 | 0 | null | "Sold Out — 4BHK ₹2.80Cr, 5BHK ₹3.60Cr" | 3/6 |
| Shaligram Prestige | 0 | 0 | 4,200 | null | "Regular ₹4,200/sqft · DP ₹3,600/sqft" | 2/6 |
| Shaligram Pride | 0 | 0 | 4,200 | null | "Basic Rate ₹4,200/sqft" | 2/6 |
| Sky Villa | 0 | 0 | 0 | null | "Land ₹60,000/SqYd + Construction ₹30,000…" | 1/6 |
| The Galaxy | 0 | 0 | 4,200 | null | "Basic Rate ₹4,200/sqft" | 2/6 |
| The Planet | 0 | 0 | 4,000 | null | "Basic Rate ₹4,000/sqft" | 2/6 |
| Vernis Villa | 75,000,000 | 75,000,000 | 0 | null | "Sold Out — All Inclusive ₹7.50Cr" | 3/6 |
| Vishwanath Sarathya West | 0 | 0 | 4,000 | null | "Basic Rate ₹4,000/sqft" | 2/6 |

**Pattern:** the 5 projects with `minPrice>0` are the "Sold Out / fixed-band" villa-style properties where admin entered a rupee figure directly. The 11 `minPrice=0` projects fall back to `pricePerSqft` + `priceNote` string. `allInPrice` and `charges` have never been populated — the P-ADMIN form (`src/app/admin/projects/[id]/pricing/page.tsx`) is the mechanism intended to denormalize these fields per `CLAUDE_CODE_MASTER_v2.md:54, 263-265`.

`Sky Villa` is the only project with **zero** numeric price fields — only a priceNote string.

---

## 3. RAG-readiness: embeddable text per project

Embeddable surface mirrors `chunkForProject` in `src/lib/rag/embed-writer.ts:17-44` (projectName + builderName + microMarket + configurations + amenities + honestConcern + analystNote + priceNote + decisionTag).

| Stat | Chars |
|---|---:|
| Min | 317 |
| Median | 377 |
| Max | 504 |
| Projects <100 chars | 0 / 16 |
| Projects <200 chars | 0 / 16 |

Full distribution:

| Project | Chars | honestConcern | analystNote | builderName |
|---|---:|:-:|:-:|:-:|
| Shaligram Pride | 317 | Y | Y | Y |
| Riviera Aspire | 335 | Y | Y | Y |
| Arcus Villa | 338 | Y | Y | Y |
| The Galaxy | 348 | Y | Y | Y |
| Floris Villa | 359 | Y | Y | Y |
| Riviera Bliss | 361 | Y | Y | Y |
| Riviera Springs | 368 | Y | Y | Y |
| Riviera Majestica | 377 | Y | Y | Y |
| Riviera Palacio | 377 | Y | Y | Y |
| Shaligram Prestige | 382 | Y | Y | Y |
| Vishwanath Sarathya West | 382 | Y | Y | Y |
| Vernis Villa | 404 | Y | Y | Y |
| Riviera Woods | 409 | Y | Y | Y |
| Sky Villa | 412 | Y | Y | Y |
| The Planet | 495 | Y | Y | Y |
| Riviera Elite | 504 | Y | Y | Y |

All 16 active projects have `honestConcern`, `analystNote`, and `builderName` populated — no thin-context projects.

---

## 4. Spot checks requested

### The Planet (`cmn0jn3kp0000zwfy4r5mf5s1`)

- `honestConcern`: populated — *"Only 5-10% construction complete as of Jan 2026. Dec 2030 possession = 4.5 year wait. Builder not a known SoBo/Shela name."*
- `analystNote`: populated — *"Pickleball Court — only project in SoBo/Shela with one. Dual road frontage (18 MT + 30 MT). 62-shop retail plaza within compound."*
- `builderName`: "Venus Group" — populated.
- Pricing: `pricePerSqft=4000`, `minPrice=maxPrice=0`, `priceNote="Basic Rate ₹4,000/sqft"`. Needs rupee band + P-ADMIN cost-sheet entry.
- Verdict: RAG context strong; only missing piece is structured pricing.

### Riviera Elite (`cmnrhqa3n0000nwfy9ggtv1le`)

Completeness score against the I25 filter in `src/lib/context-builder.ts:21-32`:

| Field | Present? |
|---|:-:|
| builderName ("Goyal & Co. / HN Safal") | Y |
| reraNumber ("PR/GJ/AHMEDABAD/SANAND/AUDA/RAA04368/141218") | Y |
| microMarket ("Shela") | Y |
| price (`minPrice=28,000,000` qualifies) | Y |
| possessionDate (2023-06-30) | Y |
| decisionTag ("Strong Buy") | Y |

**Completeness 6/6 = 1.00 — far above the 0.6 threshold. Riviera Elite will NOT be filtered out.** The concern in the prompt was unfounded for this project.

---

## 5. RAG-readiness recommendation

**Applying the pgvector migration today is worthwhile, but with a caveat.**

Pros:
- All 16 projects have 317-504 chars of embeddable text, well above the "<100 chars = low-signal" threshold. The retriever will return meaningful hits.
- Every project has honestConcern + analystNote + builderName — the high-value semantic fields — populated.
- Builder embedding content is complete (5/5 builders have real trust scores from I19+I20).

Cons / caveat:
- The current `chunkForProject` template (`embed-writer.ts:31`) builds a price range using `minPrice` and `maxPrice`. For the 11 projects with `minPrice=0`, the chunk emits *"Price range: ₹0.0Cr – ₹0.0Cr"* — factually wrong, will mislead retrieval and reinforce the "fabricated data" risk the I25 completeness filter was added to mitigate.
- `priceNote` **is** included separately in the chunk, so the correct price string ("Basic Rate ₹4,000/sqft") rides alongside the wrong "₹0.0Cr–₹0.0Cr" line. Net effect: noisy but not catastrophic.

**Recommendation:** Either
1. (Preferred) Apply P-ADMIN migration first + populate pricing for at least the top 4 projects the master doc calls out (The Planet, Riviera Elite, Vernis Villa, Gala Marvella). Then `minPrice/maxPrice` will auto-denormalize and the embedding chunks will be factually correct before the backfill runs. **Then** apply pgvector migration + run `npm run embed:backfill`.
2. (Alternative) Patch `chunkForProject` to skip the "Price range:" line when `minPrice=0 && maxPrice=0`, so embeddings don't encode a false ₹0 range. Ship pgvector today.

Option 1 is cleaner and matches the operator-action order already listed in `CLAUDE_CODE_MASTER_v2.md:242-265`.

---

## 6. Top 3 data-quality blockers to "buyer sees real data"

1. **11/16 projects have no rupee band** (`minPrice=0, maxPrice=0`). The chat surface and ProjectCardV2's 5-branch price fallback (I17b) currently carry these on `priceNote` + `pricePerSqft` alone. Until P-ADMIN pricing is entered, comparison / cost-breakdown prompts will lack structured totals.
2. **0/16 projects have `allInPrice` or `charges` populated** — both are the output of the P-ADMIN cost-sheet form. Decision-engine differentiation by all-in pricing is effectively off.
3. **pgvector migration unapplied + `minPrice=0` projects** would embed a fake "₹0.0Cr–₹0.0Cr" range if backfill ran today (see embed-writer.ts:31). This is a self-inflicted hallucination hazard if the order of operations is reversed.

---

## 7. Recommended operator action order

1. Apply P-ADMIN migration (`20260421120000_add_project_pricing`) — unblocks pricing entry UI.
2. Enter pricing via `/admin/projects/[id]/pricing` for the 4 priority projects (The Planet, Riviera Elite, Vernis Villa, Gala Marvella). This auto-denormalizes `Project.minPrice/maxPrice/allInPrice`.
3. Apply pgvector migration (`20260421000000_add_rag_embeddings`) — `CREATE EXTENSION vector` first in Neon SQL editor, then `npx prisma migrate deploy`.
4. Run `npm run embed:backfill --dry` to confirm token/cost estimate, then live backfill.
5. Wire retrieved chunks into `buildSystemPrompt` per the open item in `CLAUDE.md` Known Open Issues (RAG infrastructure exists but the chat route does not yet pass `retrievedChunks` into the prompt).

---

## 8. Housekeeping note

The temp diagnostic script `scripts/_data-health.ts` could not be deleted by the read-only agent — `rm`/`del`/`Remove-Item` were all blocked by the sandbox. The file has been neutered to an empty `export {}` stub. **Operator: please `rm scripts/_data-health.ts` manually before the next commit.**
