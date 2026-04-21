import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { sanitizeAdminInput } from '@/lib/sanitize'
import { logAdminAction } from '@/lib/audit-log'

const ProjectCreateSchema = z.object({
  projectName: z.string().min(1).max(200),
  builderName: z.string().min(1).max(200),
  microMarket: z.string().min(1).max(200),
  constructionStatus: z.string().min(1).max(100),
  minPrice: z.number().min(0).max(5_000_000_000),
  maxPrice: z.number().min(0).max(5_000_000_000),
  pricePerSqft: z.number().min(0).max(100_000),
  availableUnits: z.number().min(0).max(10_000),
  possessionDate: z.string().min(1),
  reraNumber: z.string().min(1).max(100),
  unitTypes: z.array(z.string()).optional(),
  amenities: z.array(z.string()).optional(),
  locationScore: z.number().min(0).max(100).optional(),
  amenitiesScore: z.number().min(0).max(100).optional(),
  infrastructureScore: z.number().min(0).max(100).optional(),
  demandScore: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    if (session?.user?.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const projects = await prisma.project.findMany({
      include: { builder: { select: { brandName: true, grade: true, totalTrustScore: true } } },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(projects)
  } catch (err) {
    console.error('Projects GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (session?.user?.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await req.json()
    const parsed = ProjectCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }
    const d = parsed.data
    const project = await prisma.project.create({
      data: {
        projectName: sanitizeAdminInput(d.projectName),
        builderName: sanitizeAdminInput(d.builderName),
        microMarket: sanitizeAdminInput(d.microMarket),
        constructionStatus: sanitizeAdminInput(d.constructionStatus),
        minPrice: d.minPrice,
        maxPrice: d.maxPrice,
        pricePerSqft: d.pricePerSqft,
        availableUnits: d.availableUnits,
        possessionDate: new Date(d.possessionDate),
        reraNumber: d.reraNumber,
        unitTypes: d.unitTypes ?? [],
        amenities: d.amenities ?? [],
        locationScore: d.locationScore ?? 50,
        amenitiesScore: d.amenitiesScore ?? 50,
        infrastructureScore: d.infrastructureScore ?? 50,
        demandScore: d.demandScore ?? 50,
        isActive: d.isActive ?? true,
        latitude: d.latitude ?? 23.0225,
        longitude: d.longitude ?? 72.5714,
      }
    })
    await logAdminAction('create', 'project', { id: project.id, projectName: project.projectName }, session!.user!.email!)
    return NextResponse.json(project, { status: 201 })
  } catch (err) {
    console.error('Project POST error:', err)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}