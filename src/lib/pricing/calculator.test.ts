import { describe, it, expect } from 'vitest'
import {
  calculateAllInForBhk,
  calculateBreakdown,
  num,
  type PricingInput,
} from './calculator'

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

// Bug A — string-concatenation guard. Form state from controlled inputs
// can leak in as strings ("4200"), and `"4200" + "210" = "4200210"` would
// blow up the all-in total to ₹4,20,00,21,00,00,000 in the UI.
describe('num() — coercion helper', () => {
  it('num() casts strings, undefined, null', () => {
    expect(num('4200')).toBe(4200)
    expect(num(undefined)).toBe(0)
    expect(num(null)).toBe(0)
    expect(num('')).toBe(0)
    expect(num('abc')).toBe(0)
    expect(num(4200)).toBe(4200)
  })
})

describe('calculateBreakdown — string-typed PricingInput (Bug A)', () => {
  it('calculateGrandTotal accepts string-typed PricingInput', () => {
    // Every numeric field as a string, simulating raw form state leaking
    // into the calculator without coercion.
    const input = {
      propertyType: 'flat',
      basicRatePerSqft: '4200',
      plcRatePerSqft: '210',
      floorRisePerSqft: '50',
      floorRiseFrom: '1',
      unitFloorNo: '5',
      audaGebAecCharge: '150000',
      developmentFixed: '200000',
      infrastructure: '100000',
      societyMaintDeposit: '60000',
      advanceRunningMaint: '24000',
      townshipDeposit: '0',
      townshipAdvance: '0',
      carParkingAmount: '350000',
      carParkingCount: '1',
      clubMembership: '150000',
      legalCharges: '50000',
      otherCharges: [{ label: 'GEB', amount: '25000' as unknown as number }],
      saleDeedAmount: '9000000',
      gstPercent: '5',
      stampDutyPercent: '4.9',
      registrationPercent: '1.0',
    } as unknown as PricingInput

    const r = calculateBreakdown(input, '1800' as unknown as number)

    expect(Number.isFinite(r.grandTotalAllIn)).toBe(true)
    expect(Number.isNaN(r.grandTotalAllIn)).toBe(false)
    // String-concat would yield a number > 1e15. Real arithmetic stays
    // well below ₹100 Cr (1e9) for this fixture.
    expect(r.grandTotalAllIn).toBeLessThan(1e15)
    expect(r.grandTotalAllIn).toBeGreaterThan(0)
    // Sanity: matches the canonical numeric fixture.
    // (4200 + 210 + 50*4) * 1800 = 4610 * 1800 = 8,298,000 basic
    expect(r.basicCostTotal).toBe(8_298_000)
  })

  it('calculateGrandTotal returns 0 for empty inputs', () => {
    const empty = {
      propertyType: 'flat',
      basicRatePerSqft: '',
      plcRatePerSqft: undefined,
      floorRisePerSqft: '',
      floorRiseFrom: '',
      unitFloorNo: '',
      audaGebAecCharge: '',
      developmentFixed: undefined,
      infrastructure: '',
      societyMaintDeposit: undefined,
      advanceRunningMaint: '',
      townshipDeposit: '',
      townshipAdvance: '',
      carParkingAmount: '',
      carParkingCount: '',
      clubMembership: '',
      legalCharges: '',
      otherCharges: [],
      saleDeedAmount: '',
      gstPercent: '',
      stampDutyPercent: undefined,
      registrationPercent: '',
    } as unknown as PricingInput

    const r = calculateBreakdown(empty, '' as unknown as number)
    expect(r.grandTotalAllIn).toBe(0)
  })
})

