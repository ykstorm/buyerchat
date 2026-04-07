export interface ProjectForScoring {
  totalTrustScore: number | null
  possessionDate: string | null
  possessionFlag: string | null
  minPrice: number | null
  maxPrice: number | null
  pricePerSqft: number | null
  decisionTag: string | null
  microMarket: string | null
  configurations: string | null
}

export interface BuyerContext {
  budgetMin: number
  budgetMax: number
  zonePref: string | null
  bhk: string | null
  urgency: string
}

export function calculateTrustScore(scores: {
  deliveryScore: number
  reraScore: number
  qualityScore: number
  financialScore: number
  responsivenessScore: number
}): { trustScore: number; decisionTag: string } {
  const total = (scores.deliveryScore || 0) + (scores.reraScore || 0) +
    (scores.qualityScore || 0) + (scores.financialScore || 0) +
    (scores.responsivenessScore || 0)
  const tag = total >= 80 ? 'Strong Buy' : total >= 65 ? 'Buy w/ Cond' :
    total >= 50 ? 'Wait' : 'Avoid'
  return { trustScore: total, decisionTag: tag }
}

export function getBudgetFit(project: ProjectForScoring, budget: { min: number; max: number }): number {
  const projectMin = (project.minPrice ?? 0) / 100000
  const projectMax = (project.maxPrice ?? 0) / 100000
  if (projectMax === 0) return 0
  if (projectMax < budget.min) return -20
  if (projectMin > budget.max) return -20
  if (projectMin >= budget.min && projectMax <= budget.max) return 20
  return 10
}

export function getPossessionModifier(project: ProjectForScoring): number {
  if (project.possessionFlag === 'green') return 10
  if (project.possessionFlag === 'red') return -20
  return 0
}

export function getZoneMatch(project: ProjectForScoring, buyer: BuyerContext): number {
  if (!buyer.zonePref || !project.microMarket) return 0
  return project.microMarket.toLowerCase().includes(buyer.zonePref.toLowerCase()) ? 15 : 0
}

export function getConfigMatch(project: ProjectForScoring, buyer: BuyerContext): number {
  if (!buyer.bhk || !project.configurations) return 0
  return project.configurations.toLowerCase().includes(buyer.bhk.toLowerCase()) ? 10 : 0
}

export function scoreProject(project: ProjectForScoring, buyerContext: BuyerContext) {
  const trust = project.totalTrustScore ?? 50
  const budgetFit = getBudgetFit(project, { min: buyerContext.budgetMin, max: buyerContext.budgetMax })
  const urgency = getPossessionModifier(project)
  const zoneMatch = getZoneMatch(project, buyerContext)
  const configMatch = getConfigMatch(project, buyerContext)
  return {
    finalScore: trust + budgetFit + urgency + zoneMatch + configMatch,
    breakdown: { trust, budgetFit, urgency, zoneMatch, configMatch }
  }
}

export function rankProjects(projects: ProjectForScoring[], buyerContext: BuyerContext) {
  return projects
    .map(p => ({ ...p, _score: scoreProject(p, buyerContext) }))
    .sort((a, b) => b._score.finalScore - a._score.finalScore)
}
