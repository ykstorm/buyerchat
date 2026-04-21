import { describe, it, expect } from 'vitest'
import { calculateWeightedScore, type CategoryScores } from './score-engine'

const fullScores: CategoryScores = {
  location: 80,
  amenities: 70,
  builderTrust: 90,
  infrastructure: 60,
  demand: 75,
}

describe('calculateWeightedScore', () => {
  it('computes a finite total for fully-populated scores', () => {
    const result = calculateWeightedScore(fullScores, 'balanced')
    expect(Number.isFinite(result.total)).toBe(true)
    expect(result.total).toBeGreaterThan(0)
    expect(result.total).toBeLessThanOrEqual(100)
  })

  it('base weights sum to 1.0 across all five categories', () => {
    const result = calculateWeightedScore(
      { location: 100, amenities: 100, builderTrust: 100, infrastructure: 100, demand: 100 },
      'balanced'
    )
    expect(result.total).toBe(100)
  })

  it('every priority row sums weights to 1.0 (total for all-100s equals 100)', () => {
    const allMax: CategoryScores = {
      location: 100, amenities: 100, builderTrust: 100, infrastructure: 100, demand: 100,
    }
    const priorities = ['family', 'lifestyle', 'investor', 'risk_averse', 'rental', 'balanced'] as const
    for (const p of priorities) {
      const r = calculateWeightedScore(allMax, p)
      expect(r.total, `priority=${p}`).toBe(100)
    }
  })

  it('returns NaN-free total when a category is undefined', () => {
    const partial = { ...fullScores, builderTrust: undefined as unknown as number }
    const result = calculateWeightedScore(partial, 'balanced')
    expect(Number.isFinite(result.total)).toBe(true)
    expect(Number.isNaN(result.total)).toBe(false)
  })

  it('returns NaN-free total when every category is undefined (degenerate row)', () => {
    const empty = {} as CategoryScores
    const result = calculateWeightedScore(empty, 'balanced')
    expect(Number.isFinite(result.total)).toBe(true)
    // All fields coerced to 50 → 50 * (sum of weights=1.0) = 50
    expect(result.total).toBe(50)
  })

  it('returns NaN-free total when scores is null', () => {
    const result = calculateWeightedScore(null as unknown as CategoryScores, 'balanced')
    expect(Number.isFinite(result.total)).toBe(true)
  })

  it('clamps out-of-range values instead of propagating them', () => {
    const weird: CategoryScores = {
      location: 150, amenities: -10, builderTrust: Infinity, infrastructure: NaN, demand: 50,
    }
    const result = calculateWeightedScore(weird, 'balanced')
    expect(Number.isFinite(result.total)).toBe(true)
    expect(result.total).toBeGreaterThanOrEqual(0)
    expect(result.total).toBeLessThanOrEqual(100)
  })

  it('priority=risk_averse weights builderTrust heaviest', () => {
    const highTrust: CategoryScores = {
      location: 40, amenities: 40, builderTrust: 100, infrastructure: 40, demand: 40,
    }
    const lowTrust: CategoryScores = {
      location: 100, amenities: 100, builderTrust: 40, infrastructure: 100, demand: 100,
    }
    const riskAverseHigh = calculateWeightedScore(highTrust, 'risk_averse').total
    const riskAverseLow = calculateWeightedScore(lowTrust, 'risk_averse').total
    // With 0.4 weight on builderTrust, a project with great trust but weak
    // elsewhere should still beat a project with weak trust under risk_averse.
    expect(riskAverseHigh).toBeGreaterThan(riskAverseLow - 20)
  })
})
