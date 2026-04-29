import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { existsSync } from 'fs'
import { resolve } from 'path'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))
vi.mock('@/lib/audit-write', () => ({ auditWrite: vi.fn() }))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))

// Puppeteer mocks — driven per-test via the page.* / launch.* spies.
const mockPage = {
  setUserAgent: vi.fn(),
  goto: vi.fn(),
  evaluate: vi.fn(),
}
const mockBrowser = {
  newPage: vi.fn(() => mockPage),
  close: vi.fn(),
}
const mockLaunch = vi.fn(() => mockBrowser)

vi.mock('puppeteer-core', () => ({
  default: { launch: mockLaunch },
}))
vi.mock('@sparticuz/chromium', () => ({
  default: {
    args: [],
    executablePath: () => Promise.resolve('/mock-chromium'),
    headless: true,
  },
}))

import { POST } from './route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { auditWrite } from '@/lib/audit-write'

const mAuth = auth as unknown as ReturnType<typeof vi.fn>
const mAuditWrite = auditWrite as unknown as ReturnType<typeof vi.fn>
const mPrisma = prisma as unknown as {
  project: {
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

const ADMIN_EMAIL = 'mama@example.com'
const VALID_RERA = 'PR/GJ/AHMEDABAD/AHMEDABAD-CITY/AUDA/RAA09134/300924'

function makeRequest(body: Record<string, unknown>): NextRequest {
  const req = new Request('http://localhost/api/rera-fetch', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
  return req as unknown as NextRequest
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ADMIN_EMAIL = ADMIN_EMAIL
  mAuth.mockResolvedValue({ user: { email: ADMIN_EMAIL } })
  // Default scrape result — happy path
  mockPage.evaluate.mockResolvedValue({
    projectName: 'Riviera Bliss',
    builderName: 'Goyal & Co.',
    possessionDate: 'December 2030',
    totalUnits: '120',
    reraStatus: 'Active',
    escrowBank: 'HDFC',
    complaints: '0',
    rawText: 'Sample RERA page text',
  })
  mockPage.goto.mockResolvedValue(undefined)
  mockPage.setUserAgent.mockResolvedValue(undefined)
  mockBrowser.close.mockResolvedValue(undefined)
})

afterEach(() => {
  delete process.env.ADMIN_EMAIL
})

describe('rera-fetch — cache HIT (within 7-day TTL)', () => {
  it('returns source: "cache" without launching puppeteer when verifiedAt < 7d', async () => {
    mPrisma.project.findUnique.mockResolvedValue({
      reraData: { source: 'puppeteer', fetchedAt: '2026-04-25T00:00:00.000Z' },
      reraVerified: true,
      reraVerifiedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      reraNumber: VALID_RERA,
    })

    const res = await POST(makeRequest({ reraNumber: VALID_RERA, projectId: 'proj-1' }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.source).toBe('cache')
    expect(body.data).toMatchObject({ source: 'puppeteer' })
    expect(mockLaunch).not.toHaveBeenCalled()
    expect(mPrisma.project.update).not.toHaveBeenCalled()
    expect(mAuditWrite).not.toHaveBeenCalled()
  })
})

describe('rera-fetch — cache MISS (TTL expired)', () => {
  it('triggers scrape + persistVerification + auditWrite when verifiedAt > 7d', async () => {
    mPrisma.project.findUnique.mockResolvedValue({
      reraData: { source: 'puppeteer' },
      reraVerified: true,
      reraVerifiedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      reraNumber: VALID_RERA,
    })
    mPrisma.project.update.mockResolvedValue({ id: 'proj-1' })
    mAuditWrite.mockResolvedValue(2)

    const res = await POST(makeRequest({ reraNumber: VALID_RERA, projectId: 'proj-1' }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.source).toBe('puppeteer')
    expect(mockLaunch).toHaveBeenCalledTimes(1)
    expect(mPrisma.project.update).toHaveBeenCalledTimes(1)
    expect(mPrisma.project.update.mock.calls[0][0]).toMatchObject({
      where: { id: 'proj-1' },
    })
    expect(mPrisma.project.update.mock.calls[0][0].data.reraVerified).toBe(true)
    expect(mAuditWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'Project',
        entityId: 'proj-1',
        action: 'verify_rera',
        actor: ADMIN_EMAIL,
      }),
    )
  })
})

describe('rera-fetch — force=true bypasses fresh cache', () => {
  it('scrapes even when cache is fresh, when force flag set', async () => {
    mPrisma.project.findUnique.mockResolvedValue({
      reraData: { source: 'puppeteer' },
      reraVerified: true,
      reraVerifiedAt: new Date(), // just now
      reraNumber: VALID_RERA,
    })
    mPrisma.project.update.mockResolvedValue({ id: 'proj-1' })
    mAuditWrite.mockResolvedValue(2)

    const res = await POST(
      makeRequest({ reraNumber: VALID_RERA, projectId: 'proj-1', force: true }),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.source).toBe('puppeteer')
    expect(mPrisma.project.findUnique).not.toHaveBeenCalled()
    expect(mockLaunch).toHaveBeenCalledTimes(1)
    expect(mAuditWrite).toHaveBeenCalledTimes(1)
  })
})

describe('rera-fetch — RERA_GEO_BLOCKED on scrape failure', () => {
  it('returns 200 ok:false on timeout-shaped error and does NOT flip reraVerified', async () => {
    mPrisma.project.findUnique.mockResolvedValue(null) // no existing cache
    mockLaunch.mockImplementationOnce(() => {
      throw new Error('Navigation timeout of 30000 ms exceeded')
    })

    const res = await POST(makeRequest({ reraNumber: VALID_RERA, projectId: 'proj-1' }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.code).toBe('RERA_GEO_BLOCKED')
    expect(mPrisma.project.update).not.toHaveBeenCalled()
    expect(mAuditWrite).not.toHaveBeenCalled()
  })
})

describe('rera-fetch — reraNumber regex (Block E4)', () => {
  it('returns 400 when reraNumber contains a space', async () => {
    const res = await POST(makeRequest({ reraNumber: 'INVALID SPACE' }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/regex|^reraNumber must match/i)
    expect(mPrisma.project.findUnique).not.toHaveBeenCalled()
    expect(mockLaunch).not.toHaveBeenCalled()
  })
})

describe('rera-verify duplicate scraper — deletion lock-in', () => {
  it('the orphaned route file no longer exists', () => {
    const path = resolve(__dirname, '../admin/rera-verify/route.ts')
    expect(existsSync(path)).toBe(false)
  })
})

describe('rera-fetch — manualPayload (operator paste, no scrape)', () => {
  it('skips puppeteer and persists with source=manual when projectId provided', async () => {
    mPrisma.project.update.mockResolvedValue({ id: 'proj-1' })
    mAuditWrite.mockResolvedValue(2)

    const res = await POST(
      makeRequest({
        reraNumber: VALID_RERA,
        projectId: 'proj-1',
        manualPayload: '{"reraNumber":"PR/...","status":"Active"}',
      }),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ success: true, source: 'manual' })

    expect(mockLaunch).not.toHaveBeenCalled()
    expect(mPrisma.project.findUnique).not.toHaveBeenCalled()
    expect(mPrisma.project.update).toHaveBeenCalledTimes(1)
    expect(mPrisma.project.update.mock.calls[0][0].data.reraVerified).toBe(true)
    // operator + raw captured in reraData blob (per AGENT_DISCIPLINE §7)
    const reraData = mPrisma.project.update.mock.calls[0][0].data.reraData
    expect(reraData.source).toBe('manual')
    expect(reraData.scrapedFields).toMatchObject({ operator: ADMIN_EMAIL })

    expect(mAuditWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'Project',
        entityId: 'proj-1',
        action: 'verify_rera',
        actor: ADMIN_EMAIL,
      }),
    )
  })

  it('returns 400 when manualPayload is provided without projectId', async () => {
    const res = await POST(
      makeRequest({
        reraNumber: VALID_RERA,
        manualPayload: '{"foo":"bar"}',
      }),
    )

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/projectId is required/i)
    expect(mockLaunch).not.toHaveBeenCalled()
    expect(mPrisma.project.update).not.toHaveBeenCalled()
    expect(mAuditWrite).not.toHaveBeenCalled()
  })
})
