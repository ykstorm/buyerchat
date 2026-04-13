import { randomBytes } from 'crypto'

const TOKEN_VALIDITY_DAYS = 90

export function generateVisitToken(): string {
  const hex = randomBytes(3).toString('hex').toUpperCase()
  return `AG-${hex}`
}

export function getTokenExpiryDate(from?: Date): Date {
  const d = from ? new Date(from) : new Date()
  d.setDate(d.getDate() + TOKEN_VALIDITY_DAYS)
  return d
}

export function isTokenExpired(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) return false // legacy tokens without expiry are never considered expired
  return new Date() > new Date(expiresAt)
}

export const TOKEN_VALIDITY_DAYS_COUNT = TOKEN_VALIDITY_DAYS
