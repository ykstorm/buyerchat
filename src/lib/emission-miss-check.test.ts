import { describe, expect, it } from 'vitest'
import { detectEmissionMisses } from './emission-miss-check'

describe('detectEmissionMisses (Sprint 9.5)', () => {
  it('comparison query WITH comparison CARD → no miss', () => {
    const misses = detectEmissionMisses(
      'Riviera Bliss aur Shaligram Pride compare karo',
      ['comparison'],
    )
    expect(misses).toEqual([])
  })

  it('comparison query WITHOUT CARD → miss detected', () => {
    const misses = detectEmissionMisses(
      'South Bopal vs Shela — kaunsa better hai?',
      [],
    )
    expect(misses).toHaveLength(1)
    expect(misses[0]).toEqual({
      type: 'comparison',
      pattern_matched: 'comparison',
    })
  })

  it('cost query WITH cost_breakdown CARD → no miss', () => {
    const misses = detectEmissionMisses(
      'Riviera Bliss ka all-in cost kitna padega?',
      ['cost_breakdown'],
    )
    expect(misses).toEqual([])
  })

  it('cost query WITHOUT CARD → miss detected', () => {
    const misses = detectEmissionMisses(
      'Stamp aur registration milake total kitna lagega?',
      [],
    )
    expect(misses).toHaveLength(1)
    expect(misses[0].type).toBe('cost_breakdown')
  })

  it('generic greeting → no expected types, no miss', () => {
    const misses = detectEmissionMisses('Namaste, main 3BHK dhundh raha hoon', [])
    expect(misses).toEqual([])
  })

  it('multiple expected types, partial emission → only missing types returned', () => {
    // Query implies BOTH comparison + visit_booking; only comparison emitted
    const misses = detectEmissionMisses(
      'Compare these two and let me book a visit',
      ['comparison'],
    )
    expect(misses).toHaveLength(1)
    expect(misses[0].type).toBe('visit_booking')
  })
})
