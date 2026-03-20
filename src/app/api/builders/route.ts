import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const builders = await prisma.builder.findMany({
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
      // contactEmail and contactPhone deliberately excluded
    },
    orderBy: { totalTrustScore: 'desc' },
  })

  return NextResponse.json(builders)
}