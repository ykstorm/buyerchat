/**
 * Compute letter grade from a total trust score.
 * Canonical thresholds per Master Blueprint — all routes MUST use this.
 */
export function computeGrade(totalScore: number): 'A' | 'B' | 'C' | 'D' {
  if (totalScore >= 85) return 'A'
  if (totalScore >= 70) return 'B'
  if (totalScore >= 55) return 'C'
  return 'D'
}
