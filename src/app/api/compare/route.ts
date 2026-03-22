import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

const CompareSchema = z.object({
  ids: z.array(z.string()).min(1).max(3),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
if (!rateLimit(ip, 20, 60 * 1000)) {
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
}
  const parsed = CompareSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const projects = await prisma.project.findMany({
    where: { id: { in: parsed.data.ids }, isActive: true },
    select: {
      id: true,
      projectName: true,
      builderName: true,
      microMarket: true,
      minPrice: true,
      maxPrice: true,
      pricePerSqft: true,
      availableUnits: true,
      possessionDate: true,
      reraNumber: true,
      amenities: true,
      constructionStatus: true,
      unitTypes: true,
      latitude: true,
      longitude: true,
      builder: {
        select: {
          totalTrustScore: true,
          grade: true,
          brandName: true,
        }
      }
    }
  })

  return NextResponse.json(projects)
}