// Intent + persona classification for /api/chat.
//
// Historically this module returned only a `QueryIntent`. The system prompt
// branches on buyer persona (family / investor / value / premium) and
// post-stream checks want to reason about persona-specific rules (e.g. don't
// flag out-of-area safety talk as stale context when the buyer is a family
// buyer asking about schools). Sprint I11 widened the return shape so both
// signals are computed in one pass.
//
// The classifier is intentionally cheap — regex tests in priority order, no
// model call. Treat it as a routing hint, not a truth oracle.

export type QueryIntent =
  | 'budget_query'
  | 'location_query'
  | 'builder_query'
  | 'comparison_query'
  | 'visit_query'
  | 'legal_query'
  | 'investment_query'
  | 'general_query'

export type Persona = 'family' | 'investor' | 'value' | 'premium' | 'unknown'

export interface ClassifiedQuery {
  intent: QueryIntent
  persona: Persona
}

export function classifyIntent(query: string): ClassifiedQuery {
  const q = query.toLowerCase()

  // --- Intent ----------------------------------------------------------
  // NOTE: budget must be tested BEFORE location_query so multi-signal queries
  // like "under 85L in shela" route to budget_query (not location_query). The
  // shorthand-number pattern catches "85L", "1.5cr", "85 lakh", "1 crore" which
  // the original alternation missed (the literal `l` was absent from the word
  // list). See src/lib/intent-classifier.test.ts.
  let intent: QueryIntent = 'general_query'
  if (
    /budget|price|cost|afford|crore|lakh|lac|₹|rs\.|cheap|expensive/.test(q) ||
    /(?:under|below|within|above|over)\s+(?:rs\.?|inr|₹)?\s*\d+(?:\.\d+)?\s*(?:l|lakh|lac|cr|crore)?\b/.test(q) ||
    /\b\d+(?:\.\d+)?\s*(?:l|lakh|lac|cr|crore)\b/.test(q)
  )
    intent = 'budget_query'
  else if (/shela|south bopal|location|area|nearby|distance|school|hospital/.test(q))
    intent = 'location_query'
  else if (/builder|developer|trust|reliable|reputation|track record/.test(q))
    intent = 'builder_query'
  else if (/compare|vs|versus|difference|better|which one/.test(q))
    intent = 'comparison_query'
  else if (/visit|site|appointment|book|schedule|see|view/.test(q))
    intent = 'visit_query'
  else if (/rera|stamp duty|registration|legal|document|agreement/.test(q))
    intent = 'legal_query'
  else if (/invest|return|appreciation|rental|roi|growth/.test(q))
    intent = 'investment_query'

  // --- Persona ---------------------------------------------------------
  // Priority: investor > premium > value > family > unknown.
  // Rationale: explicit investor / premium signals are rarer and higher
  // value to detect — we'd rather tag an investor-asking-about-schools as
  // investor than lose the signal by matching family first.
  const personaMatchers: Array<[Persona, RegExp]> = [
    ['investor', /\b(roi|rental|yield|appreciation|resale|flip|returns?)\b/],
    ['premium', /\b(luxury|luxurious|high[- ]end|premium|4\s*bhk|4bhk|duplex|penthouse|top floor)\b/],
    ['value', /\b(budget|cheap|affordable|best deal|value for money|sasta)\b|under\s*\d|below\s*\d/],
    ['family', /\b(school|schools|hospital|hospitals|children|kids|family|safety|society|club|amenit(?:y|ies))\b/],
  ]
  let persona: Persona = 'unknown'
  for (const [candidate, re] of personaMatchers) {
    if (re.test(q)) { persona = candidate; break }
  }

  return { intent, persona }
}
