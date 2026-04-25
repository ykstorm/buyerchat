import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'

export type RetrievedChunk = {
  sourceType: string
  sourceId: string
  content: string
  similarity: number
}

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Amenity-category keywords — when a buyer query contains any of these, we
// widen retrieval (lower threshold, higher K) and boost LocationData rows
// that match the detected category. This is the same dictionary used in
// context-builder.ts for GUARD_LIST injection; keep them in sync.
const AMENITY_CATEGORIES: Record<string, RegExp> = {
  park:      /\b(park|parks|garden|gardens)\b/i,
  hospital:  /\b(hospital|hospitals|clinic|clinics|healthcare)\b/i,
  atm:       /\b(atm|atms|cash\s*machine)\b/i,
  bank:      /\b(bank|banks|branch|branches)\b/i,
  school:    /\b(school|schools|college|colleges|university|universities|institute)\b/i,
  mall:      /\b(mall|malls|shopping|shop|store|supermarket|dmart|d-mart)\b/i,
  club:      /\b(club|clubs|gym|gyms|sports|fitness)\b/i,
  temple:    /\b(temple|temples|mandir)\b/i,
  transport: /\b(metro|brts|bus|transport|station|commute)\b/i,
}

export function detectAmenityCategories(query: string): string[] {
  const hit: string[] = []
  for (const [cat, rx] of Object.entries(AMENITY_CATEGORIES)) {
    if (rx.test(query)) hit.push(cat)
  }
  // ATM queries should also pull bank rows (and vice versa) — buyers use the
  // terms interchangeably and both live in LocationData.
  if (hit.includes('atm') && !hit.includes('bank')) hit.push('bank')
  if (hit.includes('bank') && !hit.includes('atm')) hit.push('atm')
  return hit
}

export async function retrieveChunks(
  query: string,
  k: number = 6
): Promise<RetrievedChunk[]> {
  // Amenity-category queries need more recall, not precision. A user asking
  // "ATMs near the galaxy" expects every bank row back, not just the top-6.
  // Widen K to 10 and drop the similarity floor to 0.20 so LocationData rows
  // with generic phrasing ("bank in South Bopal: HDFC") still surface.
  const amenityHits = detectAmenityCategories(query)
  const isAmenityQuery = amenityHits.length > 0
  const effectiveK = isAmenityQuery ? Math.max(k, 10) : k
  const simFloor = isAmenityQuery ? 0.2 : 0.3

  // Cold embeddings call can take 2s+; the DB query itself is sub-second.
  // Race only the DB query against a tight budget; let embeddings run free.
  const retrieval = (async (): Promise<RetrievedChunk[]> => {
    try {
      const embeddingRes = await openaiClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: query.slice(0, 2000),
      })
      const vec = embeddingRes.data[0].embedding
      const vecStr = `[${vec.join(',')}]`

      // Neon HTTP adapter does not support transactions, so SET LOCAL
      // ivfflat.probes is unavailable. At current N (~100 rows) the planner
      // does a fast sequential scan; revisit if we cross ~5k embeddings.
      // Cold Neon connections occasionally take 5s+ on first vector query —
      // amenity queries gate against fabrication, so it is worth the wait.
      const dbBudgetMs = isAmenityQuery ? 5000 : 1500
      const dbTimeout = new Promise<RetrievedChunk[]>((resolve) =>
        setTimeout(() => resolve([]), dbBudgetMs)
      )
      const dbQuery = prisma.$queryRawUnsafe<RetrievedChunk[]>(
        `SELECT "sourceType", "sourceId", "content",
          1 - (embedding <=> $1::vector) AS similarity
         FROM "Embedding"
         ORDER BY embedding <=> $1::vector
         LIMIT $2`,
        vecStr,
        effectiveK
      )
      const rows = await Promise.race([dbQuery, dbTimeout])

      const filtered = (rows as RetrievedChunk[]).filter(
        (r) => Number(r.similarity) >= simFloor
      )

      // Category boost: for amenity queries, promote location_data rows whose
      // content names the detected category so they appear above generic
      // builder/project chunks that merely lexically overlap. We do this by
      // re-sorting a computed score, not by mutating `similarity` (kept so
      // callers can still inspect the raw cosine distance).
      if (!isAmenityQuery) return filtered
      const boosted = filtered.map((r) => {
        let bonus = 0
        if (r.sourceType === 'location_data') {
          const contentLower = r.content.toLowerCase()
          if (amenityHits.some((c) => contentLower.startsWith(`${c} in `))) {
            bonus += 0.15
          } else {
            bonus += 0.05
          }
        }
        return { row: r, score: Number(r.similarity) + bonus }
      })
      boosted.sort((a, b) => b.score - a.score)
      return boosted.map((b) => b.row)
    } catch {
      return []
    }
  })()

  return retrieval
}
