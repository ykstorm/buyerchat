import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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
    if (session?.user?.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await req.json()
    const parsed = AlertSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    const alert = await prisma.marketAlert.create({
      data: {
        type: parsed.data.alertType,
        title: parsed.data.message.slice(0, 100),
        description: parsed.data.message,
        projectName: parsed.data.projectId,
      }
    })
    return NextResponse.json(alert, { status: 201 })
  } catch (err) {
    console.error('Market alert POST error:', err)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}