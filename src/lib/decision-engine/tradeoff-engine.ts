// tradeoff-engine.ts
// Generates the one-line trade-off statement (doc section Block 4)

import type { DifferenceAnalysis } from './difference-engine'
import type { BuyerContext } from './intent-engine'

export interface TradeOff {
  headline: string
  statement: string
}

const CATEGORY_LABELS: Record<string, string> = {
  builderTrust: 'builder safety',
  amenities: 'lifestyle amenities',
  location: 'location convenience',
  infrastructure: 'infrastructure access',
  demand: 'future demand potential',
}

export function buildTradeoff(
  diffs: DifferenceAnalysis,
  context: BuyerContext,
  nameA: string,
  nameB: string
): TradeOff {
  const topA = diffs.aStrengths[0]
  const topB = diffs.bStrengths[0]

  if (!topA && !topB) {
    return {
      headline: 'Very close call',
      statement: `${nameA} and ${nameB} are closely matched. The decision depends on which micro-market character suits you better.`
    }
  }

  if (topA && !topB) {
    return {
      headline: `${nameA} leads clearly`,
      statement: `You are choosing a project with stronger ${CATEGORY_LABELS[topA.category] ?? topA.category}. ${nameB} does not offer a clear advantage in any major category.`
    }
  }

  if (!topA && topB) {
    return {
      headline: `${nameB} leads clearly`,
      statement: `You are choosing a project with stronger ${CATEGORY_LABELS[topB.category] ?? topB.category}. ${nameA} does not offer a clear advantage in any major category.`
    }
  }

  // Both topA and topB are defined here: the three early-returns above cover
  // every case where either could be undefined.
  if (!topA || !topB) {
    return {
      headline: 'Very close call',
      statement: `${nameA} and ${nameB} are closely matched. The decision depends on which micro-market character suits you better.`
    }
  }
  const aLabel = CATEGORY_LABELS[topA.category] ?? topA.category
  const bLabel = CATEGORY_LABELS[topB.category] ?? topB.category

  return {
    headline: `${aLabel} vs ${bLabel}`,
    statement: `You are choosing between ${aLabel} (${nameA}) and ${bLabel} (${nameB}).`
  }
}
