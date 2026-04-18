import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const PriceLogSchema = z.object({
  projectId: z.string().min(1),
  newPrice: z.number().positive().max(100000),
  changeType: z.enum(['increase', 'decrease', 'launch', 'offer']),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (session?.user?.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = PriceLogSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const { projectId, newPrice, changeType } = parsed.data

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
