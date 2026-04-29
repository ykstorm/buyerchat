import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./prisma', () => ({
  prisma: {
    project: { findUnique: vi.fn(), update: vi.fn() },
    builder: { findUnique: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))

import { auditWrite, AuditWriteError } from './audit-write'
import { prisma } from './prisma'
import * as Sentry from '@sentry/nextjs'

const mocked = prisma as unknown as {
  project: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
  builder: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
  auditLog: { create: ReturnType<typeof vi.fn> }
  $transaction: ReturnType<typeof vi.fn>
}

describe('auditWrite — happy path', () => {
  beforeEach(() => vi.clearAllMocks())

  it('Project: increments version, sets updatedBy, writes AuditLog with new entityVersion', async () => {
    mocked.project.findUnique.mockResolvedValue({ version: 3 })
    mocked.$transaction.mockResolvedValue([{ id: 'p1', version: 4 }, { id: 'audit-1' }])

    const newVersion = await auditWrite({
      entity: 'Project', entityId: 'p1', action: 'update',
      before: { name: 'Old' }, after: { name: 'New' },
      actor: 'mama@example.com',
    })

    expect(newVersion).toBe(4)
    expect(mocked.project.update).toHaveBeenCalledWith({
      where: { id: 'p1', version: 3 },
      data: { version: 4, updatedBy: 'mama@example.com' },
      select: { id: true, version: true },
    })
    expect(mocked.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: 'update', entity: 'Project', entityId: 'p1',
        data: { before: { name: 'Old' }, after: { name: 'New' } },
        userEmail: 'mama@example.com', entityVersion: 4,
      },
    })
    expect(mocked.$transaction.mock.calls[0][0]).toHaveLength(2)
  })

  it('Builder: increments version, sets updatedBy, writes AuditLog with new entityVersion', async () => {
    mocked.builder.findUnique.mockResolvedValue({ version: 1 })
    mocked.$transaction.mockResolvedValue([{ id: 'b1', version: 2 }, { id: 'audit-2' }])

    const newVersion = await auditWrite({
      entity: 'Builder', entityId: 'b1', action: 'wizard_step',
      actor: 'mama@example.com',
    })

    expect(newVersion).toBe(2)
    expect(mocked.builder.update).toHaveBeenCalledWith({
      where: { id: 'b1', version: 1 },
      data: { version: 2, updatedBy: 'mama@example.com' },
      select: { id: true, version: true },
    })
  })
})

describe('auditWrite — input validation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects empty actor', async () => {
    await expect(
      auditWrite({ entity: 'Project', entityId: 'p1', action: 'update', actor: '' }),
    ).rejects.toThrow(AuditWriteError)
    expect(mocked.project.findUnique).not.toHaveBeenCalled()
  })

  it('rejects whitespace-only actor', async () => {
    await expect(
      auditWrite({ entity: 'Project', entityId: 'p1', action: 'update', actor: '   ' }),
    ).rejects.toThrow(/actor is required/)
  })

  it('rejects empty entityId', async () => {
    await expect(
      auditWrite({ entity: 'Project', entityId: '', action: 'update', actor: 'mama@example.com' }),
    ).rejects.toThrow(/entityId is required/)
  })

  it('throws if entity not found', async () => {
    mocked.project.findUnique.mockResolvedValue(null)
    await expect(
      auditWrite({ entity: 'Project', entityId: 'missing', action: 'update', actor: 'mama@example.com' }),
    ).rejects.toThrow(/Project missing not found/)
  })
})

describe('auditWrite — Neon HTTP compatibility (§3)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses array-form $transaction, never callback form', async () => {
    mocked.project.findUnique.mockResolvedValue({ version: 1 })
    mocked.$transaction.mockResolvedValue([{ id: 'p1', version: 2 }, { id: 'a' }])

    await auditWrite({ entity: 'Project', entityId: 'p1', action: 'update', actor: 'mama@example.com' })

    const firstArg = mocked.$transaction.mock.calls[0][0]
    expect(Array.isArray(firstArg)).toBe(true)
    expect(typeof firstArg).not.toBe('function')
  })
})

describe('auditWrite — failure surfacing', () => {
  beforeEach(() => vi.clearAllMocks())

  it('captures unexpected errors to Sentry with audit-write tag', async () => {
    mocked.project.findUnique.mockResolvedValue({ version: 1 })
    mocked.$transaction.mockRejectedValue(new Error('Optimistic lock failed (P2025)'))

    await expect(
      auditWrite({ entity: 'Project', entityId: 'p1', action: 'update', actor: 'mama@example.com' }),
    ).rejects.toThrow(AuditWriteError)
    expect(Sentry.captureException).toHaveBeenCalled()
    const tags = (Sentry.captureException as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].tags
    expect(tags).toMatchObject({ module: 'audit-write', entity: 'Project', action: 'update' })
  })
})
