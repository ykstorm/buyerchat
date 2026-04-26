// Pricing fields may only be written via the canonical
// /admin/projects/[id]/pricing surface (and its API route), never via
// the legacy create form (Surface A) or the inline edit form
// (Surface B). See docs/diagnostics/pricing-surface-diagnosis.md and
// docs/MASTER_FIX_LIST.md A1.
//
// This module is the small, pure guard reused by:
//   - POST /api/admin/projects
//   - PUT  /api/admin/projects/[id]
// to reject write attempts that include any pricing-related field.
// Keeping it pure makes it trivially unit-testable without mocking
// auth, prisma, sanitizer, or rate-limit.

// Field names that cover the legacy Surface A/B inline pricing form
// (basicRate is a synonym alias for pricePerSqft used in the legacy form).
export const PRICING_LOCKED_FIELDS = [
  'basicRate',
  'minPrice',
  'maxPrice',
  'pricePerSqft',
  'pricePerSqftType',
  'loadingFactor',
  'charges',
  'allInPrice',
  'sbaSqftMin',
  'carpetSqftMin',
] as const

export type PricingLockedField = typeof PRICING_LOCKED_FIELDS[number]

// Returns the first locked field present in the body (any non-undefined
// value counts), or null if the body has no pricing fields. Returns the
// field name (not a boolean) so the caller can include it in the 400
// response and the Sentry breadcrumb for traceability.
export function findPricingViolation(body: unknown): PricingLockedField | null {
  if (!body || typeof body !== 'object') return null
  const obj = body as Record<string, unknown>
  for (const f of PRICING_LOCKED_FIELDS) {
    if (obj[f] !== undefined) return f
  }
  return null
}

export const PRICING_LOCKED_RESPONSE = {
  error: 'PRICING_LOCKED',
  reason:
    'Pricing fields must be updated via /api/admin/projects/[id]/pricing only.',
} as const
