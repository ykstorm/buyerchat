'use client'
import { useState } from 'react'
import { m, AnimatePresence, useReducedMotion } from 'framer-motion'

const FOCUS_RING = 'focus-visible:ring-2 focus-visible:ring-[#1B4F8A]/50 focus-visible:ring-offset-2 focus-visible:outline-none'

type BuilderData = {
  brandName: string
  builderName: string
  grade: string
  totalTrustScore: number
  deliveryScore: number
  reraScore: number
  qualityScore: number
  financialScore: number
  responsivenessScore: number
  agreementSigned: boolean
}

const gradeColor = (g: string) =>
  g === 'A' ? '#34D399' : g === 'B' ? '#60A5FA' : g === 'C' ? '#FBBF24' : '#F87171'

// One-line gloss for each grade — surfaced as a tooltip when the buyer
// hovers/focuses the grade pill, since "Grade C" alone is opaque.
const GRADE_TEXT: Record<string, string> = {
  A: 'Excellent track record, lowest risk.',
  B: 'Good track record, low-moderate risk.',
  C: 'Acceptable track record with moderate risk.',
  D: 'Limited track record — verify carefully.',
  F: 'High-risk builder — extra caution warranted.',
}

export default function BuilderTrustCard({ builder, hasSubscores = true }: { builder: BuilderData; hasSubscores?: boolean }) {
  const prefersReduced = useReducedMotion() ?? false
  const [showTip, setShowTip] = useState(false)
  const scores = [
    { label: 'Delivery', value: builder.deliveryScore, max: 30 },
    { label: 'RERA', value: builder.reraScore, max: 20 },
    { label: 'Quality', value: builder.qualityScore, max: 20 },
    { label: 'Financial', value: builder.financialScore, max: 15 },
    { label: 'Response', value: builder.responsivenessScore, max: 15 },
  ]
  const gradeTip = GRADE_TEXT[builder.grade] ?? GRADE_TEXT.C

  return (
    <m.div
      initial={prefersReduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      <div className="h-0.5 bg-gradient-to-r from-[#1B4F8A] via-[#2563EB] to-[#1B4F8A]" />

      {/* Header */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[16px] font-bold text-white"
            style={{ background: '#1B4F8A' }}>
            {builder.brandName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--text-primary)' }} className="text-[16px] font-semibold">
                {builder.brandName}
              </h2>
              {/* Grade pill — hover/focus reveals the GRADE_TEXT one-liner so
                  the buyer doesn't have to know what "Grade C" means. */}
              <span className="relative inline-block">
                <button
                  type="button"
                  onMouseEnter={() => setShowTip(true)}
                  onMouseLeave={() => setShowTip(false)}
                  onFocus={() => setShowTip(true)}
                  onBlur={() => setShowTip(false)}
                  aria-label={`Grade ${builder.grade}: ${gradeTip}`}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${FOCUS_RING}`}
                  style={{ background: gradeColor(builder.grade) + '22', color: gradeColor(builder.grade) }}
                >
                  Grade {builder.grade}
                </button>
                <AnimatePresence>
                  {showTip && (
                    <m.div
                      initial={prefersReduced ? false : { opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      role="tooltip"
                      className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-1.5 px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap pointer-events-none"
                      style={{ background: 'var(--bg-primary, #1C1917)', color: '#FAFAF7', fontSize: 10, fontWeight: 500, border: '1px solid var(--border)' }}
                    >
                      {gradeTip}
                    </m.div>
                  )}
                </AnimatePresence>
              </span>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{builder.builderName}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[24px] font-bold" style={{ color: gradeColor(builder.grade) }}>{builder.totalTrustScore}</p>
            <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>/ 100</p>
          </div>
        </div>

        {/* Overall bar */}
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
          <m.div
            initial={{ width: 0 }}
            animate={{ width: `${builder.totalTrustScore}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
            className="h-full rounded-full"
            style={{ background: gradeColor(builder.grade) }}
          />
        </div>
      </div>

      {/* Score breakdown — hidden when builder not resolved (shows total gauge only) */}
      {hasSubscores ? (
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <p className="text-[9px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Score Breakdown</p>
          <div className="space-y-2.5">
            {scores.map((s, i) => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="text-[10px] w-16 flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
                  <m.div
                    initial={prefersReduced ? false : { width: 0 }}
                    animate={{ width: `${(s.value / s.max) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 + i * 0.12 }}
                    className="h-full rounded-full"
                    style={{ background: '#1B4F8A' }}
                  />
                </div>
                <span className="text-[10px] font-mono font-medium w-10 text-right" style={{ color: 'var(--text-primary)' }}>{s.value}/{s.max}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <p className="text-[11px] italic" style={{ color: 'var(--text-muted)' }}>
            Detailed scores unavailable
          </p>
        </div>
      )}

      {/* Trust signals */}
      <div className="px-5 py-4">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-[#A8A29E] mb-3">Trust Signals</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Agreement', value: builder.agreementSigned ? '✓ Signed' : '⚠ Pending', ok: builder.agreementSigned },
            { label: 'Grade', value: `Grade ${builder.grade}`, ok: ['A', 'B'].includes(builder.grade) },
          ].map(item => (
            <div key={item.label} className="rounded-xl px-3 py-2.5"
              style={{ background: item.ok ? '#F0FDF4' : '#FEF3C7', border: `1px solid ${item.ok ? '#BBF7D0' : '#FDE68A'}` }}>
              <p className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: item.ok ? '#0F6E56' : '#92400E' }}>{item.label}</p>
              <p className="text-[12px] font-semibold" style={{ color: item.ok ? '#0F6E56' : '#92400E' }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </m.div>
  )
}
