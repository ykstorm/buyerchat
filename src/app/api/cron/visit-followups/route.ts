/**
 * Vercel Cron entry point — fires the visit follow-up scheduler.
 *
 * Schedule: every 15 minutes (vercel.json crons).
 * Auth:     Authorization: Bearer ${CRON_SECRET}.
 * Body:     none — handler is idempotent, computeFollowupsDue skips
 *           any (visit, kind) pair whose Sent column is already set.
 *
 * GET is exposed for manual smoke testing in dev (curl with the same
 * Bearer header). Vercel itself fires POST.
 */

import { NextRequest, NextResponse } from 'next/server'
import { computeFollowupsDue, sendFollowup } from '@/lib/visit-followup'

export const runtime = 'nodejs'
// Disable static optimization — this route must always hit live DB.
export const dynamic = 'force-dynamic'

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = req.headers.get('authorization') || ''
  return header === `Bearer ${secret}`
}

async function runSweep() {
  const now = new Date()
  const due = await computeFollowupsDue(now)

  let sent = 0
  const errors: Array<{ visitId: string; kind: string; error: string }> = []
  for (const item of due) {
    try {
      const res = await sendFollowup(item.visit, item.kind)
      if (res.ok) sent++
    } catch (err) {
      // One failed visit must not stall the sweep — log + continue.
      errors.push({
        visitId: item.visit.id,
        kind: item.kind,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return { ok: true, found: due.length, sent, errors }
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runSweep()
    return NextResponse.json(result)
  } catch (err) {
    console.error('[cron/visit-followups] sweep failed:', err)
    return NextResponse.json({ error: 'Sweep failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runSweep()
    return NextResponse.json(result)
  } catch (err) {
    console.error('[cron/visit-followups] sweep failed:', err)
    return NextResponse.json({ error: 'Sweep failed' }, { status: 500 })
  }
}
