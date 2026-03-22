import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { sanitizeAdminInput } from '@/lib/sanitize'
import { invalidateContextCache } from '@/lib/context-cache'

const ProjectSchema = z.object({
  projectName: z.string().min(1),
  builderName: z.string().min(1),
  microMarket: z.string().min(1),
  minPrice: z.number().positive(),
  maxPrice: z.number().positive(),
  pricePerSqft: z.number().positive(),
  availableUnits: z.number().int().positive(),
  possessionDate: z.string(),
  reraNumber: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  constructionStatus: z.string().min(1),
  unitTypes: z.array(z.string()),
  amenities: z.array(z.string()),
}).refine(
  d => d.maxPrice >= d.minPrice,
  { message: 'maxPrice must be >= minPrice', path: ['maxPrice'] }
)

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
try {
  const body = await req.json()
  const parsed = ProjectSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data

  const project = await prisma.project.create({
    data: {
      projectName: sanitizeAdminInput(d.projectName),
      builderName: sanitizeAdminInput(d.builderName),
      microMarket: sanitizeAdminInput(d.microMarket),
      minPrice: d.minPrice,
      maxPrice: d.maxPrice,
      pricePerSqft: d.pricePerSqft,
      availableUnits: d.availableUnits,
      possessionDate: new Date(d.possessionDate),
      reraNumber: d.reraNumber,
      latitude: d.latitude,
      longitude: d.longitude,
      constructionStatus: sanitizeAdminInput(d.constructionStatus),
      unitTypes: d.unitTypes,
      amenities: d.amenities.map(a => sanitizeAdminInput(a)),
    },
  })
  invalidateContextCache()
  return NextResponse.json(project, { status: 201 })
}
catch (err) {
  console.error('Admin error:', err)
  return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
}}