import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeUrgencySignals } from '@/lib/urgency-signals'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
  if (!await rateLimit(ip, 30, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { searchParams } = new URL(req.url)
  const microMarket = searchParams.get('microMarket')
  const unitType = searchParams.get('unitType')
  const status = searchParams.get('status')
  const sort = searchParams.get('sort') ?? 'newest'
  try {

  const now = new Date()

  // I40-G + filter-fallback: DB stores "Active" / "Active (Ongoing)" but
  // some rows have unset/legacy constructionStatus values. Buyer-friendly UI
  // pills are "Under Construction" / "Ready to Move". Derive from BOTH
  // constructionStatus and possessionDate so the filter never empties out
  // when the constructionStatus column drifts.
  //   - Under Construction: constructionStatus startsWith "Active"
  //                         OR possessionDate is in the future
  //                         (and not explicitly "Ready to Move")
  //   - Ready to Move:      constructionStatus = "Ready to Move"
  //                         OR possessionDate <= now
  const statusFilter =
    status === 'Under Construction'
      ? {
          AND: [
            {
              OR: [
                { constructionStatus: { startsWith: 'Active' } },
                { possessionDate: { gt: now } },
              ],
            },
            { NOT: { constructionStatus: 'Ready to Move' } },
          ],
        }
      : status === 'Ready to Move'
      ? {
          OR: [
            { constructionStatus: 'Ready to Move' },
            { possessionDate: { lte: now } },
          ],
        }
      : {}

  const projects = await prisma.project.findMany({
    where: {
      isActive: true,
      ...(microMarket && microMarket !== 'all' && { microMarket }),
      ...statusFilter,
      ...(unitType && unitType !== 'all' && {
        unitTypes: { has: unitType }
      }),
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
      unitTypes: true,
      constructionStatus: true,
      decisionTag: true,
      honestConcern: true,
      builder: {
        select: {
          grade: true,
          totalTrustScore: true,
          brandName: true,
        }
      },
      priceHistory: {
        orderBy: { recordedAt: 'desc' },
        take: 2,
        select: { pricePerSqft: true, recordedAt: true }
      },
      siteVisits: {
        select: { id: true, createdAt: true }
      },
    },
    orderBy: sort === 'price-asc'
      ? { minPrice: 'asc' }
      : sort === 'price-desc'
      ? { minPrice: 'desc' }
      : { createdAt: 'desc' },
  })

  const response = projects.map(({ priceHistory, siteVisits, ...p }) => ({
    ...p,
    urgencySignals: computeUrgencySignals({
      availableUnits: p.availableUnits,
      possessionDate: p.possessionDate,
      priceHistory,
      siteVisits,
    })
  }))

  // Sort by trust grade if requested
  if (sort === 'trust') {
    const gradeOrder: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, F: 5 }
    response.sort((a, b) =>
      (gradeOrder[a.builder?.grade ?? 'F'] ?? 5) -
      (gradeOrder[b.builder?.grade ?? 'F'] ?? 5)
    )
  }
  
  return NextResponse.json(response)
}catch (err) {
  console.error('Projects fetch error:', err)
  return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
}
}