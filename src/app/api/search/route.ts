import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

const SearchSchema = z.object({
  q: z.string().min(1).max(100),
})

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
  if (!await rateLimit(ip, 30, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')

  const parsed = SearchSchema.safeParse({ q })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Search query required' }, { status: 400 })
  }

  const query = parsed.data.q.toLowerCase()

  try {
    const projects = await prisma.project.findMany({
      where: {
        isActive: true,
        OR: [
          { projectName: { contains: query, mode: 'insensitive' } },
          { builderName: { contains: query, mode: 'insensitive' } },
          { microMarket: { contains: query, mode: 'insensitive' } },
          { constructionStatus: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        projectName: true,
        builderName: true,
        microMarket: true,
        minPrice: true,
        maxPrice: true,
        pricePerSqft: true,
        unitTypes: true,
        constructionStatus: true,
        availableUnits: true,
      },
      take: 10,
    })

    return NextResponse.json(projects)
  } catch (err) {
    console.error('Search error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
