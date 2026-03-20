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
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Please sign in first' }, { status: 401 })
  }

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

  // Save visit to DB
  const visit = await prisma.siteVisit.create({
    data: {
      visitToken,
      userId: session.user.id,
      projectId,
      visitScheduledDate: scheduledDate,
      otpVerified: false,
    }
  })

  // Send confirmation email
  await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to: session.user.email!,
    subject: `Site Visit Confirmed — ${project.projectName}`,
    html: `
      <h2>Your site visit is confirmed!</h2>
      <p><strong>Project:</strong> ${project.projectName}</p>
      <p><strong>Builder:</strong> ${project.builderName}</p>
      <p><strong>Date:</strong> ${scheduledDate.toDateString()}</p>
      <p><strong>Your visit token:</strong> ${visitToken}</p>
      <p>Please bring this token to your site visit.</p>
    `
  })

  return NextResponse.json({ visitToken, visit }, { status: 201 })
}