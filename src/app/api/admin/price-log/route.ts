import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (session?.user?.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json() as {
      projectId: string
      newPrice: number
      changeType: 'increase' | 'decrease' | 'launch' | 'offer'
    }
    const { projectId, newPrice, changeType } = body

    if (!projectId || typeof newPrice !== 'number' || newPrice <= 0 || !changeType) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { projectName: true },
    })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    await prisma.priceHistory.create({
      data: { projectId, pricePerSqft: newPrice },
    })

    await prisma.marketAlert.create({
      data: {
        type: 'price_change',
        title: `Price ${changeType} — ${newPrice}/sqft`,
        description: 'Updated from admin panel',
        projectName: project.projectName,
      },
    })

    const affectedBuyers = await prisma.chatSession.count({
      where: { projectsDisclosed: { has: projectId } },
    })

    return NextResponse.json({ success: true, affectedBuyers })
  } catch (err) {
    console.error('price-log error:', err)
    return NextResponse.json({ error: 'Failed to log price' }, { status: 500 })
  }
}
