import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const QuerySchema = z.object({
  type: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
  if (!rateLimit(ip, 10, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { searchParams } = new URL(req.url)
  const parsed = QuerySchema.safeParse({
    type: searchParams.get('type') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const infrastructure = await prisma.infrastructure.findMany({
    where: {
      ...(parsed.data.type && { type: parsed.data.type }),
    },
    orderBy: { priceImpactPct: 'desc' },
  })

  return NextResponse.json(infrastructure)
}