import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { logAdminAction } from '@/lib/audit-log'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  try {
    const visit = await prisma.siteVisit.update({
      where: { id },
      data: { visitCompleted: true }
    })
    // Update buyer stage to post_visit
    await prisma.chatSession.updateMany({
      where: { userId: visit.userId },
      data: { buyerStage: 'post_visit' }
    })
    await logAdminAction('complete', 'visit', { id, visitToken: visit.visitToken, userId: visit.userId }, session!.user!.email!)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[visits/complete] error:', err)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
