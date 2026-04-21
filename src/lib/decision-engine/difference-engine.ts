// difference-engine.ts
// Identifies meaningful score gaps using significance thresholds (doc section 8.3)

import type { CategoryScores } from './score-engine'

export type SignificanceLevel = 'ignore' | 'mention_lightly' | 'meaningful' | 'strong'
export type CategoryWinner = 'A' | 'B' | 'tie'

export interface CategoryDiff {
  category: keyof CategoryScores
  scoreA: number
  scoreB: number
  diff: number  // A minus B (positive = A wins)
  winner: CategoryWinner
  significance: SignificanceLevel
}

export interface DifferenceAnalysis {
  diffs: CategoryDiff[]
  categoryWinners: Record<keyof CategoryScores, CategoryWinner>
  aStrengths: CategoryDiff[]  // meaningful+ wins for A
  bStrengths: CategoryDiff[]  // meaningful+ wins for B
}

// Significance thresholds (doc section 8.3)
function getSignificance(diff: number): SignificanceLevel {
  const abs = Math.abs(diff)
  if (abs <= 4) return 'ignore'
  if (abs <= 9) return 'mention_lightly'
  if (abs <= 14) return 'meaningful'
  return 'strong'
}

export function analyzeCategories(
  scoresA: CategoryScores,
  scoresB: CategoryScores
): DifferenceAnalysis {
  const categories = (Object.keys(scoresA) as (keyof CategoryScores)[]).sort()

  const diffs: CategoryDiff[] = categories.map(cat => {
    const diff = scoresA[cat] - scoresB[cat]
    const significance = getSignificance(diff)
    const winner: CategoryWinner =
      Math.abs(diff) <= 4 ? 'tie' : diff > 0 ? 'A' : 'B'
    return { category: cat, scoreA: scoresA[cat], scoreB: scoresB[cat], diff, winner, significance }
  })

  const categoryWinners = Object.fromEntries(
    diffs.map(d => [d.category, d.winner])
  ) as Record<keyof CategoryScores, CategoryWinner>

  const aStrengths = diffs.filter(d => d.winner === 'A' && (d.significance === 'meaningful' || d.significance === 'strong'))
  const bStrengths = diffs.filter(d => d.winner === 'B' && (d.significance === 'meaningful' || d.significance === 'strong'))

  return { diffs, categoryWinners, aStrengths, bStrengths }
}
