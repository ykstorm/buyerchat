// Context cache disabled — Vercel serverless instances don't share memory.
// Each request fetches fresh from DB. At 16 projects this is fast enough.
// Re-enable with Redis (Upstash) when project count exceeds 100.

export function getCachedContext(): string | null {
  return null
}

export function setCachedContext(_context: string): void {
  // no-op
}

export function invalidateContextCache(): void {
  // no-op
}
