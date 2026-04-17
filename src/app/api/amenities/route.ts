import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

const QuerySchema = z.object({
  type: z.string().optional(),
})

export async function GET(req: NextRequest) {
  if (!await rateLimit(req, { limit: 30, window: 60 })) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { searchParams } = new URL(req.url)

  const parsed = QuerySchema.safeParse({
    type: searchParams.get('type') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const amenities = await prisma.amenity.findMany({
      where: {
        ...(parsed.data.type && { type: parsed.data.type }),
      },
      orderBy: { qualityRating: 'desc' },
    })

    return NextResponse.json(amenities)
  } catch (err) {
    console.error('Amenities fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch amenities' }, { status: 500 })
  }
}