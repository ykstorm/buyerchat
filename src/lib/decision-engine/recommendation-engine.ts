// recommendation-engine.ts
// Generates conditional recommendations — NEVER declares one universal winner (doc Block 5)

import type { BuyerContext } from './intent-engine'
import type { WeightedScore } from './score-engine'
import type { DifferenceAnalysis } from './difference-engine'

export type ConfidenceLevel = 'high' | 'moderate' | 'low'

export interface Recommendation {
  conditions: { condition: string; project: 'A' | 'B' }[]
  overallDirection: string
  confidence: ConfidenceLevel
  confidenceReason: string
}

const PRIORITY_CONDITION_MAP: Record<string, { forA: string; forB: string }> = {
  builderTrust: {
    forA: 'you want lower booking regret and stronger delivery confidence',
    forB: 'you are comfortable accepting slightly more execution uncertainty',
  },
  amenities: {
    forA: 'lifestyle features and clubhouse experience matter more to you',
    forB: 'you are okay with fewer amenities in exchange for other advantages',
  },
  location: {
    forA: 'daily convenience, school access, and established surroundings are non-negotiable',
    forB: 'you prefer a quieter, greener environment and can accept a newer micro-market',
  },
  infrastructure: {
    forA: 'proximity to upcoming infrastructure (metro, roads) is important for your plans',
    forB: 'infrastructure development is a secondary consideration for you',
  },
  demand: {
    forA: 'future resale potential and rental demand are important',
    forB: 'you are buying for long-term self-use and not prioritising liquidity',
  },
}

export function getConfidenceLevel(
  baseScoreA: number,
  baseScoreB: number,
  diffs: DifferenceAnalysis,
  context: BuyerContext
): { level: ConfidenceLevel; reason: string } {
  const gap = Math.abs(baseScoreA - baseScoreB)
  const hasStrongDiffs = diffs.aStrengths.some(d => d.significance === 'strong') || diffs.bStrengths.some(d => d.significance === 'strong')
  const priorityClear = context.intentSignals.length > 0

  if (gap > 8 && hasStrongDiffs && priorityClear) {
    return { level: 'high', reason: 'Score gap is meaningful, one project leads clearly in key categories, and your priorities are clear.' }
  }
  if (gap >= 4 && priorityClear) {
    return { level: 'moderate', reason: 'Score gap exists and priorities are somewhat clear, but the trade-off is genuine.' }
  }
  return { level: 'low', reason: 'Scores are close or priorities are unclear. Visit both before deciding.' }
}

export function buildRecommendation(
  context: BuyerContext,
  baseScoreA: number,
  baseScoreB: number,
  diffs: DifferenceAnalysis,
  nameA: string,
  nameB: string
): Recommendation {
  const { level, reason } = getConfidenceLevel(baseScoreA, baseScoreB, diffs, context)

  // Build conditions from top diffs
  const conditions: { condition: string; project: 'A' | 'B' }[] = []

  const topADiff = diffs.aStrengths[0]
  const topBDiff = diffs.bStrengths[0]

  if (topADiff) {
    const condMap = PRIORITY_CONDITION_MAP[topADiff.category]
    if (condMap) conditions.push({ condition: `If ${condMap.forA}`, project: 'A' })
  }

  if (topBDiff) {
    const condMap = PRIORITY_CONDITION_MAP[topBDiff.category]
    if (condMap) conditions.push({ condition: `If ${condMap.forB}`, project: 'B' })
  }

  // Priority-specific override
  if (context.priority === 'risk_averse') {
    conditions.unshift({ condition: 'If your priority is lower decision regret and builder safety', project: diffs.categoryWinners.builderTrust === 'A' ? 'A' : 'B' })
  }
  if (context.priority === 'family') {
    conditions.unshift({ condition: 'If your priority is family convenience and school access', project: diffs.categoryWinners.location === 'A' ? 'A' : 'B' })
  }
  if (context.priority === 'investor') {
    conditions.unshift({ condition: 'If your priority is future resale and rental yield', project: diffs.categoryWinners.demand === 'A' ? 'A' : 'B' })
  }

  // Overall direction — never says "best"
  const gap = baseScoreA - baseScoreB
  let overallDirection: string

  if (Math.abs(gap) <= 4) {
    overallDirection = `${nameA} and ${nameB} are closely matched. Your final choice should depend on which trade-off you are more comfortable living with.`
  } else if (gap > 0) {
    const winCat = diffs.aStrengths[0]?.category
    const label = winCat ? (PRIORITY_CONDITION_MAP[winCat] ? `stronger ${winCat === 'builderTrust' ? 'builder confidence' : winCat}` : 'overall score') : 'overall score'
    overallDirection = `${nameA} is the more cautious choice due to ${label}. ${nameB} may suit buyers who prioritise ${diffs.bStrengths[0] ? diffs.bStrengths[0].category : 'lifestyle'} over safety.`
  } else {
    const winCat = diffs.bStrengths[0]?.category
    const label = winCat ? (PRIORITY_CONDITION_MAP[winCat] ? `stronger ${winCat === 'builderTrust' ? 'builder confidence' : winCat}` : 'overall score') : 'overall score'
    overallDirection = `${nameB} is the more cautious choice due to ${label}. ${nameA} may suit buyers who prioritise ${diffs.aStrengths[0] ? diffs.aStrengths[0].category : 'lifestyle'} over safety.`
  }

  return { conditions, overallDirection, confidence: level, confidenceReason: reason }
}
