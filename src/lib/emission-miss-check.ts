// Sprint 9.5 (2026-05-05) — pure helper to detect emission-drift
// misses. Extracted from route.ts onFinish for testability. Returns
// the array of expected types that buyer query implied but response
// failed to emit. Audit-only — caller decides whether to surface to
// Sentry.

export interface EmissionMissResult {
  type: string
  pattern_matched: string
}

const EXPECTED_TYPES: Array<{
  type: string
  pattern: RegExp
  label: string
}> = [
  {
    type: 'comparison',
    pattern: /\b(compare|comparison|vs |dono mein|ke beech|kaunsa.{0,20}better)\b/i,
    label: 'comparison',
  },
  {
    type: 'cost_breakdown',
    pattern: /\b(cost|total|all.in|emi|monthly|gst|stamp|registration|kitna padega|kitna lagega|breakdown chahiye)\b/i,
    label: 'cost_breakdown',
  },
  {
    type: 'visit_booking',
    pattern: /\b(visit|site dekh|booking|book karo|visit karna)\b/i,
    label: 'visit_booking',
  },
]

export function detectEmissionMisses(
  query: string,
  emittedCardTypes: string[],
): EmissionMissResult[] {
  const lower = query.toLowerCase()
  const misses: EmissionMissResult[] = []
  for (const { type, pattern, label } of EXPECTED_TYPES) {
    if (pattern.test(lower)) {
      if (!emittedCardTypes.includes(type)) {
        misses.push({
          type,
          pattern_matched: label,
        })
      }
    }
  }
  return misses
}
