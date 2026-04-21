// decision-card-builder.ts
// Orchestrator — calls all engines in sequence, returns final DecisionCard JSON
// This is what the chat route calls when comparison intent is detected

import { calculateWeightedScore, type CategoryScores } from './score-engine'
import { analyzeCategories } from './difference-engine'
import { detectBuyerContext } from './intent-engine'
import { buildTradeoff } from './tradeoff-engine'
import { buildRiskAlerts } from './risk-engine'
import { buildRecommendation, getConfidenceLevel } from './recommendation-engine'

export interface ProjectInput {
  id: string
  name: string
  builderName: string
  microMarket: string
  scores: CategoryScores
  possessionDate?: string
  minPrice?: number
  maxPrice?: number
  reraNumber?: string
}

export interface DecisionCard {
  buyerContext: ReturnType<typeof detectBuyerContext>
  projectA: { id: string; name: string; builder: string; score: number }
  projectB: { id: string; name: string; builder: string; score: number }
  categoryWinners: ReturnType<typeof analyzeCategories>['categoryWinners']
  meaningLayer: string[]
  tradeoff: ReturnType<typeof buildTradeoff>
  recommendation: ReturnType<typeof buildRecommendation>
  riskAlerts: ReturnType<typeof buildRiskAlerts>
  nextSteps: string[]
  generatedAt: string
}

// v1.1 gap: negative return means possession is already overdue; risk-engine does not flag this case yet.
function getMonthsUntilPossession(dateStr?: string): number | undefined {
  if (!dateStr) return undefined
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.round(diff / (1000 * 60 * 60 * 24 * 30))
}

function buildMeaningLayer(
  diffs: ReturnType<typeof analyzeCategories>,
  projectA: ProjectInput,
  projectB: ProjectInput,
  context: ReturnType<typeof detectBuyerContext>
): string[] {
  const meanings: string[] = []

  for (const diff of diffs.diffs) {
    if (diff.significance === 'ignore') continue
    const winner = diff.winner === 'A' ? projectA.name : diff.winner === 'B' ? projectB.name : null
    if (!winner) continue

    const loser = winner === projectA.name ? projectB.name : projectA.name

    switch (diff.category) {
      case 'builderTrust':
        meanings.push(`${winner} leads on builder trust. This means lower booking regret risk and higher delivery confidence compared to ${loser}.`)
        break
      case 'amenities':
        meanings.push(`${winner} offers a stronger amenities package. This matters more for lifestyle-led buyers than for strict investors.`)
        break
      case 'location':
        if (winner === projectA.name && projectA.microMarket === 'South Bopal') {
          meanings.push(`${winner}'s South Bopal location gives stronger day-to-day convenience — established schools, commercial access, and family infrastructure.`)
        } else if (winner === projectA.name && projectA.microMarket === 'Shela') {
          meanings.push(`${winner}'s Shela location offers a quieter, greener, wider-road environment — preferred by buyers who value lifestyle character over immediate convenience.`)
        } else {
          meanings.push(`${winner} scores higher on location accessibility for your daily needs.`)
        }
        break
      case 'infrastructure':
        meanings.push(`${winner} benefits more from upcoming infrastructure improvements — metro corridor, road widening, and commercial development. This matters more for investors than end-users.`)
        break
      case 'demand':
        meanings.push(`${winner} shows stronger demand signals in the current market. This affects resale absorption and rental income potential.`)
        break
    }
  }

  return meanings.slice(0, 3) // max 3 meaning statements per card
}

function buildNextSteps(
  recommendation: ReturnType<typeof buildRecommendation>,
  riskAlerts: ReturnType<typeof buildRiskAlerts>,
  context: ReturnType<typeof detectBuyerContext>,
  projectA: ProjectInput,
  projectB: ProjectInput,
  scoreATotal: number,
  scoreBTotal: number
): string[] {
  const steps: string[] = []
  // Prefer the first condition's pick (preserves priority overrides), but if
  // conditions is empty — e.g. no strong diffs and no priority override fired —
  // fall back to the score-derived winner instead of silently picking B.
  const firstCondition = recommendation.conditions[0]?.project
  const winnerProject = firstCondition
    ? (firstCondition === 'A' ? projectA : projectB)
    : (scoreATotal >= scoreBTotal ? projectA : projectB)

  steps.push(`Visit ${winnerProject.name} first — book a site visit to verify construction progress and actual flat layout.`)

  if (context.budgetSensitive) {
    steps.push('Calculate your total all-in cost: base price + stamp duty (4.9%) + registration (1%) + GST + parking + interiors estimate.')
  }

  if (context.investorFocus) {
    steps.push('Before finalising, compare rentability in the micro-market and verify resale absorption from recent transactions.')
  }

  steps.push('Verify the RERA registration status and possession timeline directly on gujrera.gujarat.gov.in before paying any booking amount.')

  return steps.slice(0, 3)
}

export function buildDecisionCard(
  query: string,
  projectA: ProjectInput,
  projectB: ProjectInput
): DecisionCard {
  // Layer A: Detect buyer context
  const buyerContext = detectBuyerContext(query)

  // Layer B: Calculate scores
  const scoreA = calculateWeightedScore(projectA.scores, buyerContext.priority)
  const scoreB = calculateWeightedScore(projectB.scores, buyerContext.priority)

  // Layer B: Analyze differences
  const diffs = analyzeCategories(projectA.scores, projectB.scores)

  // Layer B: Build meaning statements
  const meaningLayer = buildMeaningLayer(diffs, projectA, projectB, buyerContext)

  // Layer B: Build tradeoff
  const tradeoff = buildTradeoff(diffs, buyerContext, projectA.name, projectB.name)

  // Layer B: Build recommendation
  const recommendation = buildRecommendation(
    buyerContext,
    scoreA.total,
    scoreB.total,
    diffs,
    projectA.name,
    projectB.name
  )

  // Layer B: Build risk alerts
  const riskAlerts = buildRiskAlerts(
    projectA.scores,
    projectB.scores,
    diffs,
    buyerContext,
    projectA.name,
    projectB.name,
    getMonthsUntilPossession(projectA.possessionDate),
    getMonthsUntilPossession(projectB.possessionDate)
  )

  // Layer B: Build next steps — pass scores so winner derivation survives empty conditions
  const nextSteps = buildNextSteps(recommendation, riskAlerts, buyerContext, projectA, projectB, scoreA.total, scoreB.total)

  return {
    buyerContext,
    projectA: { id: projectA.id, name: projectA.name, builder: projectA.builderName, score: scoreA.total },
    projectB: { id: projectB.id, name: projectB.name, builder: projectB.builderName, score: scoreB.total },
    categoryWinners: diffs.categoryWinners,
    meaningLayer,
    tradeoff,
    recommendation,
    riskAlerts,
    nextSteps,
    generatedAt: new Date().toISOString(),
  }
}
