import { describe, it, expect } from 'vitest'
import { buildRiskAlerts } from './risk-engine'
import type { CategoryScores } from './score-engine'
import type { DifferenceAnalysis } from './difference-engine'
import type { BuyerContext } from './intent-engine'

const strongScores: CategoryScores = {
  location: 80, amenities: 70, builderTrust: 90, infrastructure: 60, demand: 75,
}

function makeDiffs(builderTrustWinner: 'A' | 'B' | 'tie'): DifferenceAnalysis {
  return {
    diffs: [],
    categoryWinners: {
      location: 'tie',
      amenities: 'tie',
      builderTrust: builderTrustWinner,
      infrastructure: 'tie',
      demand: 'tie',
    },
    aStrengths: [],
    bStrengths: [],
  }
}

function makeContext(overrides: Partial<BuyerContext> = {}): BuyerContext {
  return {
    priority: 'balanced',
    intentSignals: [],
    riskAverse: false,
    budgetSensitive: false,
    investorFocus: false,
    urgencyHigh: false,
    familyFocus: false,
    ...overrides,
  } as BuyerContext
}

describe('buildRiskAlerts — risk-averse A/B direction', () => {
  it('when B wins builder trust, alert names B as the stronger track record', () => {
    const alerts = buildRiskAlerts(
      strongScores, strongScores,
      makeDiffs('B'),
      makeContext({ riskAverse: true }),
      'Alpha', 'Bravo'
    )
    const safetyAlert = alerts.find(a => a.message.includes('prioritise safety'))
    expect(safetyAlert).toBeDefined()
    expect(safetyAlert!.message).toContain('Bravo has the stronger builder track record')
    expect(safetyAlert!.message).not.toMatch(/Alpha has the stronger/)
  })

  it('when A wins builder trust, alert names A as the stronger track record', () => {
    const alerts = buildRiskAlerts(
      strongScores, strongScores,
      makeDiffs('A'),
      makeContext({ riskAverse: true }),
      'Alpha', 'Bravo'
    )
    const safetyAlert = alerts.find(a => a.message.includes('prioritise safety'))
    expect(safetyAlert).toBeDefined()
    expect(safetyAlert!.message).toContain('Alpha has the stronger builder track record')
    expect(safetyAlert!.message).not.toMatch(/Bravo has the stronger/)
  })

  it('does not fire the safety alert when builderTrust is a tie', () => {
    const alerts = buildRiskAlerts(
      strongScores, strongScores,
      makeDiffs('tie'),
      makeContext({ riskAverse: true }),
      'Alpha', 'Bravo'
    )
    const safetyAlert = alerts.find(a => a.message.includes('prioritise safety'))
    expect(safetyAlert).toBeUndefined()
  })

  it('does not fire the safety alert when the buyer is not risk-averse', () => {
    const alerts = buildRiskAlerts(
      strongScores, strongScores,
      makeDiffs('A'),
      makeContext({ riskAverse: false }),
      'Alpha', 'Bravo'
    )
    const safetyAlert = alerts.find(a => a.message.includes('prioritise safety'))
    expect(safetyAlert).toBeUndefined()
  })
})

describe('buildRiskAlerts — builder trust threshold', () => {
  it('fires a high-level alert for project A when A trust < 50', () => {
    const weakA = { ...strongScores, builderTrust: 30 }
    const alerts = buildRiskAlerts(weakA, strongScores, makeDiffs('B'), makeContext(), 'Alpha', 'Bravo')
    expect(alerts.some(a => a.level === 'high' && a.message.includes('Alpha has a low builder trust'))).toBe(true)
  })

  it('fires a high-level alert for project B when B trust < 50', () => {
    const weakB = { ...strongScores, builderTrust: 30 }
    const alerts = buildRiskAlerts(strongScores, weakB, makeDiffs('A'), makeContext(), 'Alpha', 'Bravo')
    expect(alerts.some(a => a.level === 'high' && a.message.includes('Bravo has a low builder trust'))).toBe(true)
  })
})

describe('buildRiskAlerts — possession urgency', () => {
  it('fires for project A when A possession > 24 and urgencyHigh', () => {
    const alerts = buildRiskAlerts(
      strongScores, strongScores, makeDiffs('tie'),
      makeContext({ urgencyHigh: true }),
      'Alpha', 'Bravo', 36, 10
    )
    expect(alerts.some(a => a.message.includes('Alpha has a possession date more than 2 years away'))).toBe(true)
    expect(alerts.some(a => a.message.includes('Bravo has a possession date more than 2 years away'))).toBe(false)
  })
})
