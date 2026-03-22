import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
  const builders = await prisma.builder.findMany({
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
      // partnerStatus, commissionRatePct, contactEmail, contactPhone — NEVER public
    },
    orderBy: { totalTrustScore: 'desc' },
  })
  return NextResponse.json(builders)
}catch (err) {
  console.error('Builders fetch error:', err)
  return NextResponse.json({ error: 'Failed to fetch builders' }, { status: 500 })
}}