import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

/**
 * Log an admin action for audit trail.
 *
 * @param action  – verb: "create", "update", "delete"
 * @param entity  – noun: "project", "builder", "visit", "deal", "market_alert", "lead"
 * @param data    – any relevant payload (ID, changed fields, etc.)
 * @param userEmail – admin email who performed the action
 */
export async function logAdminAction(
  action: string,
  entity: string,
  data: Record<string, unknown> | null,
  userEmail: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId: (data?.id as string) ?? (data?.entityId as string) ?? null,
        data: data ? (data as Prisma.InputJsonValue) : undefined,
        userEmail,
      },
    })
  } catch (err) {
    // Audit logging must never break the main flow
    console.error('[audit-log] Failed to write:', err)
  }
}
