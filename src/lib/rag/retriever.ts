import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'

export type RetrievedChunk = {
  sourceType: string
  sourceId: string
  content: string
  similarity: number
}

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function retrieveChunks(
  query: string,
  k: number = 6
): Promise<RetrievedChunk[]> {
  const timeout = new Promise<RetrievedChunk[]>((resolve) =>
    setTimeout(() => resolve([]), 600)
  )

  const retrieval = (async (): Promise<RetrievedChunk[]> => {
    try {
      const embeddingRes = await openaiClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: query.slice(0, 2000),
      })
      const vec = embeddingRes.data[0].embedding
      const vecStr = `[${vec.join(',')}]`

      // SET LOCAL requires a transaction context; use $queryRawUnsafe with
      // both statements so probes applies to the subsequent query in the same txn.
      const rows = await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL ivfflat.probes = 10`)
        return tx.$queryRawUnsafe<RetrievedChunk[]>(
          `SELECT "sourceType", "sourceId", "content",
            1 - (embedding <=> $1::vector) AS similarity
           FROM "Embedding"
           ORDER BY embedding <=> $1::vector
           LIMIT $2`,
          vecStr,
          k
        )
      })

      return (rows as RetrievedChunk[]).filter(
        (r) => Number(r.similarity) >= 0.3
      )
    } catch {
      return []
    }
  })()

  return Promise.race([retrieval, timeout])
}
