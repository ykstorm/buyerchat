import { describe, it, expect } from 'vitest'
import {
  isValidIndianMobile,
  PHONE_REGEX,
  TEST_PATTERNS,
  shouldRenderStageACapture,
  type StageAGateInput,
} from './stage-a-capture'

describe('isValidIndianMobile', () => {
  it('accepts a normal 10-digit mobile starting with 6/7/8/9', () => {
    expect(isValidIndianMobile('9876543210')).toBe(true)
    expect(isValidIndianMobile('8123456780')).toBe(true)
    expect(isValidIndianMobile('7012345689')).toBe(true)
    expect(isValidIndianMobile('6543210987')).toBe(true)
  })

  it('rejects numbers that do not start with 6-9', () => {
    expect(isValidIndianMobile('5876543210')).toBe(false)
    expect(isValidIndianMobile('4876543210')).toBe(false)
    expect(isValidIndianMobile('1234567890')).toBe(false)
  })

  it('rejects wrong-length input', () => {
    expect(isValidIndianMobile('987654321')).toBe(false)   // 9 digits
    expect(isValidIndianMobile('98765432101')).toBe(false) // 11 digits
    expect(isValidIndianMobile('')).toBe(false)
  })

  it('rejects non-digit input', () => {
    expect(isValidIndianMobile('98765-43210')).toBe(false)
    expect(isValidIndianMobile('+919876543210')).toBe(false)
    expect(isValidIndianMobile('98 7654 3210')).toBe(false)
  })

  it('rejects known test/dummy patterns', () => {
    for (const pattern of TEST_PATTERNS) {
      expect(isValidIndianMobile(pattern)).toBe(false)
    }
  })
})

describe('PHONE_REGEX shape', () => {
  it('matches exactly 10 digits, first digit 6-9', () => {
    expect(PHONE_REGEX.source).toBe('^[6-9]\\d{9}$')
  })
})

describe('shouldRenderStageACapture (Sprint 7-fix render gate)', () => {
  // Baseline: every gate condition met for a fresh anonymous buyer who has
  // seen 1+ artifact and never engaged the card. Helper builds variants.
  const baseAnonymous: StageAGateInput = {
    userId: null,
    sessionId: 'cmtest1234',
    captureStageLoaded: true,
    captureSubmitted: false,
    captureStage: null,
    artifactCount: 1,
  }

  it('renders for anonymous buyer with all conditions met (regression guard)', () => {
    expect(shouldRenderStageACapture(baseAnonymous)).toBe(true)
  })

  it('Model A: suppresses for signed-in buyer with otherwise identical state', () => {
    expect(shouldRenderStageACapture({ ...baseAnonymous, userId: 'user-abc' })).toBe(false)
  })

  it('suppresses while sessionId is null', () => {
    expect(shouldRenderStageACapture({ ...baseAnonymous, sessionId: null })).toBe(false)
  })

  it('suppresses while captureStageLoaded is false (flash-prevention)', () => {
    expect(shouldRenderStageACapture({ ...baseAnonymous, captureStageLoaded: false })).toBe(false)
  })

  it('suppresses after captureSubmitted', () => {
    expect(shouldRenderStageACapture({ ...baseAnonymous, captureSubmitted: true })).toBe(false)
  })

  it('suppresses for each terminal captureStage value', () => {
    for (const stage of ['soft', 'verified', 'skipped'] as const) {
      expect(shouldRenderStageACapture({ ...baseAnonymous, captureStage: stage })).toBe(false)
    }
  })

  it('suppresses before any artifact has rendered', () => {
    expect(shouldRenderStageACapture({ ...baseAnonymous, artifactCount: 0 })).toBe(false)
  })

  it('signed-in suppression beats every other condition (Model A precedence)', () => {
    // Even if all other render conditions look "ready," signed-in always wins.
    expect(shouldRenderStageACapture({
      userId: 'user-abc',
      sessionId: 'cmtest1234',
      captureStageLoaded: true,
      captureSubmitted: false,
      captureStage: null,
      artifactCount: 5,
    })).toBe(false)
  })
})
