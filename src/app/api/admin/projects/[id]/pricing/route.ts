import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAdminAction } from '@/lib/audit-log'
import { invalidateContextCache } from '@/lib/context-cache'
import { calculateBreakdown } from '@/lib/pricing/calculator'
import { PricingSchema } from '@/lib/pricing/validator'
import { Prisma } from '@prisma/client'

/**
 * Admin pricing Step-3 route.
 *
 * Admin gate (same pattern as `/api/admin/projects/route.ts`):
 *   `session.user.email === process.env.ADMIN_EMAIL`.
 * Origin CSRF check is enforced globally in `src/middleware.ts` for all
 * /api/admin POST/PUT/DELETE so we don't duplicate it here.
 */

async function requireAdmin() {
  const session = await auth()
  const email = session?.user?.email?.toLowerCase()
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase()
  if (!email || !adminEmail || email !== adminEmail) {
    return { ok: false as const, session: null }
  }
  return { ok: true as const, session }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireAdmin()
    if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { id } = await params

    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, projectName: true, builderName: true, sbaSqftMin: true, carpetSqftMin: true },
    })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const pricing = await prisma.projectPricing.findUnique({
      where: { projectId: id },
    })

    const history = await prisma.pricingHistory.findMany({
      where: { projectId: id },
      orderBy: { changedAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({ project, pricing, history })
  } catch (err) {
    console.error('Pricing GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch pricing' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireAdmin()
    if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { id } = await params

    const existing = await prisma.projectPricing.findUnique({ where: { projectId: id } })
    if (existing) {
      return NextResponse.json(
        { error: 'Pricing already exists — use PUT to update' },
        { status: 409 }
      )
    }

    const body = await req.json()
    const parsed = PricingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const d = parsed.data
    const area = d.areaSqftOrSqyd

    const breakdown = calculateBreakdown(d, area)
    const adminEmail = gate.session!.user!.email!

    const pricing = await prisma.projectPricing.create({
      data: {
        projectId: id,
        propertyType: d.propertyType,
        basicRatePerSqft: d.basicRatePerSqft ?? null,
        plcRatePerSqft: d.plcRatePerSqft ?? null,
        floorRisePerSqft: d.floorRisePerSqft ?? null,
        floorRiseFrom: d.floorRiseFrom ?? 1,
        unitFloorNo: d.unitFloorNo ?? null,
        landRatePerSqyd: d.landRatePerSqyd ?? null,
        consRatePerSqyd: d.consRatePerSqyd ?? null,
        plcRatePerSqyd: d.plcRatePerSqyd ?? null,
        audaGebAecCharge: d.audaGebAecCharge ?? null,
        developmentFixed: d.developmentFixed ?? null,
        infrastructure: d.infrastructure ?? null,
        societyMaintDeposit: d.societyMaintDeposit ?? null,
        advanceRunningMaint: d.advanceRunningMaint ?? null,
        townshipDeposit: d.townshipDeposit ?? null,
        townshipAdvance: d.townshipAdvance ?? null,
        carParkingAmount: d.carParkingAmount ?? null,
        carParkingCount: d.carParkingCount ?? 1,
        clubMembership: d.clubMembership ?? null,
        legalCharges: d.legalCharges ?? null,
        otherCharges:
          d.otherCharges && d.otherCharges.length
            ? (d.otherCharges as unknown as Prisma.InputJsonValue)
            : undefined,
        saleDeedAmount: d.saleDeedAmount ?? null,
        gstPercent: d.gstPercent,
        stampDutyPercent: d.stampDutyPercent,
        registrationPercent: d.registrationPercent,
        basicCostTotal: breakdown.basicCostTotal,
        plcTotal: breakdown.plcTotal,
        devGovtTotal: breakdown.devGovtTotal,
        maintenanceTotal: breakdown.maintenanceTotal,
        fixedChargesTotal: breakdown.fixedChargesTotal,
        stampRegTotal: breakdown.stampRegTotal,
        gstTotal: breakdown.gstTotal,
        grandTotalAllIn: breakdown.grandTotalAllIn,
        updatedBy: adminEmail,
        pricingVersion: 1,
      },
    })

    // Initial history snapshot
    await prisma.pricingHistory.create({
      data: {
        pricingId: pricing.id,
        projectId: id,
        basicRatePerSqft: pricing.basicRatePerSqft ?? null,
        grandTotalAllIn: pricing.grandTotalAllIn ?? null,
        snapshotJson: { ...pricing, history: undefined } as unknown as Prisma.InputJsonValue,
        changedBy: adminEmail,
        changeReason: d.changeReason ?? 'initial pricing',
      },
    })

    // Denormalize onto Project so buyer-facing chat/cards show real numbers.
    // min  = basicCostTotal (ex-taxes, ex-govt)
    // max  = grandTotalAllIn (what the buyer actually pays)
    // allInPrice = grandTotalAllIn
    await prisma.project.update({
      where: { id },
      data: {
        minPrice: breakdown.basicCostTotal,
        maxPrice: breakdown.grandTotalAllIn,
        allInPrice: breakdown.grandTotalAllIn,
      },
    })

    await invalidateContextCache()
    await logAdminAction(
      'create',
      'project_pricing',
      { id: pricing.id, projectId: id, grandTotalAllIn: breakdown.grandTotalAllIn },
      adminEmail
    )

    return NextResponse.json({ pricing, breakdown }, { status: 201 })
  } catch (err) {
    console.error('Pricing POST error:', err)
    return NextResponse.json({ error: 'Failed to create pricing' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireAdmin()
    if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { id } = await params

    const existing = await prisma.projectPricing.findUnique({ where: { projectId: id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'No pricing yet — use POST to create' },
        { status: 404 }
      )
    }

    const body = await req.json()
    const parsed = PricingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const d = parsed.data
    const area = d.areaSqftOrSqyd
    const breakdown = calculateBreakdown(d, area)
    const adminEmail = gate.session!.user!.email!

    const pricing = await prisma.projectPricing.update({
      where: { projectId: id },
      data: {
        propertyType: d.propertyType,
        basicRatePerSqft: d.basicRatePerSqft ?? null,
        plcRatePerSqft: d.plcRatePerSqft ?? null,
        floorRisePerSqft: d.floorRisePerSqft ?? null,
        floorRiseFrom: d.floorRiseFrom ?? 1,
        unitFloorNo: d.unitFloorNo ?? null,
        landRatePerSqyd: d.landRatePerSqyd ?? null,
        consRatePerSqyd: d.consRatePerSqyd ?? null,
        plcRatePerSqyd: d.plcRatePerSqyd ?? null,
        audaGebAecCharge: d.audaGebAecCharge ?? null,
        developmentFixed: d.developmentFixed ?? null,
        infrastructure: d.infrastructure ?? null,
        societyMaintDeposit: d.societyMaintDeposit ?? null,
        advanceRunningMaint: d.advanceRunningMaint ?? null,
        townshipDeposit: d.townshipDeposit ?? null,
        townshipAdvance: d.townshipAdvance ?? null,
        carParkingAmount: d.carParkingAmount ?? null,
        carParkingCount: d.carParkingCount ?? 1,
        clubMembership: d.clubMembership ?? null,
        legalCharges: d.legalCharges ?? null,
        otherCharges:
          d.otherCharges && d.otherCharges.length
            ? (d.otherCharges as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        saleDeedAmount: d.saleDeedAmount ?? null,
        gstPercent: d.gstPercent,
        stampDutyPercent: d.stampDutyPercent,
        registrationPercent: d.registrationPercent,
        basicCostTotal: breakdown.basicCostTotal,
        plcTotal: breakdown.plcTotal,
        devGovtTotal: breakdown.devGovtTotal,
        maintenanceTotal: breakdown.maintenanceTotal,
        fixedChargesTotal: breakdown.fixedChargesTotal,
        stampRegTotal: breakdown.stampRegTotal,
        gstTotal: breakdown.gstTotal,
        grandTotalAllIn: breakdown.grandTotalAllIn,
        updatedBy: adminEmail,
        pricingVersion: { increment: 1 },
      },
    })

    await prisma.pricingHistory.create({
      data: {
        pricingId: pricing.id,
        projectId: id,
        basicRatePerSqft: pricing.basicRatePerSqft ?? null,
        grandTotalAllIn: pricing.grandTotalAllIn ?? null,
        snapshotJson: { ...pricing, history: undefined } as unknown as Prisma.InputJsonValue,
        changedBy: adminEmail,
        changeReason: d.changeReason ?? null,
      },
    })

    await prisma.project.update({
      where: { id },
      data: {
        minPrice: breakdown.basicCostTotal,
        maxPrice: breakdown.grandTotalAllIn,
        allInPrice: breakdown.grandTotalAllIn,
      },
    })

    await invalidateContextCache()
    await logAdminAction(
      'update',
      'project_pricing',
      {
        id: pricing.id,
        projectId: id,
        grandTotalAllIn: breakdown.grandTotalAllIn,
        version: pricing.pricingVersion,
      },
      adminEmail
    )

    return NextResponse.json({ pricing, breakdown })
  } catch (err) {
    console.error('Pricing PUT error:', err)
    return NextResponse.json({ error: 'Failed to update pricing' }, { status: 500 })
  }
}
