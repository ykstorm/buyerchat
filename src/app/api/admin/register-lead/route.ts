import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAdminAction } from '@/lib/audit-log'

function generateToken(): string {
  const bytes = new Uint8Array(3)
  crypto.getRandomValues(bytes)
  return `AG-${Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('').toUpperCase()}`
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (session?.user?.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
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

    await logAdminAction('register_lead', 'visit', { id: visitId, token, projectName: visit.project?.projectName }, session!.user!.email!)
    return NextResponse.json({ token, visit })
  } catch (err) {
    console.error('Register lead error:', err)
    return NextResponse.json({ error: 'Failed to register lead' }, { status: 500 })
  }
}