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

// ---------------------------------------------------------------------------
// Stage B hard-capture intent detection (Agent G — feature-flagged dark).
//
// Runs ONLY when STAGE_B_ENABLED='true' in src/app/api/chat/route.ts. Returns
// null otherwise, and the function signature is independent of QueryIntent so
// callers can compose. visit_booking_attempt is detected for parity but does
// NOT trigger Stage B in /api/chat (visits already use VisitBooking flow).

export type HardCaptureIntent =
  | 'cost_breakdown'
  | 'comparison_request'
  | 'builder_deep_dive'
  | 'visit_booking_attempt'
  | 'full_project_details'

export function detectHardCaptureIntent(query: string): HardCaptureIntent | null {
  const q = query.toLowerCase()
  if (/\b(total|all[- ]?in|kitna padega|exact (?:cost|price)|breakdown|registration.*charges|stamp duty.*included|final price)\b/.test(q))
    return 'cost_breakdown'
  if (/\b(compare|vs|versus|difference between|kaunsa better|which is better)\b/.test(q))
    return 'comparison_request'
  if (/\b(delivery record|track record|past projects|builder.*history|builder.*reputation|kitne projects|reliable hai)\b/.test(q))
    return 'builder_deep_dive'
  if (/\b(visit|site dekh|jaana hai|book.*visit|appointment|kal.*aaun|saturday|sunday).*(visit|book|appointment)?/.test(q))
    return 'visit_booking_attempt'
  if (/\b(full details|complete info|sab kuch batao|everything about|all info)\b/.test(q))
    return 'full_project_details'
  return null
}

export const STAGE_B_TRIGGER_SCRIPTS: Record<HardCaptureIntent, string> = {
  cost_breakdown:
    'Exact all-in breakdown ke liye number share kar dein — calculation unlock ho jaayegi.',
  comparison_request:
    'Detailed comparison ke liye number share kar dein — side-by-side analysis bhej deta hoon.',
  builder_deep_dive:
    'Builder ke past projects + delivery record share karne ke liye number chahiye — privacy ke liye.',
  visit_booking_attempt:
    'Visit confirm karne ke liye number chahiye — builder ko coordinate karne ke liye.',
  full_project_details:
    'Full project pack ke liye number share kar dein — brochure + pricing + visit slot bhej deta hoon.',
}

