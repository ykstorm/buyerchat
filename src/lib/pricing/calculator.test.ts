import { describe, it, expect } from 'vitest'
import { calculateBreakdown, type PricingInput } from './calculator'

describe('calculateBreakdown — flat', () => {
  // Canonical Shela 3BHK fixture — 1800 sqft SBU at ₹5000 base.
  const flat: PricingInput = {
    propertyType: 'flat',
    basicRatePerSqft: 5000,
    plcRatePerSqft: 100,
    floorRisePerSqft: 50,
    floorRiseFrom: 1,
    unitFloorNo: 5, // 4 floors above base
    audaGebAecCharge: 150000,
    developmentFixed: 200000,
    infrastructure: 100000,
    societyMaintDeposit: 60000,
    advanceRunningMaint: 24000,
    townshipDeposit: 0,
    townshipAdvance: 0,
    carParkingAmount: 350000,
    carParkingCount: 1,
    clubMembership: 150000,
    legalCharges: 50000,
    otherCharges: [{ label: 'GEB Deposit', amount: 25000 }],
    saleDeedAmount: 9000000, // 90 L — typical declared value
    gstPercent: 5,
    stampDutyPercent: 4.9,
    registrationPercent: 1.0,
  }
  const result = calculateBreakdown(flat, 1800)

  it('basicCostTotal = (basic + plc + floorRise*(floor-base)) * sqft', () => {
    // (5000 + 100 + 50*4) * 1800 = 5300 * 1800 = 9,540,000
    expect(result.basicCostTotal).toBe(9_540_000)
  })

  it('plcTotal = plcRatePerSqft * sqft', () => {
    expect(result.plcTotal).toBe(180_000)
  })

  it('devGovtTotal sums AUDA + dev + infra', () => {
    expect(result.devGovtTotal).toBe(450_000)
  })

  it('maintenanceTotal sums 4 deposits', () => {
    expect(result.maintenanceTotal).toBe(84_000)
  })

  it('fixedChargesTotal includes parking*count + club + legal + other', () => {
    // 350000 + 150000 + 50000 + 25000 = 575,000
    expect(result.fixedChargesTotal).toBe(575_000)
  })

  it('gstTotal = basicCostTotal * gstPercent / 100', () => {
    // 9,540,000 * 5% = 477,000
    expect(result.gstTotal).toBe(477_000)
  })

  it('stampRegTotal = saleDeed * (stamp + reg) / 100', () => {
    // 9,000,000 * (4.9 + 1.0) / 100 = 531,000
    expect(result.stampRegTotal).toBe(531_000)
  })

  it('grandTotalAllIn sums all buckets except plc (already folded into basicCost)', () => {
    // 9,540,000 + 450,000 + 84,000 + 575,000 + 477,000 + 531,000 = 11,657,000
    expect(result.grandTotalAllIn).toBe(11_657_000)
  })
})

describe('calculateBreakdown — villa', () => {
  const villa: PricingInput = {
    propertyType: 'villa',
    landRatePerSqyd: 20000,
    consRatePerSqyd: 5000,
    plcRatePerSqyd: 500,
    developmentFixed: 300000,
    saleDeedAmount: 5_000_000,
    gstPercent: 5,
    stampDutyPercent: 4.9,
    registrationPercent: 1.0,
  }

  it('basicCost = (land + cons + plc) * sqyd', () => {
    // (20000 + 5000 + 500) * 200 = 5,100,000
    const r = calculateBreakdown(villa, 200)
    expect(r.basicCostTotal).toBe(5_100_000)
    expect(r.plcTotal).toBe(100_000)
  })

  it('grandTotal folds everything together', () => {
    const r = calculateBreakdown(villa, 200)
    // basic 5,100,000 + devGovt 300,000 + gst(5% of 5,100,000)=255,000
    // + stampReg(5.9% of 5,000,000)=295,000  => 5,950,000
    expect(r.grandTotalAllIn).toBe(5_950_000)
  })
})

describe('calculateBreakdown — defensive', () => {
  it('treats missing/negative/NaN fields as zero', () => {
    const r = calculateBreakdown(
      {
        propertyType: 'flat',
        basicRatePerSqft: 5000,
        plcRatePerSqft: -10,
        floorRisePerSqft: Number.NaN as unknown as number,
        unitFloorNo: 3,
        otherCharges: [{ label: 'bad', amount: Number.NaN as unknown as number }],
      },
      1000
    )
    // Only basicRate counts: 5000 * 1000 = 5,000,000; everything else clean zero.
    expect(r.basicCostTotal).toBe(5_000_000)
    expect(r.plcTotal).toBe(0)
    expect(r.fixedChargesTotal).toBe(0)
    expect(r.grandTotalAllIn).toBe(5_000_000)
  })

  it('zero area returns zero basicCost but still sums fixed charges', () => {
    const r = calculateBreakdown(
      {
        propertyType: 'flat',
        basicRatePerSqft: 5000,
        clubMembership: 150000,
        gstPercent: 5,
      },
      0
    )
    expect(r.basicCostTotal).toBe(0)
    expect(r.fixedChargesTotal).toBe(150_000)
    expect(r.gstTotal).toBe(0)
    expect(r.grandTotalAllIn).toBe(150_000)
  })

  it('floorRise does not go negative when unit floor is below base', () => {
    const r = calculateBreakdown(
      {
        propertyType: 'flat',
        basicRatePerSqft: 5000,
        floorRisePerSqft: 50,
        floorRiseFrom: 5,
        unitFloorNo: 2, // below base — delta clamps to 0
      },
      1000
    )
    expect(r.basicCostTotal).toBe(5_000_000)
  })
})
