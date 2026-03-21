import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const QuerySchema = z.object({
  type: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const parsed = QuerySchema.safeParse({
    type: searchParams.get('type') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const amenities = await prisma.amenity.findMany({
    where: {
      ...(parsed.data.type && { type: parsed.data.type }),
    },
    orderBy: { qualityRating: 'desc' },
  })

  return NextResponse.json(amenities)
}