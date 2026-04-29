import { prisma } from './prisma'
import * as Sentry from '@sentry/nextjs'

/**
 * Audit-trail helper for entities with versioning.
 *
 * Increments the row's `version` AND writes an `AuditLog` event in a single
 * atomic transaction. Uses optimistic locking via the version column — if
 * another writer raced us, the update fails with P2025.
 *
 * MUST use `prisma.$transaction([...])` array form. The Neon HTTP adapter
 * does NOT support `prisma.$transaction(callback)`. See AGENT_DISCIPLINE.md §3.
 */

export type AuditableEntity = 'Project' | 'Builder'
export type AuditAction =
  | 'create' | 'update' | 'delete'
  | 'verify_rera' | 'bulk_import' | 'wizard_step'

export interface AuditWriteParams {
  entity: AuditableEntity
  entityId: string
  action: AuditAction
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  actor: string  // user email; non-empty
}

export class AuditWriteError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'AuditWriteError'
  }
}

export async function auditWrite(params: AuditWriteParams): Promise<number> {
  const { entity, entityId, action, before = null, after = null, actor } = params

  if (!actor || typeof actor !== 'string' || actor.trim().length === 0) {
    throw new AuditWriteError('actor is required and must be a non-empty string')
  }
  if (!entityId || typeof entityId !== 'string') {
    throw new AuditWriteError('entityId is required and must be a non-empty string')
  }

  try {
    let currentVersion: number
    if (entity === 'Project') {
      const row = await prisma.project.findUnique({
        where: { id: entityId },
        select: { version: true },
      })
      if (!row) throw new AuditWriteError(`Project ${entityId} not found`)
      currentVersion = row.version
    } else if (entity === 'Builder') {
      const row = await prisma.builder.findUnique({
        where: { id: entityId },
        select: { version: true },
      })
      if (!row) throw new AuditWriteError(`Builder ${entityId} not found`)
      currentVersion = row.version
    } else {
      throw new AuditWriteError(`Unsupported entity: ${entity satisfies never}`)
    }

    const nextVersion = currentVersion + 1

    const updateOp =
      entity === 'Project'
        ? prisma.project.update({
            where: { id: entityId, version: currentVersion },
            data: { version: nextVersion, updatedBy: actor },
            select: { id: true, version: true },
          })
        : prisma.builder.update({
            where: { id: entityId, version: currentVersion },
            data: { version: nextVersion, updatedBy: actor },
            select: { id: true, version: true },
          })

    const auditOp = prisma.auditLog.create({
      data: {
        action, entity, entityId,
        data: { before, after } as never,
        userEmail: actor,
        entityVersion: nextVersion,
      },
    })

    await prisma.$transaction([updateOp, auditOp])

    return nextVersion
  } catch (err) {
    Sentry.captureException(err, {
      tags: { module: 'audit-write', entity, action },
      extra: { entityId, actor },
    })
    if (err instanceof AuditWriteError) throw err
    throw new AuditWriteError(`auditWrite failed for ${entity}/${entityId}/${action}`, err)
  }
}
