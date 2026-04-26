// Stage A soft capture validation (Agent 4).
// Shared between the StageACapture client component and the
// /api/chat/capture POST route so a single regex powers both layers.

export const PHONE_REGEX = /^[6-9]\d{9}$/

export const TEST_PATTERNS: ReadonlySet<string> = new Set([
  '1234567890',
  '0000000000',
  '1111111111',
  '9999999999',
  '6666666666',
  '7777777777',
  '8888888888',
])

export function isValidIndianMobile(phone: string): boolean {
  if (!PHONE_REGEX.test(phone)) return false
  if (TEST_PATTERNS.has(phone)) return false
  return true
}
