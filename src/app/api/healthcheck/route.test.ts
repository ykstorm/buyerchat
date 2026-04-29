import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: { $queryRaw: vi.fn() },
}))

import { GET } from './route'
import { prisma } from '@/lib/prisma'

const mPrisma = prisma as unknown as { $queryRaw: ReturnType<typeof vi.fn> }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/healthcheck', () => {
  it('returns 200 ok with commit + uptime + timestamp on DB reachable', async () => {
    mPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }])

    const res = await GET()

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(typeof body.uptime).toBe('number')
    expect(typeof body.timestamp).toBe('string')
    expect(mPrisma.$queryRaw).toHaveBeenCalledTimes(1)
  })

  it('returns 503 degraded when prisma $queryRaw rejects', async () => {
    mPrisma.$queryRaw.mockRejectedValue(new Error('connection refused'))

    const res = await GET()

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body).toEqual({ status: 'degraded', reason: 'db_unreachable' })
  })
})
