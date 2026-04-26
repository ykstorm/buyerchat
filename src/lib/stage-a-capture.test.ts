import { describe, it, expect } from 'vitest'
import { isValidIndianMobile, PHONE_REGEX, TEST_PATTERNS } from './stage-a-capture'

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
