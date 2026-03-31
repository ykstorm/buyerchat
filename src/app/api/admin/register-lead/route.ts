import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function generateToken(): string {
  const num = Math.floor(Math.random() * 9000) + 1000
  return `AG-${num}`
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (session?.user?.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { visitId } = await req.json()
    if (!visitId) return NextResponse.json({ error: 'visitId required' }, { status: 400 })

    const token = generateToken()
    const visit = await prisma.siteVisit.update({
      where: { id: visitId },
      data: {
        visitToken: token,
        leadRegisteredAt: new Date(),
      },
      include: { project: { select: { projectName: true } } }
    })

    return NextResponse.json({ token, visit })
  } catch (err) {
    console.error('Register lead error:', err)
    return NextResponse.json({ error: 'Failed to register lead' }, { status: 500 })
  }
}