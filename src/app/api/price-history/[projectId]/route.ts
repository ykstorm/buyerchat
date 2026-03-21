import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true }
  })

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const history = await prisma.priceHistory.findMany({
    where: { projectId },
    orderBy: { recordedAt: 'desc' },
    select: { pricePerSqft: true, recordedAt: true }
  })

  return NextResponse.json(history)
}