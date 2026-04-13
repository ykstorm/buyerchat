'use client'
import { motion } from 'framer-motion'

type ProjectType = {
  id: string
  projectName: string
  builderName: string
  pricePerSqft: number | null
  allInPrice?: number | null
  possessionDate: Date | string
  constructionStatus: string
  microMarket: string
  decisionTag?: string | null
  honestConcern?: string | null
  analystNote?: string | null
  configurations?: string | null
}

function formatL(n: number | null | undefined) {
  if (!n || n === 0) return '—'
  return `₹${Math.round(n / 100000)}L`
}

function possession(d: Date | string) {
  return new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

function Winner({ isWinner }: { isWinner: boolean }) {
  if (!isWinner) return null
  return <span className="text-[9px] font-bold ml-1" style={{ color: 'var(--text-accent-green)' }}>✓</span>
}

export default function ComparisonCard({ projectA, projectB }: { projectA: ProjectType; projectB: ProjectType }) {
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
    <motion.div
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

      {/* Comparison rows */}
      <div className="px-4 py-2">
        {rows.map((row, i) => (
          <div key={row.label} className="grid grid-cols-[80px_1fr_1fr] gap-2 py-2.5 items-center" style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
            <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{row.label}</p>
            <p className="text-[11px] font-medium" style={{ color: row.winA ? 'var(--text-accent-green)' : 'var(--text-primary)' }}>
              {row.a}<Winner isWinner={row.winA} />
            </p>
            <p className="text-[11px] font-medium" style={{ color: row.winB ? 'var(--text-accent-green)' : 'var(--text-primary)' }}>
              {row.b}<Winner isWinner={row.winB} />
            </p>
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

      {/* Actions */}
      <div className="px-4 pb-4 grid grid-cols-2 gap-2">
        {[projectA, projectB].map((p, i) => (
          <motion.button
            key={i}
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => window.dispatchEvent(new CustomEvent('book-visit', { detail: { projectId: p.id } }))}
            className="py-2.5 rounded-xl text-[11px] font-semibold text-white"
            style={{ background: i === 0 ? '#1B4F8A' : '#0F6E56' }}
          >
            Visit {p.projectName.split(' ')[0]} →
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}
