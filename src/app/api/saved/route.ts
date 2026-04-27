import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const SaveSchema = z.object({
  projectId: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Please sign in first' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = SaveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const project = await prisma.project.findUnique({
    where: { id: parsed.data.projectId },
    select: { id: true }
  })
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  try {
    const saved = await prisma.savedProject.create({
      data: {
        userId: session.user.id,
        projectId: parsed.data.projectId,
      }
    })
    return NextResponse.json({ saved: true, id: saved.id })
  } catch {
    return NextResponse.json({ error: 'Already saved' }, { status: 409 })
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Please sign in first' }, { status: 401 })
  }

  // Dashboard cards (P2-DASHBOARD-SITE-REVAMP) need pricePerSqft, possession,
  // status, decisionTag, honestConcern, and builder.grade in addition to the
  // basic identity columns. All are read-only buyer-safe fields.
  const saved = await prisma.savedProject.findMany({
    where: { userId: session.user.id },
    include: {
      project: {
        select: {
          id: true,
          projectName: true,
          builderName: true,
          microMarket: true,
          minPrice: true,
          maxPrice: true,
          unitTypes: true,
          pricePerSqft: true,
          possessionDate: true,
          constructionStatus: true,
          decisionTag: true,
          honestConcern: true,
          builder: {
            select: { grade: true },
          },
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json({ savedProjects: saved })
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const parsed = SaveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }
    await prisma.savedProject.deleteMany({
      where: { userId: session.user.id, projectId: parsed.data.projectId }
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unsave error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}