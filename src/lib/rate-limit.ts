import { Redis } from '@upstash/redis'

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis) return redis
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = Redis.fromEnv()
  }
  return redis
}

// In-memory fallback for local dev without Redis env vars.
// Hardened vs. audit findings:
//   (1) Race condition — read-modify-write compressed into a single synchronous
//       step. Node's event loop is single-threaded, so an atomic Map.set between
//       awaits guarantees no interleaving within this function.
//   (2) Memory leak — opportunistic eviction on each call when the Map crosses
//       MAX_ENTRIES; expired buckets are pruned, and if the Map is still over
//       capacity, the oldest (earliest resetAt) entries are dropped. No timers,
//       so serverless cold starts stay clean.
const fallbackMap = new Map<string, { count: number; resetAt: number }>()
const MAX_ENTRIES = 10000
const EVICT_TARGET = 8000

function evict(now: number): void {
  // Prune expired buckets first — cheap and usually sufficient.
  for (const [key, entry] of fallbackMap) {
    if (now > entry.resetAt) fallbackMap.delete(key)
  }
  if (fallbackMap.size <= EVICT_TARGET) return
  // Still over capacity (active flood from many IPs). Drop the buckets that
  // expire soonest — those are closest to being useless anyway.
  const sorted = [...fallbackMap.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt)
  const toRemove = fallbackMap.size - EVICT_TARGET
  for (let i = 0; i < toRemove; i++) {
    fallbackMap.delete(sorted[i][0])
  }
}

export async function rateLimit(ip: string, limit: number, windowMs: number): Promise<boolean> {
  const client = getRedis()

  if (client) {
    const windowSec = Math.ceil(windowMs / 1000)
    const key = `rl:${ip}:${windowSec}`
    const count = await client.incr(key)
    if (count === 1) {
      await client.expire(key, windowSec)
    }
    return count <= limit
  }

  // Fallback: in-memory (local dev only)
  const now = Date.now()

  // Opportunistic eviction — runs only when the Map is crowded, so the common
  // path stays O(1). Upper-bounds memory at MAX_ENTRIES buckets.
  if (fallbackMap.size >= MAX_ENTRIES) {
    evict(now)
  }

  const entry = fallbackMap.get(ip)
  if (!entry || now > entry.resetAt) {
    // Atomic: single Map.set replaces any expired entry in one step.
    fallbackMap.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  // Atomic: mutate-in-place then re-set. Both lookups happen synchronously
  // between awaits, so no other rateLimit() call can interleave and double-count.
  const nextCount = entry.count + 1
  if (nextCount > limit) return false
  entry.count = nextCount
  fallbackMap.set(ip, entry)
  return true
}
