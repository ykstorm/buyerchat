import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (session?.user?.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await req.json()
    const alert = await prisma.marketAlert.create({
      data: {
        type: body.type ?? 'other',
        title: body.title,
        description: body.description,
        projectName: body.projectName,
      }
    })
    return NextResponse.json(alert, { status: 201 })
  } catch (err) {
    console.error('Market alert POST error:', err)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}