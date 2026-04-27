'use client'
import { m, useReducedMotion } from 'framer-motion'
import type { ProjectType } from '@/lib/types/chat'

const FOCUS_RING = 'focus-visible:ring-2 focus-visible:ring-[#1B4F8A]/50 focus-visible:ring-offset-2 focus-visible:outline-none'

function formatL(n: number | null | undefined) {
  if (!n || n === 0) return '—'
  return `₹${Math.round(n / 100000)}L`
}

function possession(d: Date | string) {
  return new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

// CTA color now driven by decisionTag (Strong Buy = green, Buy w/ Cond = blue,
// Wait/Avoid = neutral grey) instead of index — so the visual tells the buyer
// which is the recommended path, not just "left vs right".
function ctaColor(tag: string | null | undefined): string {
  if (tag === 'Strong Buy') return '#0F6E56'
  if (tag === 'Buy w/ Cond') return '#1B4F8A'
  return '#6B7280'
}

function Winner({ isWinner, delay, prefersReduced }: { isWinner: boolean; delay: number; prefersReduced: boolean }) {
  if (!isWinner) return null
  return (
    <m.span
      initial={prefersReduced ? false : { scale: 0 }}
      animate={{ scale: prefersReduced ? 1 : [0, 1.3, 1] }}
      transition={{ delay, duration: 0.45, ease: 'backOut' }}
      className="inline-block text-[9px] font-bold ml-1"
      style={{ color: 'var(--text-accent-green)' }}
    >
      ✓
    </m.span>
  )
}

export default function ComparisonCard({ projectA, projectB }: { projectA: ProjectType; projectB: ProjectType }) {
  const prefersReduced = useReducedMotion() ?? false
  const rows = [
    {
      label: 'Decision',
      a: projectA.decisionTag ?? '—',
      b: projectB.decisionTag ?? '—',
      winA: projectA.decisionTag === 'Strong Buy',
      winB: projectB.decisionTag === 'Strong Buy',
    },
    {
      label: '₹/sqft SBU',
      a: projectA.pricePerSqft ? `₹${projectA.pricePerSqft.toLocaleString('en-IN')}` : '—',
      b: projectB.pricePerSqft ? `₹${projectB.pricePerSqft.toLocaleString('en-IN')}` : '—',
      winA: (projectA.pricePerSqft ?? 999999) < (projectB.pricePerSqft ?? 999999),
      winB: (projectB.pricePerSqft ?? 999999) < (projectA.pricePerSqft ?? 999999),
    },
    {
      label: 'ALL-IN',
      a: formatL(projectA.allInPrice),
      b: formatL(projectB.allInPrice),
      winA: (projectA.allInPrice ?? 999999999) < (projectB.allInPrice ?? 999999999),
      winB: (projectB.allInPrice ?? 999999999) < (projectA.allInPrice ?? 999999999),
    },
    {
      label: 'Possession',
      a: possession(projectA.possessionDate),
      b: possession(projectB.possessionDate),
      winA: new Date(projectA.possessionDate) < new Date(projectB.possessionDate),
      winB: new Date(projectB.possessionDate) < new Date(projectA.possessionDate),
    },
    {
      label: 'Status',
      a: projectA.constructionStatus === 'Ready to Move' ? 'Ready ✓' : 'UC',
      b: projectB.constructionStatus === 'Ready to Move' ? 'Ready ✓' : 'UC',
      winA: projectA.constructionStatus === 'Ready to Move',
      winB: projectB.constructionStatus === 'Ready to Move',
    },
    {
      label: 'Config',
      a: projectA.configurations?.split(',')[0] ?? '—',
      b: projectB.configurations?.split(',')[0] ?? '—',
      winA: false,
      winB: false,
    },
    {
      label: 'Location',
      a: projectA.microMarket,
      b: projectB.microMarket,
      winA: false,
      winB: false,
    },
  ]

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="rounded-2xl overflow-hidden shadow-luxury-card"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      {/* Top accent */}
      <div className="h-0.5 bg-gradient-to-r from-[#1B4F8A] via-[#2563EB] to-[#1B4F8A]" />

      {/* Header */}
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Side-by-side comparison</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-2.5" style={{ background: 'var(--bg-accent-blue)', border: '1px solid var(--border-accent-blue)' }}>
            <p style={{ fontFamily: 'var(--font-playfair)', color: 'var(--text-primary)' }} className="text-[13px] font-semibold truncate">{projectA.projectName}</p>
            <p className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>{projectA.builderName}</p>
          </div>
          <div className="rounded-xl p-2.5" style={{ background: 'var(--bg-accent-green)', border: '1px solid var(--border-accent-green)' }}>
            <p style={{ fontFamily: 'var(--font-playfair)', color: 'var(--text-primary)' }} className="text-[13px] font-semibold truncate">{projectB.projectName}</p>
            <p className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>{projectB.builderName}</p>
          </div>
        </div>
      </div>

      {/* Comparison rows. Winner cells get a 1-frame green flash that fades
          back to the surface tint, drawing the eye to the row's verdict. */}
      <div className="px-4 py-2">
        {rows.map((row, i) => (
          <div key={row.label} className="grid grid-cols-[80px_1fr_1fr] gap-2 py-3 items-center" style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{row.label}</p>
            <m.p
              initial={prefersReduced ? false : (row.winA ? { backgroundColor: 'rgba(225,245,238,0)' } : false)}
              animate={row.winA && !prefersReduced ? { backgroundColor: ['rgba(225,245,238,0)', 'rgba(225,245,238,0.5)', 'rgba(225,245,238,0)'] } : undefined}
              transition={{ delay: 0.35 + i * 0.15, duration: 0.6 }}
              className="text-[12px] font-medium rounded px-1 -mx-1"
              style={{ color: row.winA ? 'var(--text-accent-green)' : 'var(--text-primary)' }}
            >
              {row.a}<Winner isWinner={row.winA} delay={0.4 + i * 0.15} prefersReduced={prefersReduced} />
            </m.p>
            <m.p
              initial={prefersReduced ? false : (row.winB ? { backgroundColor: 'rgba(225,245,238,0)' } : false)}
              animate={row.winB && !prefersReduced ? { backgroundColor: ['rgba(225,245,238,0)', 'rgba(225,245,238,0.5)', 'rgba(225,245,238,0)'] } : undefined}
              transition={{ delay: 0.35 + i * 0.15, duration: 0.6 }}
              className="text-[12px] font-medium rounded px-1 -mx-1"
              style={{ color: row.winB ? 'var(--text-accent-green)' : 'var(--text-primary)' }}
            >
              {row.b}<Winner isWinner={row.winB} delay={0.4 + i * 0.15} prefersReduced={prefersReduced} />
            </m.p>
          </div>
        ))}
      </div>

      {/* Honest concerns */}
      {(projectA.honestConcern || projectB.honestConcern) && (
        <div className="px-4 pb-4 grid grid-cols-2 gap-3">
          {[projectA, projectB].map((p, i) => p.honestConcern ? (
            <div key={i} className="rounded-xl px-3 py-2" style={{ background: 'var(--bg-accent-amber)', border: '1px solid var(--border-accent-amber)' }}>
              <p className="text-[9px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-accent-amber-title)' }}>⚠ Concern</p>
              <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-accent-amber)' }}>{p.honestConcern}</p>
            </div>
          ) : <div key={i} />)}
        </div>
      )}

      {/* Actions — CTA colour now follows decisionTag, not index, so the
          recommended project gets the green Strong-Buy treatment. */}
      <div className="px-4 pb-4 grid grid-cols-2 gap-2">
        {[projectA, projectB].map((p, i) => (
          <m.button
            key={i}
            type="button"
            whileHover={prefersReduced ? undefined : { scale: 1.02 }}
            whileTap={prefersReduced ? undefined : { scale: 0.97 }}
            onClick={() => window.dispatchEvent(new CustomEvent('book-visit', { detail: { projectId: p.id } }))}
            className={`py-3 rounded-xl text-[12px] font-semibold text-white ${FOCUS_RING}`}
            style={{ background: ctaColor(p.decisionTag) }}
            aria-label={`Book a visit to ${p.projectName}`}
          >
            Visit {p.projectName.split(' ')[0]} →
          </m.button>
        ))}
      </div>
    </m.div>
  )
}
