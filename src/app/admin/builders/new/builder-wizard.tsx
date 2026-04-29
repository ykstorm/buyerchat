'use client'

import { useReducer, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  reducer,
  INITIAL_STATE,
  totalTrustScore,
  displayGrade,
  SCORE_MAX,
  type ScoreFields,
  type Step,
} from '@/components/admin/builder-wizard/wizard-reducer'

interface Props {
  adminEmail: string
}

const STEP_LABELS: Record<Step, string> = {
  1: 'Identity',
  2: 'Trust Scores',
  3: 'Contact',
  4: 'Review',
}

const SCORE_LABELS: Record<keyof ScoreFields, string> = {
  deliveryScore: 'Delivery',
  reraScore: 'RERA Compliance',
  qualityScore: 'Construction Quality',
  financialScore: 'Financial Strength',
  responsivenessScore: 'Responsiveness',
}

function gradeColor(g: ReturnType<typeof displayGrade>): string {
  if (g === 'A') return '#0F6E56'
  if (g === 'B') return '#185FA5'
  if (g === 'C') return '#BA7517'
  if (g === 'D') return '#C2410C'
  return '#A32D2D'
}

export default function BuilderWizard({ adminEmail }: Props) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()

  const submit = async () => {
    dispatch({ type: 'START_SUBMIT' })
    setServerError(null)
    try {
      const payload = {
        builderName: state.identity.builderName.trim(),
        brandName: state.identity.brandName.trim(),
        partnerStatus: state.identity.partnerStatus,
        commissionRatePct: state.identity.commissionRatePct,
        deliveryScore: state.scores.deliveryScore,
        reraScore: state.scores.reraScore,
        qualityScore: state.scores.qualityScore,
        financialScore: state.scores.financialScore,
        responsivenessScore: state.scores.responsivenessScore,
        contactEmail: state.contact.contactEmail.trim() || undefined,
        contactPhone: state.contact.contactPhone.trim() || undefined,
      }
      const res = await fetch('/api/admin/builders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const reason = json?.error
          ? typeof json.error === 'string'
            ? json.error
            : 'Validation failed'
          : `HTTP ${res.status}`
        dispatch({ type: 'SUBMIT_FAIL', error: reason })
        setServerError(reason)
        return
      }
      dispatch({ type: 'SUBMIT_OK', id: json.id ?? '' })
      router.push('/admin/builders')
    } catch (e) {
      const msg = (e as Error).message
      dispatch({ type: 'SUBMIT_FAIL', error: msg })
      setServerError(msg)
    }
  }

  const total = totalTrustScore(state.scores)
  const grade = displayGrade(total)
  const gColor = gradeColor(grade)

  return (
    <div className="min-h-screen bg-[#0A0F1E] p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-baseline justify-between mb-4">
          <Link href="/admin/builders" className="text-[12px] text-[#9CA3AF] hover:text-white">
            ← Back to Builders
          </Link>
          <span className="text-[11px] text-[#6B7280]">Signed in as {adminEmail}</span>
        </div>

        {/* Stepper */}
        <ol className="flex items-center gap-2 mb-6 text-[11px] uppercase tracking-wider">
          {([1, 2, 3, 4] as Step[]).map((n) => {
            const active = state.step === n
            const done = state.step > n
            return (
              <li
                key={n}
                className="flex-1 px-3 py-2 rounded-lg border"
                style={{
                  borderColor: active
                    ? '#185FA5'
                    : done
                      ? 'rgba(15, 110, 86, 0.4)'
                      : 'rgba(255,255,255,0.08)',
                  background: active
                    ? 'rgba(24, 95, 165, 0.18)'
                    : done
                      ? 'rgba(15, 110, 86, 0.08)'
                      : 'rgba(255,255,255,0.02)',
                  color: active || done ? 'white' : '#6B7280',
                }}
              >
                {n}. {STEP_LABELS[n]}
              </li>
            )
          })}
        </ol>

        <div
          className="rounded-xl p-6 space-y-4"
          style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {state.step === 1 && (
            <>
              <h2 className="text-[15px] font-semibold text-white">Step 1 — Identity</h2>
              <p className="text-[11px] text-[#9CA3AF]">
                Builder name is the unique key. Brand name is what buyers see.
              </p>
              <Field
                label="Builder Name (unique)"
                value={state.identity.builderName}
                onChange={(v) =>
                  dispatch({ type: 'SET_IDENTITY', field: 'builderName', value: v })
                }
                placeholder="e.g. Goyal & Co. / HN Safal"
              />
              <Field
                label="Brand Name"
                value={state.identity.brandName}
                onChange={(v) =>
                  dispatch({ type: 'SET_IDENTITY', field: 'brandName', value: v })
                }
                placeholder="e.g. Goyal & Co."
              />
              <div className="flex items-center gap-3">
                <label className="text-[12px] text-[#9CA3AF] flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.identity.partnerStatus}
                    onChange={(e) =>
                      dispatch({
                        type: 'SET_IDENTITY',
                        field: 'partnerStatus',
                        value: e.target.checked,
                      })
                    }
                    className="accent-[#185FA5]"
                  />
                  Partner status
                </label>
                <Field
                  label="Commission rate (%)"
                  type="number"
                  value={state.identity.commissionRatePct.toString()}
                  onChange={(v) =>
                    dispatch({
                      type: 'SET_IDENTITY',
                      field: 'commissionRatePct',
                      value: Number(v),
                    })
                  }
                />
              </div>
            </>
          )}

          {state.step === 2 && (
            <>
              <h2 className="text-[15px] font-semibold text-white">Step 2 — Trust Scores</h2>
              <p className="text-[11px] text-[#9CA3AF]">
                Five components sum to a 0–100 trust score. Grade auto-computes.
              </p>
              {(Object.keys(SCORE_MAX) as (keyof ScoreFields)[]).map((field) => (
                <ScoreInput
                  key={field}
                  label={SCORE_LABELS[field]}
                  max={SCORE_MAX[field]}
                  value={state.scores[field]}
                  onChange={(v) => dispatch({ type: 'SET_SCORE', field, value: v })}
                />
              ))}
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.07]">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#6B7280]">Total</p>
                  <p className="text-[22px] font-bold text-white leading-none">
                    {total}
                    <span className="text-[12px] text-[#9CA3AF] font-normal">/100</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-[#6B7280]">Grade</p>
                  <p className="text-[28px] font-bold leading-none" style={{ color: gColor }}>
                    {grade}
                  </p>
                </div>
              </div>
            </>
          )}

          {state.step === 3 && (
            <>
              <h2 className="text-[15px] font-semibold text-white">Step 3 — Contact</h2>
              <div
                className="rounded-lg px-3 py-2 text-[11px]"
                style={{
                  background: 'rgba(186, 117, 23, 0.15)',
                  color: '#F5C76E',
                  border: '1px solid rgba(186, 117, 23, 0.4)',
                }}
              >
                ⚠ AI never sees these — internal CRM only (per BuilderAIContext exclusion).
              </div>
              <Field
                label="Contact Email"
                value={state.contact.contactEmail}
                onChange={(v) =>
                  dispatch({ type: 'SET_CONTACT', field: 'contactEmail', value: v })
                }
                placeholder="ops@example.com"
                type="email"
              />
              <Field
                label="Contact Phone"
                value={state.contact.contactPhone}
                onChange={(v) =>
                  dispatch({ type: 'SET_CONTACT', field: 'contactPhone', value: v })
                }
                placeholder="+91 9XXXXXXXXX"
              />
            </>
          )}

          {state.step === 4 && (
            <>
              <h2 className="text-[15px] font-semibold text-white">Step 4 — Review</h2>
              <ReviewRow label="Builder name" value={state.identity.builderName} />
              <ReviewRow label="Brand name" value={state.identity.brandName} />
              <ReviewRow
                label="Partner"
                value={state.identity.partnerStatus ? 'Yes' : 'No'}
              />
              <ReviewRow
                label="Commission %"
                value={state.identity.commissionRatePct.toString()}
              />
              <ReviewRow label="Total trust" value={`${total}/100 — ${grade}`} />
              <ReviewRow
                label="Contact email"
                value={state.contact.contactEmail || '— (not set)'}
              />
              <ReviewRow
                label="Contact phone"
                value={state.contact.contactPhone || '— (not set)'}
              />
            </>
          )}

          {state.error && (
            <div className="text-[12px] text-[#FCA5A5] bg-[#7F1D1D]/30 border border-[#A32D2D]/40 rounded-lg px-3 py-2">
              {state.error}
            </div>
          )}
          {serverError && state.status === 'error' && (
            <div className="text-[12px] text-[#FCA5A5] bg-[#7F1D1D]/30 border border-[#A32D2D]/40 rounded-lg px-3 py-2">
              Server: {serverError}
            </div>
          )}

          <div className="flex justify-between pt-3">
            <button
              type="button"
              onClick={() => dispatch({ type: 'PREV_STEP' })}
              disabled={state.step === 1 || state.status === 'submitting'}
              className="px-4 py-2 text-[12px] text-[#9CA3AF] border border-white/[0.1] rounded-lg disabled:opacity-30"
            >
              Back
            </button>
            {state.step < 4 ? (
              <button
                type="button"
                onClick={() => dispatch({ type: 'NEXT_STEP' })}
                className="px-5 py-2 text-[12px] font-medium bg-[#185FA5] text-white rounded-lg"
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={state.status === 'submitting'}
                className="px-5 py-2 text-[12px] font-medium bg-[#0F6E56] text-white rounded-lg disabled:opacity-50"
              >
                {state.status === 'submitting' ? 'Creating…' : 'Create Builder'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: 'text' | 'number' | 'email'
}) {
  return (
    <div>
      <label className="block text-[11px] text-[#9CA3AF] mb-1">{label}</label>
      <input
        type={type ?? 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg px-3 py-2 text-[12px] text-white outline-none"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      />
    </div>
  )
}

function ScoreInput({
  label,
  max,
  value,
  onChange,
}: {
  label: string
  max: number
  value: number
  onChange: (v: number) => void
}) {
  const pct = (value / max) * 100
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] text-[#9CA3AF]">{label}</label>
        <span className="text-[11px] font-mono text-white">
          {value}
          <span className="text-[#6B7280]">/{max}</span>
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#185FA5]"
      />
      <div className="h-1 bg-white/[0.06] rounded-full mt-1">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: pct >= 70 ? '#0F6E56' : pct >= 50 ? '#BA7517' : '#A32D2D',
          }}
        />
      </div>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 border-b border-white/[0.05] text-[12px]">
      <span className="text-[#9CA3AF]">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  )
}
