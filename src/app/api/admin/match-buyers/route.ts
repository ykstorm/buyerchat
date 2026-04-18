import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { projectId } = await req.json()

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const buyers = await prisma.chatSession.findMany({
    where: {
      buyerStage: { notIn: ['decision'] },
      qualificationDone: true,
    },
    select: {
      id: true,
      buyerBudget: true,
      buyerConfig: true,
      buyerPersona: true,
      buyerPurpose: true,
      buyerStage: true,
      lastMessageAt: true,
    }
  })

  const matched = buyers.filter(b => {
    if (!b.buyerBudget) return false
    const budgetFits = project.minPrice === 0 || b.buyerBudget >= project.minPrice * 0.8
    const configFits = !b.buyerConfig || !project.unitTypes || project.unitTypes.length === 0 ||
      project.unitTypes.some(u => u.toLowerCase().includes(b.buyerConfig!.toLowerCase().replace('BHK', '').trim()))
    return budgetFits && configFits
  })

  return NextResponse.json({
    project: { id: project.id, name: project.projectName },
    matchedBuyers: matched.length,
    buyers: matched.map(b => ({
      id: b.id,
      budget: b.buyerBudget,
      config: b.buyerConfig,
      stage: b.buyerStage,
      daysSilent: Math.floor((Date.now() - new Date(b.lastMessageAt).getTime()) / 86400000)
    }))
  })
}
