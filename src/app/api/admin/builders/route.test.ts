import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    builder: { create: vi.fn() },
  },
}))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn() }))
vi.mock('@/lib/audit-write', () => ({ auditWrite: vi.fn() }))
vi.mock('@/lib/context-cache', () => ({ invalidateContextCache: vi.fn() }))
vi.mock('@/lib/rag/embed-writer', () => ({ embedBuilder: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/sanitize', () => ({ sanitizeAdminInput: (s: string) => s }))
vi.mock('@/lib/grade', () => ({
  computeGrade: (n: number) => (n >= 85 ? 'A' : n >= 70 ? 'B' : n >= 55 ? 'C' : 'D'),
}))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))

import { POST } from './route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { auditWrite } from '@/lib/audit-write'

const mAuth = auth as unknown as ReturnType<typeof vi.fn>
const mRateLimit = rateLimit as unknown as ReturnType<typeof vi.fn>
const mAuditWrite = auditWrite as unknown as ReturnType<typeof vi.fn>
const mPrisma = prisma as unknown as {
  builder: { create: ReturnType<typeof vi.fn> }
}

const ADMIN_EMAIL = 'mama@example.com'

const validPayload = {
  builderName: 'Goyal & Co. / HN Safal',
  brandName: 'Goyal & Co.',
  deliveryScore: 25,
  reraScore: 18,
  qualityScore: 16,
  financialScore: 12,
  responsivenessScore: 11,
  partnerStatus: true,
  commissionRatePct: 1.5,
  contactEmail: 'ops@example.com',
  contactPhone: '+91 9000000000',
}

function makeRequest(body: unknown): NextRequest {
  const req = new Request('http://localhost/api/admin/builders', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '1.2.3.4',
    },
  })
  return req as unknown as NextRequest
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ADMIN_EMAIL = ADMIN_EMAIL
  mAuth.mockResolvedValue({ user: { email: ADMIN_EMAIL } })
  mRateLimit.mockResolvedValue(true)
  mAuditWrite.mockResolvedValue(2)
})

afterEach(() => {
  delete process.env.ADMIN_EMAIL
})

describe('POST /api/admin/builders — happy path', () => {
  it('creates Builder with createdBy and triggers auditWrite { action: create }', async () => {
    mPrisma.builder.create.mockResolvedValue({
      id: 'b-1',
      builderName: 'Goyal & Co. / HN Safal',
      brandName: 'Goyal & Co.',
      totalTrustScore: 82,
      grade: 'B',
    })

    const res = await POST(makeRequest(validPayload))

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toMatchObject({
      id: 'b-1',
      builderName: 'Goyal & Co. / HN Safal',
      grade: 'B',
    })

    // createdBy stamped
    expect(mPrisma.builder.create).toHaveBeenCalledTimes(1)
    const createArg = mPrisma.builder.create.mock.calls[0][0]
    expect(createArg.data.createdBy).toBe(ADMIN_EMAIL)
    expect(createArg.data.totalTrustScore).toBe(82)

    // Genesis auditWrite — action 'create', actor email, post-create
    expect(mAuditWrite).toHaveBeenCalledTimes(1)
    expect(mAuditWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'Builder',
        entityId: 'b-1',
        action: 'create',
        actor: ADMIN_EMAIL,
      }),
    )
  })
})

describe('POST /api/admin/builders — duplicate builderName', () => {
  it('returns 409 on Prisma P2002 unique violation', async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`builderName`)',
      { code: 'P2002', clientVersion: 'test' },
    )
    mPrisma.builder.create.mockRejectedValue(p2002)

    const res = await POST(makeRequest(validPayload))

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/already exists/i)
    expect(mAuditWrite).not.toHaveBeenCalled()
  })
})

describe('POST /api/admin/builders — invalid Zod payload', () => {
  it('returns 400 when deliveryScore exceeds the 30 max', async () => {
    const bad = { ...validPayload, deliveryScore: 999 }
    const res = await POST(makeRequest(bad))

    expect(res.status).toBe(400)
    expect(mPrisma.builder.create).not.toHaveBeenCalled()
    expect(mAuditWrite).not.toHaveBeenCalled()
  })
})

describe('POST /api/admin/builders — auth + rate-limit', () => {
  it('returns 401 when caller email is not the admin', async () => {
    mAuth.mockResolvedValue({ user: { email: 'random@example.com' } })
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(401)
    expect(mPrisma.builder.create).not.toHaveBeenCalled()
  })

  it('returns 429 with Retry-After when rate limit fires', async () => {
    mRateLimit.mockResolvedValue(false)
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('60')
    expect(mRateLimit).toHaveBeenCalledWith(
      `builder-create:${ADMIN_EMAIL}:1.2.3.4`,
      5,
      60_000,
    )
  })
})
