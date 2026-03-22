import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { computeUrgencySignals } from '@/lib/urgency-signals'

const QuerySchema = z.object({
  microMarket: z.string().optional(),
  unitType: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const parsed = QuerySchema.safeParse({
    microMarket: searchParams.get('microMarket') ?? undefined,
    unitType: searchParams.get('unitType') ?? undefined,
    minPrice: searchParams.get('minPrice') ?? undefined,
    maxPrice: searchParams.get('maxPrice') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { microMarket, unitType, minPrice, maxPrice } = parsed.data

  const projects = await prisma.project.findMany({
    where: {
      isActive: true,
      ...(microMarket && { microMarket }),
      ...(unitType && { unitTypes: { has: unitType } }),
      ...(minPrice && { minPrice: { gte: minPrice } }),
      ...(maxPrice && { maxPrice: { lte: maxPrice } }),
    },
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
      latitude: true,
      longitude: true,
      constructionStatus: true,
      unitTypes: true,
      isActive: true,
      priceHistory: {
        orderBy: { recordedAt: 'desc' },
        take: 2,
        select: { pricePerSqft: true }
      },
      siteVisits: {
        select: { id: true }
      }
    },
    orderBy: { createdAt: 'desc' },
  })

  const projectsWithSignals = projects.map(({ priceHistory, siteVisits, ...p }) => ({
    ...p,
    urgencySignals: computeUrgencySignals({
      availableUnits: p.availableUnits,
      possessionDate: p.possessionDate,
      priceHistory,
      siteVisits,
    })
  }))
  
  return NextResponse.json(projectsWithSignals)
}