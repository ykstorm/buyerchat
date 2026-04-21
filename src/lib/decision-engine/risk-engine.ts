// risk-engine.ts
// Generates risk alerts from weak categories, urgency signals, builder trust gaps

import type { CategoryScores } from './score-engine'
import type { BuyerContext } from './intent-engine'
import type { DifferenceAnalysis } from './difference-engine'

export interface RiskAlert {
  level: 'high' | 'medium' | 'low'
  message: string
}

export function buildRiskAlerts(
  scoresA: CategoryScores,
  scoresB: CategoryScores,
  diffs: DifferenceAnalysis,
  context: BuyerContext,
  nameA: string,
  nameB: string,
  possessionMonthsA?: number,
  possessionMonthsB?: number
): RiskAlert[] {
  const alerts: RiskAlert[] = []

  // Builder trust risk
  if (scoresA.builderTrust < 50) {
    alerts.push({ level: 'high', message: `${nameA} has a low builder trust score. Delivery certainty is not guaranteed.` })
  }
  if (scoresB.builderTrust < 50) {
    alerts.push({ level: 'high', message: `${nameB} has a low builder trust score. Delivery certainty is not guaranteed.` })
  }

  // Risk-averse buyer: point them toward the project with the stronger builder trust winner
  if (context.riskAverse && diffs.categoryWinners.builderTrust === 'B') {
    alerts.push({ level: 'medium', message: `Since you prioritise safety, note that ${nameB} has a stronger builder track record despite other advantages ${nameA} may offer.` })
  }
  if (context.riskAverse && diffs.categoryWinners.builderTrust === 'A') {
    alerts.push({ level: 'medium', message: `Since you prioritise safety, note that ${nameA} has a stronger builder track record despite other advantages ${nameB} may offer.` })
  }

  // Budget sensitive + hidden costs
  if (context.budgetSensitive) {
    alerts.push({ level: 'medium', message: 'Your total acquisition cost will rise once stamp duty (4.9%), registration (1%), and interior estimates are added. Verify final all-in cost before committing.' })
  }

  // Possession urgency
  if (context.urgencyHigh) {
    if (possessionMonthsA && possessionMonthsA > 24) {
      alerts.push({ level: 'medium', message: `${nameA} has a possession date more than 2 years away. If you need early possession, verify construction progress on site.` })
    }
    if (possessionMonthsB && possessionMonthsB > 24) {
      alerts.push({ level: 'medium', message: `${nameB} has a possession date more than 2 years away. If you need early possession, verify construction progress on site.` })
    }
  }

  // Low location score
  if (scoresA.location < 50 || scoresB.location < 50) {
    alerts.push({ level: 'low', message: 'Verify daily connectivity personally — school access, commute time, and commercial convenience are location-specific and change over time.' })
  }

  // Jantri cost note (hyperlocal — always relevant in Ahmedabad)
  alerts.push({ level: 'low', message: 'Jantri values in Shela and South Bopal can materially affect registration costs. Confirm the applicable Jantri rate with the sub-registrar office before booking.' })

  return alerts
}
