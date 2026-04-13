import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeAdminInput } from '@/lib/sanitize'
import { invalidateContextCache } from '@/lib/context-cache'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (session?.user?.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await params
    const project = await prisma.project.findUnique({
      where: { id },
      include: { builder: { select: { brandName: true, grade: true, totalTrustScore: true } } }
    })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(project)
  } catch (err) {
    console.error('Project GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (session?.user?.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await params
    const body = await req.json()

    const ProjectUpdateSchema = z.object({
      projectName: z.string().min(1).max(200).optional(),
      builderName: z.string().min(1).max(200).optional(),
      microMarket: z.string().optional(),
      constructionStatus: z.string().optional(),
      minPrice: z.number().min(0).max(5000000000).optional(),
      maxPrice: z.number().min(0).max(5000000000).optional(),
      pricePerSqft: z.number().min(0).max(100000).optional(),
      availableUnits: z.number().min(0).max(10000).optional(),
      locationScore: z.number().min(0).max(100).optional(),
      amenitiesScore: z.number().min(0).max(100).optional(),
      deliveryScore: z.number().min(0).max(30).optional(),
      reraScore: z.number().min(0).max(20).optional(),
      qualityScore: z.number().min(0).max(20).optional(),
      financialScore: z.number().min(0).max(15).optional(),
      responsivenessScore: z.number().min(0).max(15).optional(),
      isActive: z.boolean().optional(),
      decisionTag: z.enum(['Strong Buy', 'Buy w/ Cond', 'Wait', 'Avoid']).optional().nullable(),
      honestConcern: z.string().max(500).optional().nullable(),
      analystNote: z.string().max(500).optional().nullable(),
    }).passthrough()

    const parsed = ProjectUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        projectName: sanitizeAdminInput(body.projectName),
        builderName: sanitizeAdminInput(body.builderName),
        microMarket: sanitizeAdminInput(body.microMarket),
        constructionStatus: sanitizeAdminInput(body.constructionStatus),
        minPrice: Number(body.minPrice),
        maxPrice: Number(body.maxPrice),
        pricePerSqft: Number(body.pricePerSqft),
        pricePerSqftType: body.pricePerSqftType ?? 'SBU',
        loadingFactor: Number(body.loadingFactor) || 1.37,
        charges: body.charges ?? [],
        allInPrice: body.allInPrice ? Number(body.allInPrice) : null,
        availableUnits: Number(body.availableUnits),
        possessionDate: new Date(body.possessionDate),
        reraNumber: body.reraNumber,
        unitTypes: body.unitTypes ?? [],
        amenities: body.amenities ?? [],
        locationScore: Number(body.locationScore ?? 50),
        amenitiesScore: Number(body.amenitiesScore ?? 50),
        infrastructureScore: Number(body.infrastructureScore ?? 50),
        demandScore: Number(body.demandScore ?? 50),
        sopPlanning: body.sopPlanning !== undefined ? Number(body.sopPlanning) : undefined,
        sopGrowth: body.sopGrowth !== undefined ? Number(body.sopGrowth) : undefined,
        sopTotal: body.sopTotal !== undefined ? Number(body.sopTotal) : undefined,
        isActive: body.isActive ?? true,
      }
    })
    await invalidateContextCache()
    return NextResponse.json(project)
  } catch (err) {
    console.error('Project PUT error:', err)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (session?.user?.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await params
    await prisma.project.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Project DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}