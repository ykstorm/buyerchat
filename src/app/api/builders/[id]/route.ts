import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const builder = await prisma.builder.findUnique({
    where: { id },
    select: {
      id: true,
      builderName: true,
      brandName: true,
      totalTrustScore: true,
      grade: true,
      partnerStatus: true,
      deliveryScore: true,
      reraScore: true,
      qualityScore: true,
      financialScore: true,
      responsivenessScore: true,
      commissionRatePct: true,
      projects: {
        select: {
          id: true,
          projectName: true,
          microMarket: true,
          minPrice: true,
          maxPrice: true,
          constructionStatus: true,
          unitTypes: true,
        },
        where: { isActive: true },
      },
      // contactEmail and contactPhone deliberately excluded
    },
  })

  if (!builder) {
    return NextResponse.json({ error: 'Builder not found' }, { status: 404 })
  }

  return NextResponse.json(builder)
}