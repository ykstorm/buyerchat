import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { auditWrite } from '@/lib/audit-write'
import { invalidateContextCache } from '@/lib/context-cache'
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
  commissionRatePct: z.number().min(0).max(100).default(1.5),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  const email = session?.user?.email?.toLowerCase()
  if (!email || email !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
  const ok = await rateLimit(`builder-create:${email}:${ip}`, 5, 60_000)
  if (!ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a minute.' },
      { status: 429, headers: { 'Retry-After': '60' } },
    )
  }

  try {
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const parsed = BuilderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const d = parsed.data
    const totalTrustScore =
      d.deliveryScore +
      d.reraScore +
      d.qualityScore +
      d.financialScore +
      d.responsivenessScore
    const grade = computeGrade(totalTrustScore)

    let builder
    try {
      builder = await prisma.builder.create({
        data: {
          ...d,
          // Strip injection patterns — these names flow into system-prompt context.
          builderName: sanitizeAdminInput(d.builderName),
          brandName: sanitizeAdminInput(d.brandName),
          totalTrustScore,
          grade,
          contactEmail: d.contactEmail ?? null,
          contactPhone: d.contactPhone ?? null,
          createdBy: email,
          // version defaults to 1 in the schema; auditWrite below bumps to 2.
        },
        select: {
          id: true,
          builderName: true,
          brandName: true,
          totalTrustScore: true,
          grade: true,
        },
      })
    } catch (createErr) {
      if (
        createErr instanceof Prisma.PrismaClientKnownRequestError &&
        createErr.code === 'P2002'
      ) {
        return NextResponse.json(
          { error: 'Builder with this name already exists.' },
          { status: 409 },
        )
      }
      throw createErr
    }

    // Genesis audit: action='create' at entityVersion=2 — same semantics as
    // Day 3 bulk-import. Reads "first appeared as a create event by <email>"
    // when audit-replay tools query the AuditLog table.
    await auditWrite({
      entity: 'Builder',
      entityId: builder.id,
      action: 'create',
      after: {
        builderName: builder.builderName,
        brandName: builder.brandName,
        totalTrustScore,
        grade,
        partnerStatus: d.partnerStatus,
      },
      actor: email,
    })

    await invalidateContextCache()
    // Fire-and-forget embedding — OpenAI failure must never block the admin save.
    embedBuilder(builder.builderName).catch((err) =>
      console.error('[embed-writer] embedBuilder failed for', builder.builderName, err),
    )
    return NextResponse.json(builder, { status: 201 })
  } catch (err) {
    console.error('Admin builder POST error:', err)
    Sentry.captureException(err, { tags: { module: 'admin-builders' } })
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
  }
}
