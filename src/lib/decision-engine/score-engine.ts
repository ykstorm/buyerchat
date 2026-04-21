// score-engine.ts
// Calculates weighted scores and priority-adjusted scores
// Based on Decision Card Engine doc — deterministic logic, AI only for phrasing

export type BuyerPriority = 'family' | 'lifestyle' | 'investor' | 'risk_averse' | 'rental' | 'balanced'

export interface CategoryScores {
  location: number      // 0-100
  amenities: number     // 0-100
  builderTrust: number  // 0-100
  infrastructure: number // 0-100
  demand: number        // 0-100
}

export interface WeightedScore {
  total: number
  breakdown: Record<keyof CategoryScores, number>
  priority: BuyerPriority
}

// Base weights (document section 8.1)
const BASE_WEIGHTS: Record<keyof CategoryScores, number> = {
  location: 0.25,
  amenities: 0.20,
  builderTrust: 0.25,
  infrastructure: 0.15,
  demand: 0.15,
}

// Priority override weights (document section 8.2)
const PRIORITY_WEIGHTS: Record<BuyerPriority, Record<keyof CategoryScores, number>> = {
  family: {
    location: 0.30,
    amenities: 0.15,
    builderTrust: 0.25,
    infrastructure: 0.15,
    demand: 0.15,
  },
  lifestyle: {
    location: 0.20,
    amenities: 0.30,
    builderTrust: 0.20,
    infrastructure: 0.15,
    demand: 0.15,
  },
  risk_averse: {
    location: 0.25,
    amenities: 0.10,
    builderTrust: 0.40,
    infrastructure: 0.10,
    demand: 0.15,
  },
  investor: {
    location: 0.20,
    amenities: 0.10,
    builderTrust: 0.20,
    infrastructure: 0.20,
    demand: 0.30,
  },
  rental: {
    location: 0.25,
    amenities: 0.10,
    builderTrust: 0.15,
    infrastructure: 0.20,
    demand: 0.30,
  },
  balanced: BASE_WEIGHTS,
}

// Guard against undefined/NaN/null in any category — an undefined multiplied
// by a weight silently produces NaN, which then propagates into every
// downstream card field. Coerce to a neutral 50 (mid-scale) in that case so
// the card still renders something meaningful rather than "NaN / 100".
function safeScore(n: unknown): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 50
  if (n < 0) return 0
  if (n > 100) return 100
  return n
}

export function calculateWeightedScore(
  scores: CategoryScores,
  priority: BuyerPriority = 'balanced'
): WeightedScore {
  const weights = PRIORITY_WEIGHTS[priority]
  const safe: CategoryScores = {
    location: safeScore(scores?.location),
    amenities: safeScore(scores?.amenities),
    builderTrust: safeScore(scores?.builderTrust),
    infrastructure: safeScore(scores?.infrastructure),
    demand: safeScore(scores?.demand),
  }
  const breakdown: Record<keyof CategoryScores, number> = {
    location: safe.location * weights.location,
    amenities: safe.amenities * weights.amenities,
    builderTrust: safe.builderTrust * weights.builderTrust,
    infrastructure: safe.infrastructure * weights.infrastructure,
    demand: safe.demand * weights.demand,
  }
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0)
  return { total: Math.round(total), breakdown, priority }
}
