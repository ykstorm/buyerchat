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

// Sprint 7-fix (2026-04-30): pure render-gate predicate for StageACapture.
// Extracted from chat-client.tsx to make the gate testable + auditable in
// one place. Sprint 7.5 confirmed: Model A is correct — signed-in users
// already have name/email on User row; soft capture for them creates the
// "save = my account" comms model mismatch (~55% null-on-engaged rate per
// user diagnostic). Suppress for signed-in, render for anonymous.
export interface StageAGateInput {
  userId: string | null
  sessionId: string | null
  captureStageLoaded: boolean
  captureSubmitted: boolean
  captureStage: string | null
  artifactCount: number
}

// User-defined type guard: when this returns true, callers know
// `input.sessionId` is a non-null string. Sprint 7-fix-A (2026-05-02)
// fixes Vercel CI TS2322 — the prior `boolean` return type didn't
// narrow sessionId inside the JSX block, so <StageACapture sessionId=...>
// rejected the `string | null` against its `string` prop.
export function shouldRenderStageACapture(
  input: StageAGateInput
): input is StageAGateInput & { sessionId: string } {
  if (input.userId) return false
  if (!input.sessionId) return false
  if (!input.captureStageLoaded) return false
  if (input.captureSubmitted) return false
  if (
    input.captureStage === 'soft' ||
    input.captureStage === 'verified' ||
    input.captureStage === 'skipped'
  ) return false
  if (input.artifactCount < 1) return false
  return true
}
