import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { invalidateContextCache } from '@/lib/context-cache'
import { logAdminAction } from '@/lib/audit-log'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const builder = await prisma.builder.findUnique({ where: { id } })
  if (!builder) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(builder)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const body = await req.json()

    if (body.builderName || body.brandName) {
      const existing = await prisma.builder.findUnique({ where: { id }, select: { builderName: true, brandName: true } })
      if (!existing) return NextResponse.json({ error: 'Builder not found' }, { status: 404 })
      const nameChanged = (body.builderName && body.builderName !== existing.builderName) ||
                          (body.brandName && body.brandName !== existing.brandName)
      if (nameChanged) {
        const projectCount = await prisma.project.count({ where: { builderName: existing.builderName } })
        if (projectCount > 0) {
          return NextResponse.json(
            { error: 'Cannot rename builder with active projects. Update individual projects instead.' },
            { status: 409 }
          )
        }
      }
    }

    const builder = await prisma.builder.update({
      where: { id },
      data: {
        ...(body.builderName && { builderName: body.builderName }),
        ...(body.brandName && { brandName: body.brandName }),
        ...(body.deliveryScore !== undefined && { deliveryScore: Number(body.deliveryScore) }),
        ...(body.reraScore !== undefined && { reraScore: Number(body.reraScore) }),
        ...(body.qualityScore !== undefined && { qualityScore: Number(body.qualityScore) }),
        ...(body.financialScore !== undefined && { financialScore: Number(body.financialScore) }),
        ...(body.responsivenessScore !== undefined && { responsivenessScore: Number(body.responsivenessScore) }),
        ...(body.totalTrustScore !== undefined && { totalTrustScore: Number(body.totalTrustScore) }),
        ...(body.grade && { grade: body.grade }),
        ...(body.contactEmail && { contactEmail: body.contactEmail }),
        ...(body.contactPhone && { contactPhone: body.contactPhone }),
        ...(body.partnerStatus !== undefined && { partnerStatus: Boolean(body.partnerStatus) }),
        ...(body.commissionRatePct !== undefined && { commissionRatePct: Number(body.commissionRatePct) }),
      },
    })
    invalidateContextCache()
    await logAdminAction('update', 'builder', { id, builderName: builder.builderName }, session!.user!.email!)
    return NextResponse.json(builder)
  } catch (err) {
    console.error('Builder PUT error:', err)
    return NextResponse.json({ error: 'Failed to update builder' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const builder = await prisma.builder.findUnique({ where: { id }, select: { builderName: true } })
    if (!builder) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const projectCount = await prisma.project.count({ where: { builderName: builder.builderName } })
    if (projectCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete builder with active projects.' },
        { status: 409 }
      )
    }
    await prisma.builder.delete({ where: { id } })
    await logAdminAction('delete', 'builder', { id, builderName: builder?.builderName ?? '—' }, session!.user!.email!)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Builder DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete builder' }, { status: 500 })
  }
}
