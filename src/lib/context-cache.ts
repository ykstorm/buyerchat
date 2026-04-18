// Context cache — Upstash Redis with in-memory fallback for local dev.
//
// Redis key: "ctx:main" with 5-minute TTL.
// Falls back to module-level memory cache when UPSTASH env vars are absent.

import { Redis } from '@upstash/redis'

const TTL_SEC = 5 * 60 // 5 minutes
const CACHE_KEY = 'ctx:main'

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis) return redis
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = Redis.fromEnv()
  }
  return redis
}

// ── In-memory fallback (local dev) ──────────────────────────────────
type CacheEntry = { value: string; expiresAt: number }
let memEntry: CacheEntry | null = null

export async function getCachedContext(): Promise<string | null> {
  const client = getRedis()

  if (client) {
    const val = await client.get<string>(CACHE_KEY)
    return val ?? null
  }

  // Fallback
  if (!memEntry) return null
  if (Date.now() >= memEntry.expiresAt) {
    memEntry = null
    return null
  }
  return memEntry.value
}

export async function setCachedContext(context: string): Promise<void> {
  const client = getRedis()

  if (client) {
    await client.set(CACHE_KEY, context, { ex: TTL_SEC })
    return
  }

  // Fallback
  memEntry = { value: context, expiresAt: Date.now() + TTL_SEC * 1000 }
}

export async function invalidateContextCache(): Promise<void> {
  const client = getRedis()

  if (client) {
    await client.del(CACHE_KEY)
    return
  }

  memEntry = null
}
