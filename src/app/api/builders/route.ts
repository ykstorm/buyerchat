import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  // Rate limit — 60 req/min per IP (listing endpoint, higher than chat)
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
  if (!await rateLimit(ip, 60, 60 * 1000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a minute.' },
      { status: 429 }
    )
  }

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
