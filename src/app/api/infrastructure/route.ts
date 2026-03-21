import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const QuerySchema = z.object({
  locality: z.string().optional(),
  type: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const parsed = QuerySchema.safeParse({
    locality: searchParams.get('locality') ?? undefined,
    type: searchParams.get('type') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { type } = parsed.data

  const infrastructure = await prisma.infrastructure.findMany({
    where: {
      ...(type && { type }),
    },
    orderBy: { priceImpactPct: 'desc' },
  })

  return NextResponse.json(infrastructure)
}