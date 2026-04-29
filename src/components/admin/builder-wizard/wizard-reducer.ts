/**
 * Builder onboarding wizard — pure reducer.
 *
 * State machine for a 4-step builder create flow. NO side effects, NO fetch
 * calls, NO React. This module is unit-tested in isolation; the wizard
 * component dispatches into it and renders the result.
 *
 * Score maxes mirror the canonical schema thresholds:
 *   deliveryScore 0-30, reraScore 0-20, qualityScore 0-20,
 *   financialScore 0-15, responsivenessScore 0-15.  Sum 0-100.
 *
 * Grade thresholds mirror src/app/admin/builders/[id]/page.tsx:35
 *   A >= 85, B >= 70, C >= 55, D >= 40, else F.
 *
 * The server route uses src/lib/grade.computeGrade() which returns A|B|C|D
 * only. The wizard's UI grade is a UX convenience — DB value is whatever
 * the API stamps.
 */

export type Step = 1 | 2 | 3 | 4
export type Status = 'editing' | 'submitting' | 'submitted' | 'error'
export type DisplayGrade = 'A' | 'B' | 'C' | 'D' | 'F'

export interface IdentityFields {
  builderName: string
  brandName: string
  partnerStatus: boolean
  commissionRatePct: number
}

export interface ScoreFields {
  deliveryScore: number
  reraScore: number
  qualityScore: number
  financialScore: number
  responsivenessScore: number
}

export interface ContactFields {
  contactEmail: string
  contactPhone: string
}

export const SCORE_MAX: Record<keyof ScoreFields, number> = {
  deliveryScore: 30,
  reraScore: 20,
  qualityScore: 20,
  financialScore: 15,
  responsivenessScore: 15,
}

export interface WizardState {
  step: Step
  identity: IdentityFields
  scores: ScoreFields
  contact: ContactFields
  status: Status
  error?: string
  createdId?: string
}

export const INITIAL_STATE: WizardState = {
  step: 1,
  identity: {
    builderName: '',
    brandName: '',
    partnerStatus: false,
    commissionRatePct: 1.5,
  },
  scores: {
    deliveryScore: 0,
    reraScore: 0,
    qualityScore: 0,
    financialScore: 0,
    responsivenessScore: 0,
  },
  contact: {
    contactEmail: '',
    contactPhone: '',
  },
  status: 'editing',
}

export type Action =
  | { type: 'SET_IDENTITY'; field: keyof IdentityFields; value: IdentityFields[keyof IdentityFields] }
  | { type: 'SET_SCORE'; field: keyof ScoreFields; value: number }
  | { type: 'SET_CONTACT'; field: keyof ContactFields; value: string }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'START_SUBMIT' }
  | { type: 'SUBMIT_OK'; id: string }
  | { type: 'SUBMIT_FAIL'; error: string }
  | { type: 'RESET' }

export function totalTrustScore(s: ScoreFields): number {
  return (
    s.deliveryScore +
    s.reraScore +
    s.qualityScore +
    s.financialScore +
    s.responsivenessScore
  )
}

// Mirrors src/app/admin/builders/[id]/page.tsx:35 — keep the F floor for
// the UX pill so operators see harsh feedback on bad inputs. The server
// stores whatever computeGrade() returns (A|B|C|D).
export function displayGrade(total: number): DisplayGrade {
  if (total >= 85) return 'A'
  if (total >= 70) return 'B'
  if (total >= 55) return 'C'
  if (total >= 40) return 'D'
  return 'F'
}

function clampScore(field: keyof ScoreFields, raw: number): number {
  if (!Number.isFinite(raw)) return 0
  const max = SCORE_MAX[field]
  return Math.max(0, Math.min(max, Math.round(raw)))
}

export function validateStep(state: WizardState, step: Step): string | null {
  if (step === 1) {
    if (!state.identity.builderName.trim()) return 'Builder name is required.'
    if (!state.identity.brandName.trim()) return 'Brand name is required.'
    if (
      !Number.isFinite(state.identity.commissionRatePct) ||
      state.identity.commissionRatePct < 0 ||
      state.identity.commissionRatePct > 100
    )
      return 'Commission rate must be between 0 and 100.'
    return null
  }
  if (step === 2) {
    for (const key of Object.keys(SCORE_MAX) as (keyof ScoreFields)[]) {
      const v = state.scores[key]
      if (!Number.isFinite(v) || v < 0 || v > SCORE_MAX[key]) {
        return `${key} must be between 0 and ${SCORE_MAX[key]}.`
      }
    }
    return null
  }
  if (step === 3) {
    const { contactEmail, contactPhone } = state.contact
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      return 'Contact email is not a valid address.'
    }
    if (contactPhone && contactPhone.trim().length < 7) {
      return 'Contact phone is too short.'
    }
    return null
  }
  return null
}

export function reducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case 'SET_IDENTITY': {
      const next: IdentityFields = { ...state.identity, [action.field]: action.value }
      return { ...state, identity: next, error: undefined, status: 'editing' }
    }
    case 'SET_SCORE': {
      const clamped = clampScore(action.field, action.value)
      return {
        ...state,
        scores: { ...state.scores, [action.field]: clamped },
        error: undefined,
        status: 'editing',
      }
    }
    case 'SET_CONTACT': {
      return {
        ...state,
        contact: { ...state.contact, [action.field]: action.value },
        error: undefined,
        status: 'editing',
      }
    }
    case 'NEXT_STEP': {
      if (state.step >= 4) return state
      const err = validateStep(state, state.step)
      if (err) return { ...state, error: err }
      return { ...state, step: (state.step + 1) as Step, error: undefined }
    }
    case 'PREV_STEP': {
      if (state.step <= 1) return state
      return { ...state, step: (state.step - 1) as Step, error: undefined }
    }
    case 'START_SUBMIT':
      return { ...state, status: 'submitting', error: undefined }
    case 'SUBMIT_OK':
      return { ...state, status: 'submitted', createdId: action.id, error: undefined }
    case 'SUBMIT_FAIL':
      return { ...state, status: 'error', error: action.error }
    case 'RESET':
      return INITIAL_STATE
    default:
      return state
  }
}
