import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { PHONE_REGEX, TEST_PATTERNS } from '@/lib/stage-a-capture'

// Stage A soft capture endpoint (Agent 4).
// POST  → buyer shared name+phone after first PROJECT_CARD (no OTP).
// PATCH → buyer hit "Continue without" — record as 'skipped' so we never
//         render the form again for this session.
// Buyer-trust per docs/AGENT_DISCIPLINE.md §7: only this human-driven UI
// path writes to ChatSession.captured*. The AI streaming pipeline never does.
//
// Note: Neon HTTP adapter (src/lib/prisma.ts) — no callback $transaction.
// We do a single update; no Buyer model exists today (admin reads buyers via
// ChatSession), so there's nothing to upsert atomically. If a Buyer table is
// added later, swap to prisma.$transaction([...]) array form.

const PostSchema = z.object({
  sessionId: z.string().min(1).max(64),
  name: z.string().trim().max(50).optional().nullable(),
  phone: z.string().regex(PHONE_REGEX),
  stage: z.literal('soft'),
})

const PatchSchema = z.object({
  sessionId: z.string().min(1).max(64),
  stage: z.literal('skipped'),
})

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') || 'unknown'
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req)
    // Rate-limit per (sessionId, ip). Scoping to sessionId stops a single
    // attacker from burning the whole IP budget probing many sessions; the
    // ip half stops one session being used as a global capture funnel.
    // The body is parsed first so we can include sessionId in the key.
    const body = await req.json().catch(() => null)
    const parsed = PostSchema.safeParse(body)
    if (!parsed.success) {
      // Apply a coarse IP-only limit on malformed input so an attacker
      // can't probe schema shape for free.
      await rateLimit(`capture:bad:${ip}`, 30, 60_000)
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    const { sessionId, name, phone } = parsed.data

    const ok = await rateLimit(`capture:${sessionId}:${ip}`, 4, 60_000)
    if (!ok) return NextResponse.json({ error: 'Rate limited' }, { status: 429 })

    if (TEST_PATTERNS.has(phone)) {
      return NextResponse.json({ error: 'Invalid phone' }, { status: 400 })
    }

    const existing = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { id: true, captureStage: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    // Idempotent: don't overwrite a verified capture (Stage B) with soft data.
    // Don't distinguish the response — return the same shape regardless of
    // prior state so a probe can't infer session capture status without auth.
    if (existing.captureStage === 'verified') {
      return NextResponse.json({ ok: true })
    }

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        capturedPhone: phone,
        capturedName: name?.trim() || null,
        captureStage: 'soft',
        capturedAt: new Date(),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[capture POST]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ip = clientIp(req)
    const body = await req.json().catch(() => null)
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      await rateLimit(`capture:bad:${ip}`, 30, 60_000)
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    const { sessionId } = parsed.data

    const ok = await rateLimit(`capture:${sessionId}:${ip}`, 4, 60_000)
    if (!ok) return NextResponse.json({ error: 'Rate limited' }, { status: 429 })

    const existing = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { id: true, captureStage: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    // Don't downgrade a soft/verified capture to skipped. Keep response shape
    // identical to "newly skipped" so capture-state can't be probed.
    if (existing.captureStage === 'soft' || existing.captureStage === 'verified') {
      return NextResponse.json({ ok: true })
    }

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { captureStage: 'skipped', capturedAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[capture PATCH]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
