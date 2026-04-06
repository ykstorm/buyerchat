import { Redis } from '@upstash/redis'

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis) return redis
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = Redis.fromEnv()
  }
  return redis
}

// In-memory fallback for local dev without Redis env vars
const fallbackMap = new Map<string, { count: number; resetAt: number }>()

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
  const entry = fallbackMap.get(ip)
  if (!entry || now > entry.resetAt) {
    fallbackMap.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}
