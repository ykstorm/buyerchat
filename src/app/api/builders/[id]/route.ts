import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
try {
  const builder = await prisma.builder.findUnique({
    where: { id },
    select: {
      id: true,
      builderName: true,
      brandName: true,
      totalTrustScore: true,
      grade: true,
      deliveryScore: true,
      reraScore: true,
      qualityScore: true,
      financialScore: true,
      responsivenessScore: true,
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
      // partnerStatus, commissionRatePct, contactEmail, contactPhone — NEVER public
    },
  })

  if (!builder) {
    return NextResponse.json({ error: 'Builder not found' }, { status: 404 })
  }

  return NextResponse.json(builder)
}catch (err) {
  console.error('Builder fetch error:', err)
  return NextResponse.json({ error: 'Failed to fetch builder' }, { status: 500 })
}}