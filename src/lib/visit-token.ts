import { randomBytes } from 'crypto'

export function generateVisitToken(): string {
  const hex = randomBytes(3).toString('hex').toUpperCase()
  return `AG-${hex}`
}
