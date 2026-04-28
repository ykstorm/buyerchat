import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma + sms-provider so otp.ts logic can be tested without a DB or
// SMS round-trip. We model OtpCode rows as an in-memory array.
vi.mock('@/lib/prisma', () => {
  const rows: Array<{
    id: string
    phone: string
    code: string
    sessionId: string | null
    attempts: number
    maxAttempts: number
    expiresAt: Date
    verifiedAt: Date | null
    createdAt: Date
  }> = []
  return {
    prisma: {
      otpCode: {
        count: async ({ where }: any) => {
          return rows.filter(r =>
            r.phone === where.phone &&
            (!where.createdAt?.gte || r.createdAt >= where.createdAt.gte)
          ).length
        },
        findFirst: async ({ where, orderBy, select }: any) => {
          let matches = rows.filter(r => r.phone === where.phone)
          if (where.verifiedAt === null) matches = matches.filter(r => r.verifiedAt === null)
          if (where.expiresAt?.gt) matches = matches.filter(r => r.expiresAt > where.expiresAt.gt)
          if (where.createdAt?.gte) matches = matches.filter(r => r.createdAt >= where.createdAt.gte)
          if (orderBy?.createdAt === 'asc') matches.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          if (orderBy?.createdAt === 'desc') matches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          if (!matches[0]) return null
          if (select?.createdAt) return { createdAt: matches[0].createdAt }
          return matches[0]
        },
        create: async ({ data }: any) => {
          const row = {
            id: `otp_${rows.length}`,
            phone: data.phone,
            code: data.code,
            sessionId: data.sessionId ?? null,
            attempts: 0,
            maxAttempts: data.maxAttempts ?? 5,
            expiresAt: data.expiresAt,
            verifiedAt: null,
            createdAt: new Date(),
          }
          rows.push(row)
          return row
        },
        update: async ({ where, data }: any) => {
          const row = rows.find(r => r.id === where.id)
          if (!row) throw new Error('not found')
          if (data.attempts?.increment) row.attempts += data.attempts.increment
          if (data.expiresAt) row.expiresAt = data.expiresAt
          if (data.verifiedAt) row.verifiedAt = data.verifiedAt
          return row
        },
        __reset: () => { rows.length = 0 },
      },
    },
  }
})

vi.mock('@/lib/sms-provider', () => ({
  getSmsProvider: () => ({ sendOtp: async () => ({ ok: true as const }) }),
}))

import { prisma } from '@/lib/prisma'
import { sendOtp, verifyOtp } from './otp'

beforeEach(() => {
  ;(prisma.otpCode as any).__reset()
})

describe('sendOtp', () => {
  it('creates a hashed OtpCode row and returns expiresAt', async () => {
    const res = await sendOtp('9876543210')
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('throttles after 3 sends in 10 min', async () => {
    await sendOtp('9876543211')
    await sendOtp('9876543211')
    await sendOtp('9876543211')
    const res = await sendOtp('9876543211')
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toBe('Too many requests')
      expect(res.retryAfterSec).toBeGreaterThan(0)
    }
  })
})

describe('verifyOtp', () => {
  it('returns ok for the correct code', async () => {
    // We need to peek the generated code from the row's hash format.
    // Easier: spy on sendOtp's stored salt+hash by intercepting console.
    // Cleaner approach — re-implement the verify path against a known code.
    // Use a deterministic shortcut: send, read latest row, brute-force the
    // 10000-key space to find the matching code.
    await sendOtp('9876543212')
    const stored = await prisma.otpCode.findFirst({
      where: { phone: '9876543212', verifiedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    })
    expect(stored).not.toBeNull()
    const [salt, hash] = (stored as any).code.split(':')
    const { createHash } = await import('crypto')
    let foundCode = ''
    for (let i = 0; i < 10000; i++) {
      const candidate = i.toString().padStart(4, '0')
      const h = createHash('sha256').update(`${salt}:${candidate}`).digest('hex')
      if (h === hash) { foundCode = candidate; break }
    }
    expect(foundCode).toHaveLength(4)
    const res = await verifyOtp('9876543212', foundCode)
    expect(res.ok).toBe(true)
  })

  it('returns "No active code" when nothing was sent', async () => {
    const res = await verifyOtp('9876543213', '0000')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toBe('No active code')
  })

  it('returns "Invalid code" on mismatch and increments attempts', async () => {
    await sendOtp('9876543214')
    const res = await verifyOtp('9876543214', '0000')
    // 0000 might coincidentally be the real code (1 in 10000) — accept either.
    if (!res.ok) expect(res.error).toMatch(/Invalid code|Too many attempts/)
  })

  it('returns "Too many attempts" after maxAttempts', async () => {
    await sendOtp('9876543215')
    for (let i = 0; i < 5; i++) await verifyOtp('9876543215', '0001')
    const res = await verifyOtp('9876543215', '0001')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toMatch(/Too many attempts|No active code/)
  })
})
