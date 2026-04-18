import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { sanitizeAdminInput } from '@/lib/sanitize'
import { logAdminAction } from '@/lib/audit-log'

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
    const project = await prisma.project.create({
      data: {
        projectName: sanitizeAdminInput(body.projectName),
        builderName: sanitizeAdminInput(body.builderName),
        microMarket: sanitizeAdminInput(body.microMarket),
        constructionStatus: sanitizeAdminInput(body.constructionStatus),
        minPrice: Number(body.minPrice),
        maxPrice: Number(body.maxPrice),
        pricePerSqft: Number(body.pricePerSqft),
        availableUnits: Number(body.availableUnits),
        possessionDate: new Date(body.possessionDate),
        reraNumber: body.reraNumber,
        unitTypes: body.unitTypes ?? [],
        amenities: body.amenities ?? [],
        locationScore: Number(body.locationScore ?? 50),
        amenitiesScore: Number(body.amenitiesScore ?? 50),
        infrastructureScore: Number(body.infrastructureScore ?? 50),
        demandScore: Number(body.demandScore ?? 50),
        isActive: body.isActive ?? true,
        latitude: Number(body.latitude ?? 23.0225),
        longitude: Number(body.longitude ?? 72.5714),
      }
    })
    await logAdminAction('create', 'project', { id: project.id, projectName: project.projectName }, session!.user!.email!)
    return NextResponse.json(project, { status: 201 })
  } catch (err) {
    console.error('Project POST error:', err)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}