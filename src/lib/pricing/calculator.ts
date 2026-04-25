/**
 * Pricing calculator for admin Step-3 (full cost sheet).
 *
 * Produces a 7-bucket breakdown that matches the ProjectCRM spec:
 *   basicCostTotal, plcTotal, devGovtTotal, maintenanceTotal,
 *   fixedChargesTotal, stampRegTotal, gstTotal, grandTotalAllIn
 *
 * All numbers are rupees (integers). Percentages are percents, not fractions
 * (e.g. gstPercent=5 means 5%).
 *
 * The math is pure — no DB calls. Safe to call on every keystroke in the
 * admin UI for live preview.
 */

export interface OtherCharge {
  label: string
  amount: number
}

export interface PricingInput {
  propertyType: 'flat' | 'villa'

  // FLAT
  basicRatePerSqft?: number | null
  plcRatePerSqft?: number | null
  floorRisePerSqft?: number | null
  floorRiseFrom?: number | null
  unitFloorNo?: number | null

  // VILLA
  landRatePerSqyd?: number | null
  consRatePerSqyd?: number | null
  plcRatePerSqyd?: number | null

  // Dev & Govt
  audaGebAecCharge?: number | null
  developmentFixed?: number | null
  infrastructure?: number | null

  // Maintenance & Deposits
  societyMaintDeposit?: number | null
  advanceRunningMaint?: number | null
  townshipDeposit?: number | null
  townshipAdvance?: number | null

  // Fixed Charges
  carParkingAmount?: number | null
  carParkingCount?: number | null
  clubMembership?: number | null
  legalCharges?: number | null
  otherCharges?: OtherCharge[] | null

  // Tax & Stamp
  saleDeedAmount?: number | null
  gstPercent?: number | null
  stampDutyPercent?: number | null
  registrationPercent?: number | null
}

export interface Breakdown {
  basicCostTotal: number
  plcTotal: number
  devGovtTotal: number
  maintenanceTotal: number
  fixedChargesTotal: number
  stampRegTotal: number
  gstTotal: number
  grandTotalAllIn: number
}

/**
 * Tolerant numeric coercion for values that may arrive from controlled
 * form inputs as strings (e.g. "4200"), or as null/undefined/empty/"abc".
 *
 * Returns a finite number, or 0 for any unparseable / non-positive value.
 * Exported because the form components and tests use it at the calculator
 * boundary to defeat the classic "string + string = concatenation" bug.
 */
export const num = (v: unknown): number => {
  if (v === null || v === undefined || v === '') return 0
  const n = typeof v === 'string' ? parseFloat(v) : Number(v)
  return Number.isFinite(n) ? n : 0
}

// Internal helper: same as num() but clamps negatives to 0 (calculator never
// wants negative line-items — a -100 PLC is treated as missing, not a credit).
const n = (v: unknown): number => {
  const x = num(v)
  return x > 0 ? x : 0
}

/**
 * Build the full breakdown.
 *
 * @param input      pricing fields straight from the admin form
 * @param sqftOrSqyd carpet/SBU area in sqft (for flat) or plot area in sqyd (for villa)
 */
