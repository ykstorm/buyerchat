import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { invalidateContextCache } from '@/lib/context-cache'
import { logAdminAction } from '@/lib/audit-log'
import { computeGrade } from '@/lib/grade'
import { sanitizeAdminInput } from '@/lib/sanitize'
import { embedBuilder } from '@/lib/rag/embed-writer'

const BuilderSchema = z.object({
  builderName: z.string().min(1),
  brandName: z.string().min(1),
  deliveryScore: z.number().min(0).max(30),
  reraScore: z.number().min(0).max(20),
  qualityScore: z.number().min(0).max(20),
  financialScore: z.number().min(0).max(15),
  responsivenessScore: z.number().min(0).max(15),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  partnerStatus: z.boolean().default(false),
  commissionRatePct: z.number().default(1.5),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
try {
  const body = await req.json()
  const parsed = BuilderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data
  const totalTrustScore = d.deliveryScore + d.reraScore + d.qualityScore + d.financialScore + d.responsivenessScore
  const grade = computeGrade(totalTrustScore)

  const builder = await prisma.builder.create({
    data: {
        ...d,
        // Strip injection patterns — these names flow into system-prompt context.
        builderName: sanitizeAdminInput(d.builderName),
        brandName: sanitizeAdminInput(d.brandName),
        totalTrustScore,
        grade,
        contactEmail: d.contactEmail ?? null,
        contactPhone: d.contactPhone ?? null,
      },
    select: {
      id: true,
      builderName: true,
      brandName: true,
      totalTrustScore: true,
      grade: true,
    }
  })
  await invalidateContextCache()
  await logAdminAction('create', 'builder', { id: builder.id, builderName: builder.builderName }, session!.user!.email!)
  // Fire-and-forget embedding — OpenAI failure must never block the admin save.
  embedBuilder(builder.builderName).catch((err) =>
    console.error('[embed-writer] embedBuilder failed for', builder.builderName, err)
  )
  return NextResponse.json(builder, { status: 201 })
}
catch (err) {
  console.error('Admin error:', err)
  return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
}}