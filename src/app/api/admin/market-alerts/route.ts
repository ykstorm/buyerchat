import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAdminAction } from '@/lib/audit-log'
import { sanitizeAdminInput } from '@/lib/sanitize'
import { z } from 'zod'

const AlertSchema = z.object({
  projectId: z.string().min(1),
  alertType: z.string().min(1),
  message: z.string().min(1).max(500),
  severity: z.enum(['low', 'medium', 'high']).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (session?.user?.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await req.json()
    const parsed = AlertSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    // Resolve projectId → projectName for storage
    const project = await prisma.project.findUnique({
      where: { id: parsed.data.projectId },
      select: { projectName: true },
    })
    // Sanitize before storage — this field reaches LLM context via the
    // market-alerts feed surfaced in the system prompt.
    const cleanMessage = sanitizeAdminInput(parsed.data.message)
    const alert = await prisma.marketAlert.create({
      data: {
        type: parsed.data.alertType,
        title: cleanMessage.slice(0, 100),
        description: cleanMessage,
        projectName: project?.projectName ?? parsed.data.projectId,
      }
    })
    await logAdminAction('create', 'market_alert', { id: alert.id, type: alert.type, projectName: alert.projectName }, session!.user!.email!)
    return NextResponse.json(alert, { status: 201 })
  } catch (err) {
    console.error('Market alert POST error:', err)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}