import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'
import { verifyOtp } from '@/lib/otp'
import { prisma } from '@/lib/prisma'
import { isValidIndianMobile } from '@/lib/stage-a-capture'

// Stage B OTP verify (Agent G). Feature-flagged: 404 unless STAGE_B_ENABLED=true.
// On verified ok → upgrade ChatSession.captureStage to 'verified' and persist
// the captured phone for the buyer.

const Schema = z.object({
  phone: z.string().min(10).max(10),
  code: z.string().regex(/^\d{4}$/),
  sessionId: z.string().min(1).max(64),
  name: z.string().trim().max(50).optional().nullable(),
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
  const ok = await rateLimit(`otp:verify:${ip}`, 10, 60 * 60 * 1000)
  if (!ok) return NextResponse.json({ error: 'Rate limited' }, { status: 429 })

  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  if (!isValidIndianMobile(parsed.data.phone)) {
    return NextResponse.json({ error: 'Invalid phone' }, { status: 400 })
  }

  const result = await verifyOtp(parsed.data.phone, parsed.data.code)
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
  }

  await prisma.chatSession.update({
    where: { id: parsed.data.sessionId },
    data: {
      capturedPhone: parsed.data.phone,
      capturedName: parsed.data.name?.trim() || undefined,
      captureStage: 'verified',
      capturedAt: new Date(),
    },
  }).catch(() => null)

  return NextResponse.json({ ok: true })
}
