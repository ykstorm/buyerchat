// Admin surface cache — short-TTL Redis cache for expensive admin SSR queries.
//
// Mirrors the pattern in `src/lib/context-cache.ts`:
//   - Uses Upstash Redis when UPSTASH_REDIS_REST_URL/TOKEN are set.
//   - Falls back to a bounded in-memory Map for local dev.
//
// Designed for small, stringified JSON payloads (admin list views).
// NOT a replacement for the context cache — keyspace is segregated by prefix.

import { Redis } from '@upstash/redis'

const DEFAULT_TTL_SEC = 60 // 60 seconds — tight window to bound staleness post-mutation
const KEY_PREFIX = 'admin:'

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis) return redis
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = Redis.fromEnv()
  }
  return redis
}

// ── In-memory fallback (local dev, bounded) ─────────────────────────
type MemEntry = { value: string; expiresAt: number }
const memStore = new Map<string, MemEntry>()
const MAX_MEM_ENTRIES = 128

function memGet(key: string): string | null {
  const entry = memStore.get(key)
  if (!entry) return null
  if (Date.now() >= entry.expiresAt) {
    memStore.delete(key)
    return null
  }
  return entry.value
}

function memSet(key: string, value: string, ttlSec: number): void {
  if (memStore.size >= MAX_MEM_ENTRIES) {
    // Drop the oldest-expiring entry.
    let oldestKey: string | null = null
    let oldestExp = Infinity
    for (const [k, v] of memStore) {
      if (v.expiresAt < oldestExp) {
        oldestExp = v.expiresAt
        oldestKey = k
      }
    }
    if (oldestKey) memStore.delete(oldestKey)
  }
  memStore.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 })
}

function memDelByPrefix(prefix: string): void {
  for (const k of memStore.keys()) {
    if (k.startsWith(prefix)) memStore.delete(k)
  }
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Fetch a cached JSON payload. Returns the parsed value or null on miss/failure.
 * Failures (Redis error, stale JSON) are swallowed so the caller can fall
 * through to the origin query — admin pages must never break on cache issues.
 */
export async function getAdminCache<T>(key: string): Promise<T | null> {
  const fullKey = KEY_PREFIX + key
  try {
    const client = getRedis()
    if (client) {
      const val = await client.get<string>(fullKey)
      if (!val) return null
      // Upstash @upstash/redis auto-parses JSON when the stored value is valid
      // JSON. Accept either shape defensively.
      if (typeof val === 'string') {
        try {
          return JSON.parse(val) as T
        } catch {
          return null
        }
      }
      return val as unknown as T
    }
    const raw = memGet(fullKey)
    if (!raw) return null
    try {
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  } catch (err) {
    console.warn('[admin-cache] get failed:', err)
    return null
  }
}

/**
 * Store a JSON-serializable payload. TTL defaults to 60s.
 * Non-serializable values or Redis errors are swallowed.
 */
export async function setAdminCache<T>(
  key: string,
  value: T,
  ttlSec: number = DEFAULT_TTL_SEC,
): Promise<void> {
  const fullKey = KEY_PREFIX + key
  try {
    const serialized = JSON.stringify(value)
    const client = getRedis()
    if (client) {
      await client.set(fullKey, serialized, { ex: ttlSec })
      return
    }
    memSet(fullKey, serialized, ttlSec)
  } catch (err) {
    console.warn('[admin-cache] set failed:', err)
  }
}

/**
 * Invalidate every cache entry whose key starts with `prefix`.
 * Uses SCAN on Redis (safe for small keyspaces); falls back to Map iteration.
 */
export async function invalidateAdminCache(prefix: string): Promise<void> {
  const fullPrefix = KEY_PREFIX + prefix
  try {
    const client = getRedis()
    if (client) {
      // Upstash supports SCAN; match pattern and delete in small batches.
      let cursor = 0
      do {
        const [next, keys] = await client.scan(cursor, { match: fullPrefix + '*', count: 100 })
        cursor = Number(next) || 0
        if (keys.length > 0) {
          await client.del(...keys)
        }
      } while (cursor !== 0)
      return
    }
    memDelByPrefix(fullPrefix)
  } catch (err) {
    console.warn('[admin-cache] invalidate failed:', err)
  }
}
