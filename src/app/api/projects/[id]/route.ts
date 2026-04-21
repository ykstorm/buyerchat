import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { computeUrgencySignals } from '@/lib/urgency-signals'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
  if (!await rateLimit(ip, 60, 60 * 1000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a minute.' },
      { status: 429 }
    )
  }

  const { id } = await params
try {
  const project = await prisma.project.findUnique({
    where: { id },
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
      builder: {
        select: {
          brandName: true,
          totalTrustScore: true,
          grade: true,
          deliveryScore: true,
          reraScore: true,
          qualityScore: true,
          financialScore: true,
          responsivenessScore: true,
        }
      },
      priceHistory: {
        orderBy: { recordedAt: 'desc' },
        take: 5,
        select: { pricePerSqft: true, recordedAt: true }
      },
      siteVisits: {
        select: { id: true, createdAt: true }
      },
    },
  })

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const { priceHistory, siteVisits, ...rest } = project

  const urgencySignals = computeUrgencySignals({
    availableUnits: project.availableUnits,
    possessionDate: project.possessionDate,
    priceHistory,
    siteVisits,
  })

  return NextResponse.json({
    ...rest,
    priceHistory,
    urgencySignals,
  })
}
catch (err) {
  console.error('Project fetch error:', err)
  return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
}}