// Bug B — per-BHK all-in calculator. Each BHK row needs its own per-flat
// total; previously the form had no flat size and showed a per-sqft "₹4,725"
// number that read as gibberish to buyers.
describe('calculateAllInForBhk — Bug B', () => {
  // Canonical fixture: 1100 sqft 2BHK at ₹4000/sqft.
  const baseInput: PricingInput = {
    propertyType: 'flat',
    basicRatePerSqft: 4000,
    plcRatePerSqft: 100,
    floorRisePerSqft: 50,
    floorRiseFrom: 1,
    unitFloorNo: 1, // equal to threshold → no floor rise
    audaGebAecCharge: 100000,
    developmentFixed: 150000,
    carParkingAmount: 300000,
    carParkingCount: 1,
    clubMembership: 100000,
    legalCharges: 25000,
    otherCharges: [],
    saleDeedAmount: 0, // fall back to basic+plc+floorRise
    gstPercent: 5,
    stampDutyPercent: 4.9,
    registrationPercent: 1.0,
  }

  it('canonical 1100 sqft @ ₹4000/sqft returns finite allIn within sane range', () => {
    const r = calculateAllInForBhk(baseInput, 1100)
    expect(Number.isFinite(r.allIn)).toBe(true)
    // basic = 4_400_000, plc = 110_000, floorRise = 0
    expect(r.basic).toBe(4_400_000)
    expect(r.plc).toBe(110_000)
    expect(r.floorRise).toBe(0)
    // saleDeed fallback = 4_510_000 → gst 5% = 225_500, stampReg 5.9% = 266_090
    expect(r.gst).toBeCloseTo(225_500, 0)
    expect(r.stampReg).toBeCloseTo(266_090, 0)
    // Sane range: between ₹40 L and ₹2 Cr for a 1100-sqft 2BHK
    expect(r.allIn).toBeGreaterThan(4_000_000)
    expect(r.allIn).toBeLessThan(20_000_000)
  })

  it('sbaSqft = 0 returns all zeros', () => {
    const r = calculateAllInForBhk(baseInput, 0)
    expect(r).toEqual({
      basic: 0,
      plc: 0,
      floorRise: 0,
      charges: 0,
      gst: 0,
      stampReg: 0,
      allIn: 0,
    })
    // Also for negatives / non-numeric.
    expect(calculateAllInForBhk(baseInput, -10).allIn).toBe(0)
    expect(calculateAllInForBhk(baseInput, 'abc').allIn).toBe(0)
    expect(calculateAllInForBhk(baseInput, null).allIn).toBe(0)
  })

  it('floor rise applies only when unitFloorNo > floorRiseFrom', () => {
    const below = calculateAllInForBhk(
      { ...baseInput, floorRiseFrom: 5, unitFloorNo: 3 },
      1000
    )
    expect(below.floorRise).toBe(0)

    const above = calculateAllInForBhk(
      { ...baseInput, floorRiseFrom: 5, unitFloorNo: 9 },
      1000
    )
    // floorRise = 50 * 1000 = 50_000 (rate * sqft, charged once when floor exceeds threshold)
    expect(above.floorRise).toBe(50_000)
    expect(above.allIn).toBeGreaterThan(below.allIn)

    // Equal floor → no rise (strict >)
    const equal = calculateAllInForBhk(
      { ...baseInput, floorRiseFrom: 5, unitFloorNo: 5 },
      1000
    )
    expect(equal.floorRise).toBe(0)
  })

  it('saleDeedAmount overrides computed sale-deed for GST/stamp basis', () => {
    const declared = 3_000_000 // ₹30 L declared, well below computed BSP
    const r = calculateAllInForBhk(
      { ...baseInput, saleDeedAmount: declared },
      1100
    )
    // GST is 5% of declared, NOT of basic+plc.
    expect(r.gst).toBeCloseTo(declared * 0.05, 0)
    expect(r.stampReg).toBeCloseTo(declared * 0.059, 0)
  })

  it('otherCharges with mixed string and number amounts sums correctly via num()', () => {
    const mixed: PricingInput = {
      ...baseInput,
      otherCharges: [
        { label: 'GEB', amount: '25000' as unknown as number },
        { label: 'Maint', amount: 15000 },
        { label: 'Legal', amount: 'bogus' as unknown as number }, // ignored
        { label: 'Empty', amount: '' as unknown as number }, // ignored
      ],
    }
    const r = calculateAllInForBhk(mixed, 1000)
    const baseline = calculateAllInForBhk(baseInput, 1000)
    // Charges grew by exactly 25000 + 15000 = 40000 over the baseline.
    expect(r.charges - baseline.charges).toBe(40_000)
    // No NaN propagation — fundamental Bug-A guarantee.
    expect(Number.isFinite(r.allIn)).toBe(true)
  })
})
