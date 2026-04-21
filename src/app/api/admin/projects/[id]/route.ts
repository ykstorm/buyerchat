import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeAdminInput } from '@/lib/sanitize'
import { invalidateContextCache } from '@/lib/context-cache'
import { logAdminAction } from '@/lib/audit-log'
import { computeGrade } from '@/lib/grade'
import { embedProject } from '@/lib/rag/embed-writer'

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

    const d = parsed.data as Record<string, any>
    // Separate builder score fields from project fields
    const scoreFields = ['deliveryScore', 'reraScore', 'qualityScore', 'financialScore', 'responsivenessScore'] as const
    const hasScoreUpdate = scoreFields.some(f => d[f] !== undefined)

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(d.projectName !== undefined && { projectName: sanitizeAdminInput(d.projectName) }),
        ...(d.builderName !== undefined && { builderName: sanitizeAdminInput(d.builderName) }),
        ...(d.microMarket !== undefined && { microMarket: sanitizeAdminInput(d.microMarket) }),
        ...(d.constructionStatus !== undefined && { constructionStatus: sanitizeAdminInput(d.constructionStatus) }),
        ...(d.minPrice !== undefined && { minPrice: d.minPrice }),
        ...(d.maxPrice !== undefined && { maxPrice: d.maxPrice }),
        ...(d.pricePerSqft !== undefined && { pricePerSqft: d.pricePerSqft }),
        ...(d.pricePerSqftType !== undefined && { pricePerSqftType: d.pricePerSqftType }),
        ...(d.loadingFactor !== undefined && { loadingFactor: Number(d.loadingFactor) || 1.37 }),
        ...(d.charges !== undefined && { charges: d.charges }),
        ...(d.allInPrice !== undefined && { allInPrice: d.allInPrice ? Number(d.allInPrice) : null }),
        ...(d.availableUnits !== undefined && { availableUnits: d.availableUnits }),
        ...(d.possessionDate !== undefined && { possessionDate: new Date(d.possessionDate) }),
        ...(d.reraNumber !== undefined && { reraNumber: d.reraNumber }),
        ...(d.unitTypes !== undefined && { unitTypes: d.unitTypes }),
        ...(d.amenities !== undefined && { amenities: d.amenities }),
        ...(d.locationScore !== undefined && { locationScore: d.locationScore }),
        ...(d.amenitiesScore !== undefined && { amenitiesScore: d.amenitiesScore }),
        ...(d.infrastructureScore !== undefined && { infrastructureScore: Number(d.infrastructureScore) }),
        ...(d.demandScore !== undefined && { demandScore: Number(d.demandScore) }),
        ...(d.sopPlanning !== undefined && { sopPlanning: Number(d.sopPlanning) }),
        ...(d.sopGrowth !== undefined && { sopGrowth: Number(d.sopGrowth) }),
        ...(d.sopTotal !== undefined && { sopTotal: Number(d.sopTotal) }),
        ...(d.isActive !== undefined && { isActive: d.isActive }),
        ...(d.decisionTag !== undefined && { decisionTag: d.decisionTag }),
        // Both reach LLM context via the project disclosure protocol in
        // system-prompt.ts — sanitize identically to projectName/microMarket.
        ...(d.honestConcern !== undefined && { honestConcern: d.honestConcern === null ? null : sanitizeAdminInput(d.honestConcern) }),
        ...(d.analystNote !== undefined && { analystNote: d.analystNote === null ? null : sanitizeAdminInput(d.analystNote) }),
      }
    })

    // If builder scores were updated, recalculate totalTrustScore and grade on Builder
    if (hasScoreUpdate) {
      const existing = await prisma.builder.findUnique({
        where: { builderName: project.builderName },
        select: { deliveryScore: true, reraScore: true, qualityScore: true, financialScore: true, responsivenessScore: true },
      })
      if (existing) {
        const newTotal = Math.round(
          (d.deliveryScore ?? existing.deliveryScore) +
          (d.reraScore ?? existing.reraScore) +
          (d.qualityScore ?? existing.qualityScore) +
          (d.financialScore ?? existing.financialScore) +
          (d.responsivenessScore ?? existing.responsivenessScore)
        )
        const newGrade = computeGrade(newTotal)
        await prisma.builder.update({
          where: { builderName: project.builderName },
          data: {
            ...(d.deliveryScore !== undefined && { deliveryScore: d.deliveryScore }),
            ...(d.reraScore !== undefined && { reraScore: d.reraScore }),
            ...(d.qualityScore !== undefined && { qualityScore: d.qualityScore }),
            ...(d.financialScore !== undefined && { financialScore: d.financialScore }),
            ...(d.responsivenessScore !== undefined && { responsivenessScore: d.responsivenessScore }),
            totalTrustScore: newTotal,
            grade: newGrade,
          },
        })
      }
    }

    await invalidateContextCache()
    await logAdminAction('update', 'project', { id, projectName: project.projectName }, session!.user!.email!)
    // Fire-and-forget embedding — OpenAI failure must never block the admin save.
    embedProject(project.id).catch((err) =>
      console.error('[embed-writer] embedProject failed for', project.id, err)
    )
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
    const project = await prisma.project.findUnique({ where: { id }, select: { projectName: true } })
    await prisma.project.update({ where: { id }, data: { isActive: false } })
    await logAdminAction('delete', 'project', { id, projectName: project?.projectName ?? '—' }, session!.user!.email!)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Project DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}