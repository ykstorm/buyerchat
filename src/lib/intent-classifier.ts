export type QueryIntent =
  | 'budget_query'
  | 'location_query'
  | 'builder_query'
  | 'comparison_query'
  | 'visit_query'
  | 'legal_query'
  | 'investment_query'
  | 'general_query'

export function classifyIntent(query: string): QueryIntent {
  const q = query.toLowerCase()

  if (/budget|price|cost|afford|crore|lakh|₹|rs\.|cheap|expensive/.test(q))
    return 'budget_query'
  if (/shela|south bopal|location|area|nearby|distance|school|hospital/.test(q))
    return 'location_query'
  if (/builder|developer|trust|reliable|reputation|track record/.test(q))
    return 'builder_query'
  if (/compare|vs|versus|difference|better|which one/.test(q))
    return 'comparison_query'
  if (/visit|site|appointment|book|schedule|see|view/.test(q))
    return 'visit_query'
  if (/rera|stamp duty|registration|legal|document|agreement/.test(q))
    return 'legal_query'
  if (/invest|return|appreciation|rental|roi|growth/.test(q))
    return 'investment_query'

  return 'general_query'
}