import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { generateVisitToken } from '@/lib/visit-token'
import { Resend } from 'resend'
import { z } from 'zod'

const resend = new Resend(process.env.RESEND_API_KEY)

const VisitSchema = z.object({
  projectId: z.string().min(1),
  visitScheduledDate: z.string(),
  buyerName: z.string().min(1).max(100).optional(),
  buyerPhone: z.string().length(10).regex(/^\d{10}$/).optional(),
  buyerEmail: z.string().optional(),
})
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const visits = await prisma.siteVisit.findMany({
      where: { userId: session.user.id },
      include: {
        project: {
          select: { projectName: true, builderName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(visits)
  } catch (err) {
    console.error('Visits fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch visits' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Please sign in first' }, { status: 401 })
  }
  try {

  const body = await req.json()
  const parsed = VisitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { projectId, visitScheduledDate } = parsed.data

  // Verify project exists
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { projectName: true, builderName: true }
  })

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const visitToken = generateVisitToken()
  const scheduledDate = new Date(visitScheduledDate)

const existing = await prisma.siteVisit.findFirst({
  where: { userId: session.user.id, projectId, visitCompleted: false }
})
if (existing) {
  return NextResponse.json(
    { visitToken: existing.visitToken },
    { status: 409 }
  )
}
  // Save visit to DB
  const siteVisit = await prisma.siteVisit.create({
    data: {
      visitToken,
      userId: session.user.id,
      projectId,
      visitScheduledDate: scheduledDate,
      otpVerified: false,
      ...(parsed.data.buyerName && { buyerName: parsed.data.buyerName }),
      ...(parsed.data.buyerPhone && { buyerPhone: parsed.data.buyerPhone }),
      buyerEmail: parsed.data.buyerEmail,
    }
  })

  // Send confirmation email — non-blocking
  try { await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to: session.user.email!,
    subject: `Site Visit Confirmed — ${project.projectName}`,
    html: `
      <h2>Your site visit is confirmed!</h2>
      <p><strong>Project:</strong> ${project.projectName}</p>
      <p><strong>Builder:</strong> ${project.builderName}</p>
      <p><strong>Date:</strong> ${new Date(visitScheduledDate).toLocaleDateString('en-IN')}</p>
      <p><strong>Your visit token:</strong> ${visitToken}</p>
      <p>Please bring this token to your site visit.</p>
    `
  }) } catch (emailErr) { console.error('Email failed:', emailErr) }

  // Generate commission evidence record
  const evidence = {
    token: siteVisit.visitToken,
    projectName: project.projectName,
    builderName: project.builderName,
    buyerName: parsed.data.buyerName ?? 'Anonymous',
    buyerPhone: parsed.data.buyerPhone ?? '—',
    platform: 'Homesty.ai',
    timestamp: new Date().toISOString(),
    userId: session.user.id,
    visitId: siteVisit.id,
    proof: `Buyer visited via Homesty.ai platform. OTP token ${siteVisit.visitToken} generated at ${new Date().toISOString()}. Commission protection active. Builder: ${project.builderName}. Project: ${project.projectName}.`
  }

  // Store evidence in session notes
  await prisma.chatSession.updateMany({
    where: { userId: session.user.id },
    data: { updatedAt: new Date() }
  }).catch(() => {})

  return NextResponse.json({
    visitToken: siteVisit.visitToken,
    evidence: {
      token: evidence.token,
      timestamp: evidence.timestamp,
      proof: evidence.proof
    }
  }, { status: 201 })
}
catch (err) {
  console.error('Visit request error:', err)
  return NextResponse.json({ error: 'Failed to create visit request' }, { status: 500 })
}}