import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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
          // partnerStatus, commissionRatePct — NEVER public
        }
      },
      priceHistory: {
        orderBy: { recordedAt: 'desc' },
        take: 5,
        select: { pricePerSqft: true, recordedAt: true }
      }
    },
  })

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json(project)
}