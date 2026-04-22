import { z } from 'zod'

/**
 * Zod schema for the admin Step-3 pricing form.
 *
 * All rupee amounts are integers; all percentages are 0-15. The schema is
 * shaped to match `PricingInput` in `calculator.ts` — the route handler
 * feeds parsed data straight into `calculateBreakdown`.
 */

const intRupee = z
  .number()
  .int()
  .min(0)
  .max(1_000_000_000) // 100 Cr ceiling — anything above is almost certainly a typo
  .optional()
  .nullable()

const percent = z.number().min(0).max(15)

const otherChargeSchema = z.object({
  label: z.string().min(1).max(60),
  amount: z.number().int().min(0).max(100_000_000),
})

export const PricingSchema = z
  .object({
    propertyType: z.enum(['flat', 'villa']),

    // FLAT
    basicRatePerSqft: z.number().int().min(1000).max(100_000).optional().nullable(),
    plcRatePerSqft: intRupee,
    floorRisePerSqft: intRupee,
    floorRiseFrom: z.number().int().min(0).max(200).optional().nullable(),
    unitFloorNo: z.number().int().min(0).max(200).optional().nullable(),

    // VILLA
    landRatePerSqyd: z.number().int().min(1000).max(500_000).optional().nullable(),
    consRatePerSqyd: z.number().int().min(500).max(200_000).optional().nullable(),
    plcRatePerSqyd: intRupee,

    // Dev & Govt
    audaGebAecCharge: intRupee,
    developmentFixed: intRupee,
    infrastructure: intRupee,

    // Maintenance & Deposits
    societyMaintDeposit: intRupee,
    advanceRunningMaint: intRupee,
    townshipDeposit: intRupee,
    townshipAdvance: intRupee,

    // Fixed Charges
    carParkingAmount: intRupee,
    carParkingCount: z.number().int().min(0).max(10).optional().nullable(),
    clubMembership: intRupee,
    legalCharges: intRupee,
    otherCharges: z.array(otherChargeSchema).max(5).optional().nullable(),

    // Tax & Stamp
    saleDeedAmount: intRupee,
    gstPercent: percent.default(5.0),
    stampDutyPercent: percent.default(4.9),
    registrationPercent: percent.default(1.0),

    // Area (sqft for flat, sqyd for villa). Required to compute breakdown.
    areaSqftOrSqyd: z.number().int().min(1).max(100_000),

    // Optional metadata
    changeReason: z.string().max(200).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.propertyType === 'flat') {
      if (data.basicRatePerSqft == null) {
        ctx.addIssue({
          code: 'custom',
          path: ['basicRatePerSqft'],
          message: 'basicRatePerSqft is required for flats',
        })
      }
    }
    if (data.propertyType === 'villa') {
      if (data.landRatePerSqyd == null) {
        ctx.addIssue({
          code: 'custom',
          path: ['landRatePerSqyd'],
          message: 'landRatePerSqyd is required for villas',
        })
      }
      if (data.consRatePerSqyd == null) {
        ctx.addIssue({
          code: 'custom',
          path: ['consRatePerSqyd'],
          message: 'consRatePerSqyd is required for villas',
        })
      }
    }
  })

export type PricingSchemaInput = z.infer<typeof PricingSchema>
