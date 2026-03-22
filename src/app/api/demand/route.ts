import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const DemandSchema = z.object({
  inquiryCount: z.number().int().positive(),
  weekOf: z.string().datetime(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = DemandSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const demand = await prisma.buyerDemand.create({
      data: {
        inquiryCount: parsed.data.inquiryCount,
        weekOf: new Date(parsed.data.weekOf),
      }
    })
    return NextResponse.json(demand, { status: 201 })
  } catch (err) {
    console.error('BuyerDemand create error:', err)
    return NextResponse.json({ error: 'Failed to record demand' }, { status: 500 })
  }
}