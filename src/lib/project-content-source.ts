import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'

/**
 * Content-source lockdown for buyer-facing free-text Project fields.
 *
 * Background — Agent 10 audit:
 *   `Project.analystNote` (UI label "Analyst Note (insider intel)") and
 *   `Project.honestConcern` reach buyers via the AI chat context builder
 *   AND the project disclosure protocol in system-prompt.ts. The user
 *   flagged Vishwanath Sarathya's analyst note containing unverified
 *   "ET Industry Leader 2023" + "34 years Gujarat experience" claims.
 *
 *   To prevent further AI-generated fabrications from silently reaching
 *   these fields, every write is funneled through this helper. AI writes
 *   are BLOCKED at the call boundary and a Sentry warning is fired so the
 *   attempt is visible.
 *
 * Source vocabulary: 'operator' | 'ai_generated' | 'imported' | 'unknown'.
 * 'unknown' is reserved for backfill — callers should not pass it.
 */

export type ProjectContentField = 'analystNote' | 'honestConcern'
export type ProjectContentSource = 'operator' | 'ai_generated' | 'imported'

export interface WriteProjectContentResult {
  ok: boolean
  reason?: string
}

/**
 * Persist content for `analystNote` or `honestConcern` along with its
 * provenance. Returns `{ ok: false }` (and Sentry-warns) when the source
 * is `'ai_generated'` so AI completion outputs cannot silently overwrite
 * operator-verified copy.
 *
 * @param projectId – Project.id
 * @param field     – 'analystNote' | 'honestConcern'
 * @param content   – sanitized text (caller is still responsible for sanitize)
 * @param source    – 'operator' (admin save) | 'imported' (CSV/RERA bulk) |
 *                    'ai_generated' (BLOCKED — kept in the type so callers
 *                    must pass it explicitly and trip the lock rather than
 *                    pretend AI output is operator-authored)
 * @param author    – usually session.user.email for 'operator' writes
 */
export async function writeProjectContent(
  projectId: string,
  field: ProjectContentField,
  content: string,
  source: ProjectContentSource,
  author?: string,
): Promise<WriteProjectContentResult> {
  if (source === 'ai_generated') {
    // Detective + preventive: refuse the write AND surface the attempt.
    console.error(
      `[content-lock] BLOCKED ai_generated write to Project.${field} for ${projectId}`,
    )
    try {
      Sentry.captureMessage(
        `Blocked AI-generated write to Project.${field}`,
        {
          level: 'warning',
          tags: { content_lock: 'true', field, projectId },
        },
      )
    } catch {
      // Sentry must never break the lock itself.
    }
    return {
      ok: false,
      reason: 'ai_generated content is blocked from buyer-facing fields',
    }
  }

  const data: Record<string, unknown> = {
    [field]: content,
    [`${field}Source`]: source,
    [`${field}Author`]: author ?? null,
    [`${field}VerifiedAt`]: new Date(),
  }

  await prisma.project.update({ where: { id: projectId }, data })
  return { ok: true }
}
