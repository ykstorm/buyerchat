import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'
import { sendOtp } from '@/lib/otp'
import { isValidIndianMobile } from '@/lib/stage-a-capture'

// Stage B OTP send (Agent G). Feature-flagged: 404 unless STAGE_B_ENABLED=true.
// Mama 2026-04-28 lock: dark by default. Flip env on Vercel to activate.

const Schema = z.object({
  phone: z.string().min(10).max(10),
  sessionId: z.string().min(1).max(64).optional(),
})

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') || 'unknown'
}

export async function POST(req: NextRequest) {
  if (process.env.STAGE_B_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const ip = clientIp(req)
  const ok = await rateLimit(`otp:send:${ip}`, 5, 60 * 60 * 1000)
  if (!ok) return NextResponse.json({ error: 'Rate limited' }, { status: 429 })

  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  if (!isValidIndianMobile(parsed.data.phone)) {
    return NextResponse.json({ error: 'Invalid phone' }, { status: 400 })
  }

  const result = await sendOtp(parsed.data.phone, parsed.data.sessionId)
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, retryAfterSec: result.retryAfterSec },
      { status: 429 }
    )
  }
  return NextResponse.json({ ok: true, expiresAt: result.expiresAt.toISOString() })
}
