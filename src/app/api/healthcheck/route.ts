import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Public, unauthenticated. Load balancers + Docker HEALTHCHECK fire this
// without credentials; locking it would defeat the orchestrator
// integration.
//
// Anti-pattern guard: this route MUST NOT call Sentry.captureException on
// success (Docker fires every 30s — Sentry would flood). Only the
// degraded path logs, and even there we keep it to console.error to
// avoid a captureException loop when Sentry itself is the failure mode.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({
      status: 'ok',
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[healthcheck] db_unreachable:', (err as Error).message)
    return NextResponse.json(
      { status: 'degraded', reason: 'db_unreachable' },
      { status: 503 },
    )
  }
}
