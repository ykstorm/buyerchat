import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    await prisma.chatSession.delete({
      where: { id }
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete session error:', err)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const chatSession = await prisma.chatSession.findFirst({
      where: { id, userId: session.user.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { role: true, content: true },
        },
      },
    })

    if (!chatSession) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ messages: chatSession.messages })
  } catch (err) {
    console.error('chat-sessions/[id] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}
