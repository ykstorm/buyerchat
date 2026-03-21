let cachedContext: string | null = null
let cacheExpiresAt: number = 0

export function getCachedContext(): string | null {
  if (Date.now() < cacheExpiresAt && cachedContext) {
    return cachedContext
  }
  return null
}

export function setCachedContext(context: string): void {
  cachedContext = context
  cacheExpiresAt = Date.now() + 5 * 60 * 1000 // 5 minutes
}

export function invalidateContextCache(): void {
  cachedContext = null
  cacheExpiresAt = 0
}