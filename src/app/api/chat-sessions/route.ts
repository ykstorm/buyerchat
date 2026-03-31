import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json([])
    const sessions = await prisma.chatSession.findMany({
      where: { userId: session.user.id },
      orderBy: { lastMessageAt: 'desc' },
      take: 20,
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 1 } }
    })
    return NextResponse.json(sessions.map(s => ({
      id: s.id,
      buyerStage: s.buyerStage,
      buyerBudget: s.buyerBudget,
      buyerConfig: s.buyerConfig,
      lastMessageAt: s.lastMessageAt,
      firstMessage: s.messages[0]?.content ?? ''
    })))
  } catch {
    return NextResponse.json([])
  }
}
