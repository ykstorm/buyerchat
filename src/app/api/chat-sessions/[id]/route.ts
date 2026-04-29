import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const { customName } = await req.json()
    if (!customName || typeof customName !== 'string') {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
    }
    const updated = await prisma.chatSession.update({
      where: { id, userId: session.user.id },
      data: { customName: customName.trim().slice(0, 60) }
    })
    return NextResponse.json({ customName: updated.customName })
  } catch {
    return NextResponse.json({ error: 'Failed to rename' }, { status: 500 })
  }
}

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
      where: { id, userId: session.user.id }
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
      select: {
        buyerStage: true,
        captureStage: true,
        artifactHistory: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { role: true, content: true },
        },
      },
    })

    if (!chatSession) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({
      messages: chatSession.messages,
      buyerStage: chatSession.buyerStage,
      captureStage: chatSession.captureStage,
      // Sprint 2 (2026-04-29) — surface persisted artifacts. Hydration
      // happens client-side in chat-client.tsx via lib/artifact-hydrate.ts
      // by joining IDs against the loaded projects/builders arrays.
      artifactHistory: Array.isArray(chatSession.artifactHistory)
        ? (chatSession.artifactHistory as unknown[])
        : [],
    })
  } catch (err) {
    console.error('chat-sessions/[id] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}
