import { describe, it, expect } from 'vitest'
import {
  reducer,
  INITIAL_STATE,
  totalTrustScore,
  displayGrade,
  validateStep,
} from './wizard-reducer'

const filledIdentity = {
  builderName: 'Goyal & Co. / HN Safal',
  brandName: 'Goyal & Co.',
  partnerStatus: true,
  commissionRatePct: 1.5,
}

describe('wizard-reducer — navigation', () => {
  it('NEXT_STEP advances when current step is valid', () => {
    const s1 = { ...INITIAL_STATE, identity: filledIdentity }
    const s2 = reducer(s1, { type: 'NEXT_STEP' })
    expect(s2.step).toBe(2)
    expect(s2.error).toBeUndefined()
  })

  it('NEXT_STEP blocks when builderName is empty and populates error', () => {
    const next = reducer(INITIAL_STATE, { type: 'NEXT_STEP' })
    expect(next.step).toBe(1)
    expect(next.error).toMatch(/builder name/i)
  })

  it('NEXT_STEP does not advance past step 4', () => {
    const at4 = { ...INITIAL_STATE, step: 4 as const, identity: filledIdentity }
    const next = reducer(at4, { type: 'NEXT_STEP' })
    expect(next.step).toBe(4)
  })

  it('PREV_STEP regresses without validating', () => {
    const at3 = { ...INITIAL_STATE, step: 3 as const }
    const next = reducer(at3, { type: 'PREV_STEP' })
    expect(next.step).toBe(2)
  })

  it('PREV_STEP does not regress past step 1', () => {
    const next = reducer(INITIAL_STATE, { type: 'PREV_STEP' })
    expect(next.step).toBe(1)
  })
})

describe('wizard-reducer — score handling', () => {
  it('SET_SCORE clamps over-max values to the field max', () => {
    const next = reducer(INITIAL_STATE, {
      type: 'SET_SCORE',
      field: 'deliveryScore',
      value: 999,
    })
    expect(next.scores.deliveryScore).toBe(30)
  })

  it('SET_SCORE clamps negative values to 0', () => {
    const next = reducer(INITIAL_STATE, {
      type: 'SET_SCORE',
      field: 'reraScore',
      value: -5,
    })
    expect(next.scores.reraScore).toBe(0)
  })

  it('totalTrustScore sums all 5 fields', () => {
    expect(
      totalTrustScore({
        deliveryScore: 25,
        reraScore: 15,
        qualityScore: 18,
        financialScore: 12,
        responsivenessScore: 10,
      }),
    ).toBe(80)
  })

  it('displayGrade returns A/B/C/D/F per canonical thresholds', () => {
    expect(displayGrade(95)).toBe('A')
    expect(displayGrade(85)).toBe('A')
    expect(displayGrade(72)).toBe('B')
    expect(displayGrade(60)).toBe('C')
    expect(displayGrade(45)).toBe('D')
    expect(displayGrade(20)).toBe('F')
  })
})

describe('wizard-reducer — validation', () => {
  it('validateStep step 1 rejects empty builderName', () => {
    expect(validateStep(INITIAL_STATE, 1)).toMatch(/builder name/i)
  })

  it('validateStep step 3 rejects malformed contactEmail', () => {
    const s = {
      ...INITIAL_STATE,
      step: 3 as const,
      contact: { contactEmail: 'not-an-email', contactPhone: '' },
    }
    expect(validateStep(s, 3)).toMatch(/email/i)
  })

  it('validateStep step 3 accepts empty contact fields', () => {
    expect(validateStep(INITIAL_STATE, 3)).toBeNull()
  })
})

describe('wizard-reducer — submit lifecycle', () => {
  it('START_SUBMIT → SUBMIT_OK records createdId and status submitted', () => {
    const submitting = reducer(INITIAL_STATE, { type: 'START_SUBMIT' })
    expect(submitting.status).toBe('submitting')
    const done = reducer(submitting, { type: 'SUBMIT_OK', id: 'b1' })
    expect(done.status).toBe('submitted')
    expect(done.createdId).toBe('b1')
  })

  it('SUBMIT_FAIL surfaces the error message and status error', () => {
    const submitting = reducer(INITIAL_STATE, { type: 'START_SUBMIT' })
    const failed = reducer(submitting, { type: 'SUBMIT_FAIL', error: 'duplicate' })
    expect(failed.status).toBe('error')
    expect(failed.error).toBe('duplicate')
  })

  it('RESET returns the initial state', () => {
    const dirty = reducer(
      { ...INITIAL_STATE, step: 3 as const, identity: filledIdentity },
      { type: 'RESET' },
    )
    expect(dirty).toEqual(INITIAL_STATE)
  })
})
