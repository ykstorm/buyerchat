import { describe, it, expect } from 'vitest'
import {
  findPricingViolation,
  PRICING_LOCKED_FIELDS,
  PRICING_LOCKED_RESPONSE,
} from './pricing-lockdown'

describe('findPricingViolation', () => {
  it('returns null for a body with no pricing fields', () => {
    expect(findPricingViolation({ projectName: 'Test', microMarket: 'SBR' })).toBeNull()
    expect(findPricingViolation({})).toBeNull()
  })

  it('returns null for non-object bodies', () => {
    expect(findPricingViolation(null)).toBeNull()
    expect(findPricingViolation(undefined)).toBeNull()
    expect(findPricingViolation('string body')).toBeNull()
    expect(findPricingViolation(42)).toBeNull()
  })

  it('detects every individually locked field', () => {
    for (const f of PRICING_LOCKED_FIELDS) {
      expect(findPricingViolation({ [f]: 1 })).toBe(f)
    }
  })

  it('returns the first violation when multiple are present (order = PRICING_LOCKED_FIELDS order)', () => {
    expect(findPricingViolation({ pricePerSqft: 4200, minPrice: 5_000_000 })).toBe('minPrice')
    expect(findPricingViolation({ charges: [], loadingFactor: 1.37 })).toBe('loadingFactor')
  })

  it('treats explicit null as a real value (still a violation)', () => {
    expect(findPricingViolation({ minPrice: null })).toBe('minPrice')
  })

  it('does not flag fields when set to undefined (which is the lock-bypass shape)', () => {
    expect(findPricingViolation({ minPrice: undefined, projectName: 'Test' })).toBeNull()
  })

  it('ignores unrelated fields with similar names', () => {
    expect(findPricingViolation({ priceLabel: 'Premium' })).toBeNull()
    expect(findPricingViolation({ priceTier: 'A' })).toBeNull()
  })
})

describe('PRICING_LOCKED_RESPONSE shape', () => {
  it('has stable error + reason fields the UI can match on', () => {
    expect(PRICING_LOCKED_RESPONSE.error).toBe('PRICING_LOCKED')
    expect(PRICING_LOCKED_RESPONSE.reason).toContain('/api/admin/projects/[id]/pricing')
  })
})
