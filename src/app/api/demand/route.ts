import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const DemandSchema = z.object({
  inquiryCount: z.number().int().positive(),
  weekOf: z.string(),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = DemandSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const demand = await prisma.buyerDemand.create({
    data: {
      inquiryCount: parsed.data.inquiryCount,
      weekOf: new Date(parsed.data.weekOf),
    }
  })

  return NextResponse.json(demand, { status: 201 })
}