export function calculateBreakdown(input: PricingInput, sqftOrSqyd: number): Breakdown {
  const area = n(sqftOrSqyd)

  // --- Basic Cost ---------------------------------------------------------
  let basicCostTotal = 0
  let plcTotal = 0

  if (input.propertyType === 'flat') {
    const basic = n(input.basicRatePerSqft)
    const plc = n(input.plcRatePerSqft)
    const floorRise = n(input.floorRisePerSqft)
    const floor = n(input.unitFloorNo)
    const floorBase = n(input.floorRiseFrom) || 1
    const floorDelta = Math.max(0, floor - floorBase)
    const ratePerSqft = basic + plc + floorRise * floorDelta
    basicCostTotal = Math.round(ratePerSqft * area)
    plcTotal = Math.round(plc * area)
  } else if (input.propertyType === 'villa') {
    const land = n(input.landRatePerSqyd)
    const cons = n(input.consRatePerSqyd)
    const plc = n(input.plcRatePerSqyd)
    basicCostTotal = Math.round((land + cons + plc) * area)
    plcTotal = Math.round(plc * area)
  }

  // --- Dev & Govt ---------------------------------------------------------
  const devGovtTotal =
    n(input.audaGebAecCharge) + n(input.developmentFixed) + n(input.infrastructure)

  // --- Maintenance & Deposits --------------------------------------------
  const maintenanceTotal =
    n(input.societyMaintDeposit) +
    n(input.advanceRunningMaint) +
    n(input.townshipDeposit) +
    n(input.townshipAdvance)

  // --- Fixed Charges ------------------------------------------------------
  const carParkCount = n(input.carParkingCount) || 1
  const otherSum = (input.otherCharges ?? []).reduce(
    (s, row) => s + n(row?.amount),
    0
  )
  const fixedChargesTotal =
    n(input.carParkingAmount) * carParkCount +
    n(input.clubMembership) +
    n(input.legalCharges) +
    otherSum

  // --- Tax / Stamp / Reg --------------------------------------------------
  // GST is applied to the basic cost (buyer convention: GST-on-BSP).
  const gstPercent = n(input.gstPercent)
  const gstTotal = Math.round((basicCostTotal * gstPercent) / 100)

  // Stamp + registration is on the sale-deed amount (usually = basic cost,
  // but operators sometimes enter a lower declared value — respect the field).
  const saleDeed = n(input.saleDeedAmount)
  const stampDuty = n(input.stampDutyPercent)
  const reg = n(input.registrationPercent)
  const stampRegTotal = Math.round((saleDeed * (stampDuty + reg)) / 100)

  const grandTotalAllIn =
    basicCostTotal +
    devGovtTotal +
    maintenanceTotal +
    fixedChargesTotal +
    gstTotal +
    stampRegTotal

  return {
    basicCostTotal,
    plcTotal,
    devGovtTotal,
    maintenanceTotal,
    fixedChargesTotal,
    stampRegTotal,
    gstTotal,
    grandTotalAllIn,
  }
}

/**
 * Per-BHK all-in calculator (Bug B).
 *
 * The Step-3 form has rate/sqft inputs but, prior to this fix, no
 * per-flat size — so the displayed "total" was per-sqft, which buyers
 * read as "₹4,725" and lost trust. This function consumes the same
 * `PricingInput` plus a single BHK's SBU sqft and returns the per-flat
 * all-in number that should be shown on the buyer-facing card.
 *
 * Field-name parity with the existing `PricingInput` interface:
 *   audaGebAecCharge   (NOT audaGebAec)
 *   floorRiseFrom / unitFloorNo are the threshold + actual floor
 *
 * `num()` is applied at every read so this is safe against string-typed
 * form state (same defense as `calculateBreakdown` after Bug A).
 */
export function calculateAllInForBhk(
  pricing: PricingInput,
  sbaSqftRaw: unknown
): {
  basic: number
  plc: number
  floorRise: number
  charges: number
  gst: number
  stampReg: number
  allIn: number
} {
  const sbaSqft = num(sbaSqftRaw)
  if (sbaSqft <= 0) {
    return { basic: 0, plc: 0, floorRise: 0, charges: 0, gst: 0, stampReg: 0, allIn: 0 }
  }

  const basic = num(pricing.basicRatePerSqft) * sbaSqft
  const plc = num(pricing.plcRatePerSqft) * sbaSqft

  // Floor rise only applies when the unit's floor exceeds the threshold.
  const unitFloorNo = num(pricing.unitFloorNo)
  const floorRiseFrom = num(pricing.floorRiseFrom)
  const floorRise =
    unitFloorNo > floorRiseFrom ? num(pricing.floorRisePerSqft) * sbaSqft : 0

  // Sum of operator-defined "other charges" rows. Strings tolerated.
  const otherChargesSum = (Array.isArray(pricing.otherCharges) ? pricing.otherCharges : []).reduce(
    (s, c) => s + num((c as { amount?: unknown })?.amount),
    0
  )

  const charges =
    num(pricing.audaGebAecCharge) +
    num(pricing.developmentFixed) +
    num(pricing.carParkingAmount) * num(pricing.carParkingCount) +
    num(pricing.clubMembership) +
    num(pricing.legalCharges) +
    otherChargesSum

  // Operator may declare a saleDeed lower than the computed BSP
  // (common stamp-duty optimisation). When unset / zero, fall back to
  // BSP + PLC + floor-rise so the buyer card never shows ₹0 GST.
  const saleDeed = num(pricing.saleDeedAmount) || basic + plc + floorRise

  const gst = saleDeed * (num(pricing.gstPercent) / 100)
  const stampReg =
    saleDeed *
    ((num(pricing.stampDutyPercent) + num(pricing.registrationPercent)) / 100)

  const allIn = basic + plc + floorRise + charges + gst + stampReg
  return { basic, plc, floorRise, charges, gst, stampReg, allIn }
}
