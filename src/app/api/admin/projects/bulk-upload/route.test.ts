import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn() }))
vi.mock('@/lib/audit-write', () => ({ auditWrite: vi.fn() }))
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
  project: {
    findMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
}

const ADMIN_EMAIL = 'mama@example.com'

const HEADER_CSV = `name,builder,zone,rera_number,rera_status,min_price_lakh,max_price_lakh,possession_date,latitude,longitude`

function csvRow(fields: Record<string, string>): string {
  // Keep header order in sync with HEADER_CSV.
  const cols = ['name', 'builder', 'zone', 'rera_number', 'rera_status', 'min_price_lakh', 'max_price_lakh', 'possession_date', 'latitude', 'longitude']
  return cols.map((c) => fields[c] ?? '').join(',')
}

function makeCsv(rows: Array<Record<string, string>>): string {
  return [HEADER_CSV, ...rows.map(csvRow)].join('\n')
}

interface MakeReqOpts {
  csv: string
  commit?: boolean
  headers?: Record<string, string>
}

function makeRequest(opts: MakeReqOpts): NextRequest {
  const fd = new FormData()
  fd.append('file', new File([opts.csv], 'projects.csv', { type: 'text/csv' }))
  const url = `http://localhost/api/admin/projects/bulk-upload${opts.commit ? '?commit=true' : ''}`
  const req = new Request(url, {
    method: 'POST',
    body: fd,
    headers: { 'x-forwarded-for': '1.2.3.4', ...(opts.headers ?? {}) },
  })
  return req as unknown as NextRequest
}

const validRow = (overrides: Partial<Record<string, string>> = {}) => ({
  name: 'Test Project',
  builder: 'Goyal & Co. / HN Safal',
  zone: 'Shela',
  rera_number: 'PR/GJ/AHMEDABAD/AHMEDABAD-CITY/AUDA/RAA09134/300924',
  rera_status: 'Under Construction',
  min_price_lakh: '85',
  max_price_lakh: '120',
  possession_date: 'December 2030',
  latitude: '23.0225',
  longitude: '72.5714',
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ADMIN_EMAIL = ADMIN_EMAIL
  mAuth.mockResolvedValue({ user: { email: ADMIN_EMAIL } })
  mRateLimit.mockResolvedValue(true)
  mPrisma.project.findMany.mockResolvedValue([])
})

afterEach(() => {
  delete process.env.ADMIN_EMAIL
})

describe('bulk-upload — dry run diff structure', () => {
  it('returns creates / duplicates / errors with creates split from existing reraNumbers', async () => {
    const csv = makeCsv([
      validRow({ name: 'Alpha', rera_number: 'PR/AHM/ALPHA/01' }),
      validRow({ name: 'Beta', rera_number: 'PR/AHM/BETA/02' }),
    ])
    mPrisma.project.findMany.mockResolvedValue([{ reraNumber: 'PR/AHM/BETA/02' }])

    const res = await POST(makeRequest({ csv }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      committed: false,
      duplicates: ['PR/AHM/BETA/02'],
      errors: [],
    })
    expect(body.creates).toEqual([
      { projectName: 'Alpha', reraNumber: 'PR/AHM/ALPHA/01', builderName: 'Goyal & Co. / HN Safal' },
    ])
    expect(mPrisma.project.create).not.toHaveBeenCalled()
    expect(mAuditWrite).not.toHaveBeenCalled()
  })
})

describe('bulk-upload — commit mode wires auditWrite', () => {
  it('calls auditWrite once per created row with action=bulk_import + actor email', async () => {
    const csv = makeCsv([
      validRow({ name: 'Alpha', rera_number: 'PR/AHM/ALPHA/01' }),
      validRow({ name: 'Beta', rera_number: 'PR/AHM/BETA/02' }),
    ])
    mPrisma.project.findMany.mockResolvedValue([])
    mPrisma.project.create
      .mockResolvedValueOnce({ id: 'proj-1', reraNumber: 'PR/AHM/ALPHA/01' })
      .mockResolvedValueOnce({ id: 'proj-2', reraNumber: 'PR/AHM/BETA/02' })
    mAuditWrite.mockResolvedValue(2)

    const res = await POST(makeRequest({ csv, commit: true }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      committed: true,
      auditCount: 2,
      duplicates: [],
      errors: [],
    })
    expect(mPrisma.project.create).toHaveBeenCalledTimes(2)
    expect(mAuditWrite).toHaveBeenCalledTimes(2)

    const firstCall = mAuditWrite.mock.calls[0][0]
    expect(firstCall).toMatchObject({
      entity: 'Project',
      entityId: 'proj-1',
      action: 'bulk_import',
      actor: ADMIN_EMAIL,
    })
    expect(firstCall.after).toMatchObject({ name: 'Alpha', rera_number: 'PR/AHM/ALPHA/01' })

    const secondCall = mAuditWrite.mock.calls[1][0]
    expect(secondCall).toMatchObject({
      entity: 'Project',
      entityId: 'proj-2',
      action: 'bulk_import',
      actor: ADMIN_EMAIL,
    })
  })
})

describe('bulk-upload — RERA regex is all-or-nothing on commit', () => {
  it('rejects entire commit with 400 when ANY row fails the regex; zero writes', async () => {
    const csv = makeCsv([
      validRow({ name: 'Alpha', rera_number: 'PR/AHM/ALPHA/01' }),
      validRow({ name: 'Bad', rera_number: 'INVALID SPACE' }),
      validRow({ name: 'Gamma', rera_number: 'PR/AHM/GAMMA/03' }),
    ])

    const res = await POST(makeRequest({ csv, commit: true }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Validation failed')
    expect(body.errors.length).toBeGreaterThanOrEqual(1)
    // CSV line 3 = data row 2 (Bad).
    expect(body.errors.some((e: { row: number; reason: string }) => e.row === 3 && /rera/i.test(e.reason))).toBe(true)
    expect(mPrisma.project.findMany).not.toHaveBeenCalled()
    expect(mPrisma.project.create).not.toHaveBeenCalled()
    expect(mAuditWrite).not.toHaveBeenCalled()
  })
})

describe('bulk-upload — 1 MB body cap', () => {
  it('returns 413 when content-length exceeds 1 MB and never parses', async () => {
    const csv = makeCsv([validRow({ name: 'Alpha', rera_number: 'PR/AHM/ALPHA/01' })])

    const res = await POST(
      makeRequest({
        csv,
        headers: { 'content-length': '2000000' },
      }),
    )

    expect(res.status).toBe(413)
    const body = await res.json()
    expect(body.error).toMatch(/too large/i)
    expect(mPrisma.project.findMany).not.toHaveBeenCalled()
    expect(mPrisma.project.create).not.toHaveBeenCalled()
  })
})

describe('bulk-upload — rate limit', () => {
  it('returns 429 with Retry-After when rateLimit returns false', async () => {
    mRateLimit.mockResolvedValue(false)
    const csv = makeCsv([validRow({ name: 'Alpha', rera_number: 'PR/AHM/ALPHA/01' })])

    const res = await POST(makeRequest({ csv }))

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('60')
    expect(mRateLimit).toHaveBeenCalledWith(
      `bulk-upload:${ADMIN_EMAIL}:1.2.3.4`,
      2,
      60_000,
    )
    expect(mPrisma.project.findMany).not.toHaveBeenCalled()
  })
})
