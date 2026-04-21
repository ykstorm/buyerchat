// intent-engine.ts
// Detects buyer persona and query intent from natural language
// Extends existing intent-classifier without replacing it

import type { BuyerPriority } from './score-engine'

export interface BuyerContext {
  priority: BuyerPriority
  intentSignals: string[]
  budgetSensitive: boolean
  familyFocus: boolean
  investorFocus: boolean
  riskAverse: boolean
  urgencyHigh: boolean
  inferredOnly: boolean  // true if context was inferred, not stated
}

const FAMILY_SIGNALS = ['family', 'school', 'kids', 'children', 'wife', 'parents', 'self use', 'self-use', 'end use', 'end-use', 'live in']
const INVESTOR_SIGNALS = ['invest', 'return', 'appreciation', 'rental income', 'resale', 'yield', 'roi', 'nri', 'portfolio']
const LIFESTYLE_SIGNALS = ['amenities', 'clubhouse', 'pool', 'gym', 'lifestyle', 'experience', 'luxury', 'premium']
const RISK_SIGNALS = ['safe', 'safety', 'reliable', 'trusted', 'delay', 'risk', 'worry', 'regret', 'rera compliant']
const BUDGET_SIGNALS = ['budget', 'under', 'within', 'lakh', 'cr', 'affordable', 'cheaper', 'economical', 'compromise']
const URGENCY_SIGNALS = ['urgent', 'soon', 'quickly', 'immediate', 'possession', 'ready to move', 'rtm']

export function detectBuyerContext(query: string): BuyerContext {
  const q = query.toLowerCase()

  const familyFocus = FAMILY_SIGNALS.some(s => q.includes(s))
  const investorFocus = INVESTOR_SIGNALS.some(s => q.includes(s))
  const lifestyleFocus = LIFESTYLE_SIGNALS.some(s => q.includes(s))
  const riskAverse = RISK_SIGNALS.some(s => q.includes(s))
  const budgetSensitive = BUDGET_SIGNALS.some(s => q.includes(s))
  const urgencyHigh = URGENCY_SIGNALS.some(s => q.includes(s))

  const intentSignals: string[] = []
  if (familyFocus) intentSignals.push('family_convenience')
  if (investorFocus) intentSignals.push('investment_return')
  if (lifestyleFocus) intentSignals.push('lifestyle_amenities')
  if (riskAverse) intentSignals.push('risk_averse')
  if (budgetSensitive) intentSignals.push('budget_sensitive')
  if (urgencyHigh) intentSignals.push('possession_urgency')

  let priority: BuyerPriority = 'balanced'
  if (riskAverse) priority = 'risk_averse'
  else if (familyFocus && !investorFocus) priority = 'family'
  else if (investorFocus) priority = 'investor'
  else if (lifestyleFocus) priority = 'lifestyle'

  const inferredOnly = intentSignals.length === 0

  return { priority, intentSignals, budgetSensitive, familyFocus, investorFocus, riskAverse, urgencyHigh, inferredOnly }
}
