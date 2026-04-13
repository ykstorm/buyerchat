'use client'
import { motion } from 'framer-motion'

type ChargeItem = { name: string; amount: number }

type ProjectForCost = {
  id: string
  projectName: string
  builderName: string
  pricePerSqft: number | null
  allInPrice?: number | null
  charges?: ChargeItem[] | unknown
  configurations?: string | null
  carpetSqftMin?: number | null
  sbaSqftMin?: number | null
}

const formatINR = (n: number) => `₹${n.toLocaleString('en-IN')}`
const formatL = (n: number) => `₹${Math.round(n / 100000)}L`
const emi20yr = (principal: number) => Math.round(principal * 0.00729 * Math.pow(1.00729, 240) / (Math.pow(1.00729, 240) - 1))

function parseCharges(raw: unknown): ChargeItem[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.filter((c): c is ChargeItem =>
      typeof c === 'object' && c !== null && typeof c.name === 'string' && typeof c.amount === 'number' && c.amount > 0
    )
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parseCharges(parsed)
    } catch { /* ignore */ }
  }
  return []
}

export default function CostBreakdownCard({ project }: { project: ProjectForCost }) {
  const charges = parseCharges(project.charges)
  const sqft = project.sbaSqftMin ?? project.carpetSqftMin ?? null
  const basePrice = (project.pricePerSqft && sqft) ? project.pricePerSqft * sqft : null

  // Build line items
  const lines: { label: string; amount: number; highlight?: boolean }[] = []

  if (basePrice) {
    lines.push({ label: `Base Price (${formatINR(project.pricePerSqft!)} × ${sqft} sqft)`, amount: basePrice })
  }

  for (const c of charges) {
    lines.push({ label: c.name, amount: c.amount })
  }

  const subTotal = lines.reduce((s, l) => s + l.amount, 0)
  const gst = Math.round(subTotal * 0.05)
  const stampDuty = Math.round(subTotal * 0.065)
  const allIn = project.allInPrice ?? (subTotal + gst + stampDuty)
  const monthlyEmi = emi20yr(allIn)

  // If we have no data at all, show a minimal card
  if (lines.length === 0 && !project.allInPrice) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <div className="h-0.5 bg-gradient-to-r from-[#0F6E56] via-[#34D399] to-[#0F6E56]" />
        <div className="p-5 text-center">
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            Cost breakdown not available for {project.projectName}. Ask me for a price estimate.
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
    >
      {/* Green accent */}
      <div className="h-0.5 bg-gradient-to-r from-[#0F6E56] via-[#34D399] to-[#0F6E56]" />

      {/* Header */}
      <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'rgba(15,110,86,0.1)' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1V11M3 3.5H8M3.5 6.5H8.5M4 9H8" stroke="#0F6E56" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#0F6E56' }}>
            Cost Breakdown
          </p>
        </div>
        <h3 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--text-primary)' }} className="text-[16px] font-semibold leading-tight">
          {project.projectName}
        </h3>
        <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{project.builderName}</p>
      </div>

      {/* Line items */}
      <div className="px-5 py-3">
        {lines.map((line, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-2"
            style={{ borderBottom: i < lines.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
          >
            <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{line.label}</span>
            <span className="text-[12px] font-medium tabular-nums" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {formatINR(line.amount)}
            </span>
          </div>
        ))}

        {/* Sub Total */}
        {lines.length > 0 && (
          <div className="flex items-center justify-between py-2 mt-1" style={{ borderTop: '1px dashed var(--border)' }}>
            <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Sub Total</span>
            <span className="text-[12px] font-semibold tabular-nums" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {formatINR(subTotal)}
            </span>
          </div>
        )}

        {/* GST */}
        <div className="flex items-center justify-between py-1.5">
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>GST (5%)</span>
          <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {formatINR(gst)}
          </span>
        </div>

        {/* Stamp Duty */}
        <div className="flex items-center justify-between py-1.5">
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Stamp Duty (6.5%)</span>
          <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {formatINR(stampDuty)}
          </span>
        </div>
      </div>

      {/* ALL-IN Total */}
      <div className="mx-5 mb-4 rounded-xl px-4 py-3" style={{ background: 'var(--bg-accent-green)', border: '1px solid var(--border-accent-green)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--text-accent-green)' }}>ALL-IN TOTAL</p>
            <p className="text-[22px] font-bold" style={{ color: 'var(--text-accent-green)', fontFamily: 'var(--font-mono)' }}>
              {formatL(allIn)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-accent-green-light)' }}>EMI ~</p>
            <p className="text-[14px] font-semibold" style={{ color: 'var(--text-accent-green)', fontFamily: 'var(--font-mono)' }}>
              {formatINR(monthlyEmi)}/mo
            </p>
            <p className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>@ 8.75% · 20yr</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 pb-4 flex gap-2">
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => window.dispatchEvent(new CustomEvent('book-visit', { detail: { projectId: project.id } }))}
          className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #0F6E56, #34D399)' }}
        >
          Book visit →
        </motion.button>
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => window.dispatchEvent(new CustomEvent('show-project-card', { detail: { projectId: project.id } }))}
          className="px-4 py-2.5 rounded-xl text-[12px] font-medium border transition-all"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          Details
        </motion.button>
      </div>
    </motion.div>
  )
}
