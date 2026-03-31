import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeAdminInput } from '@/lib/sanitize'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (session?.user?.email !== process.env.ADMIN_EMAIL) {
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
    if (session?.user?.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await params
    const body = await req.json()
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
      }
    })
    return NextResponse.json(project)
  } catch (err) {
    console.error('Project PUT error:', err)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (session?.user?.email !== process.env.ADMIN_EMAIL) {
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