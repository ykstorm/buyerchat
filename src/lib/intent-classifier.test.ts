import { describe, it, expect } from 'vitest'
import { classifyIntent } from './intent-classifier'

// These tests lock in the I15-final budget-regex fix. Before the fix, "85L"
// failed to match the budget alternation (the literal `l` / `L` token was
// absent) and "4bhk under 85L in shela" incorrectly routed to `location_query`
// via the `shela` keyword. Persona priority (investor > premium > value >
// family) is intentionally NOT swapped — `"4BHK ... under ..."` must still
// classify as `premium`, per the canonical "4BHK penthouse under 2Cr in Shela"
// case documented in system-prompt.ts.
describe('classifyIntent — intent routing', () => {
  it('"4bhk under 85L in shela" routes to budget_query (not location_query)', () => {
    const result = classifyIntent('4bhk under 85L in shela')
    expect(result.intent).toBe('budget_query')
    // 4bhk token wins persona ahead of value; do NOT regress this.
    expect(result.persona).toBe('premium')
  })

  it('"under 80L in shela" routes to budget_query with value persona', () => {
    const result = classifyIntent('under 80L in shela')
    expect(result.intent).toBe('budget_query')
    expect(result.persona).toBe('value')
  })

  it('"budget 1.5cr" routes to budget_query', () => {
    const result = classifyIntent('budget 1.5cr')
    expect(result.intent).toBe('budget_query')
  })

  it('"below 85 lakh" routes to budget_query', () => {
    const result = classifyIntent('below 85 lakh')
    expect(result.intent).toBe('budget_query')
  })
})

describe('classifyIntent — persona priority', () => {
  it('"4BHK premium villa" → premium persona', () => {
    const result = classifyIntent('4BHK premium villa')
    expect(result.persona).toBe('premium')
  })

  it('"luxury 3BHK" → premium persona', () => {
    const result = classifyIntent('luxury 3BHK')
    expect(result.persona).toBe('premium')
  })

  it('"3bhk with ROI" → investor persona', () => {
    const result = classifyIntent('3bhk with ROI')
    expect(result.persona).toBe('investor')
  })

  it('"best for family" → family persona', () => {
    const result = classifyIntent('best for family')
    expect(result.persona).toBe('family')
  })
})
