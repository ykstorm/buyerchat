import { randomUUID } from 'crypto'

export function generateVisitToken(): string {
  return randomUUID()
}