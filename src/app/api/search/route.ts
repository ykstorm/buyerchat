import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const SearchSchema = z.object({
  q: z.string().min(1).max(100),
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')

  const parsed = SearchSchema.safeParse({ q })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Search query required' }, { status: 400 })
  }

  const query = parsed.data.q.toLowerCase()

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
}
