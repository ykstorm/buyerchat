// In-memory context cache with 5-min TTL.
//
// ⚠️ SHORT-TERM SOLUTION. Vercel serverless instances do not share memory —
// each cold-started container has its own cache. Under moderate traffic (container
// stays warm 10-15 min), this still gives a real hit rate since requests on the
// same warm container reuse the cached payload.
//
// MIGRATE TO UPSTASH REDIS before production launch. See backlog.md ISSUE-18/19.
// The same Redis client should also power the rate limiter (ISSUE-04).

const TTL_MS = 5 * 60 * 1000 // 5 minutes

type CacheEntry = {
  value: string
  expiresAt: number
}

// Module-level singleton — persists for the life of the container.
let entry: CacheEntry | null = null

export function getCachedContext(): string | null {
  if (!entry) return null
  if (Date.now() >= entry.expiresAt) {
    entry = null
    return null
  }
  return entry.value
}

export function setCachedContext(context: string): void {
  entry = {
    value: context,
    expiresAt: Date.now() + TTL_MS,
  }
}

export function invalidateContextCache(): void {
  entry = null
}
