'use client'
import { useEffect, useState } from 'react'
import { m, useMotionValue, useTransform, animate, useReducedMotion } from 'framer-motion'

const FOCUS_RING = 'focus-visible:ring-2 focus-visible:ring-[#1B4F8A]/50 focus-visible:ring-offset-2 focus-visible:outline-none'

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
  const prefersReduced = useReducedMotion() ?? false
  const charges = parseCharges(project.charges)
  const sqft = project.sbaSqftMin ?? project.carpetSqftMin ?? null
  const basePrice = (project.pricePerSqft && sqft) ? project.pricePerSqft * sqft : null

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

  // ALL-IN counter — ticks 0 → final over 0.8s.
  const allInMV = useMotionValue(0)
  const allInDisplay = useTransform(allInMV, v => Math.round(v as number))
  const [allInNum, setAllInNum] = useState(0)
  useEffect(() => {
    const unsub = allInDisplay.on('change', v => setAllInNum(v as number))
    return unsub
  }, [allInDisplay])
  useEffect(() => {
    if (prefersReduced) { allInMV.set(allIn); return }
    const controls = animate(allInMV, allIn, { duration: 0.8, ease: 'easeOut', delay: 0.5 + lines.length * 0.06 })
    return () => controls.stop()
  }, [allIn, allInMV, lines.length, prefersReduced])

  // Branded empty state — replaces the bare "ask me for a price estimate"
  // line. Surfaces the trust message ("we don't have it yet") and gives
  // the buyer a one-click recovery via compose-message event (caught by
  // chat-client to prefill the input + send).
  if (lines.length === 0 && !project.allInPrice) {
    return (
      <m.div
        initial={prefersReduced ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <div className="h-0.5 bg-gradient-to-r from-[#0F6E56] via-[#34D399] to-[#0F6E56]" />
        <div className="p-5 text-center flex flex-col items-center gap-3">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="9" opacity="0.3" />
            <path d="M9 9h6M9 12h6M9 15h4" />
            <circle cx="18.5" cy="18.5" r="2.5" fill="#0F6E56" stroke="none" opacity="0.85" />
            <text x="18.5" y="19.5" textAnchor="middle" fontSize="3" fill="white" fontWeight="700">₹</text>
          </svg>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
            Pricing for <span className="font-semibold">{project.projectName}</span> is still being verified.
          </p>
          <m.button
            type="button"
            whileTap={prefersReduced ? undefined : { scale: 0.97 }}
            onClick={() => window.dispatchEvent(new CustomEvent('compose-message', {
              detail: { message: `${project.projectName} ka pricing kab tak available hoga?` }
            }))}
            className={`mt-1 px-4 py-2 rounded-xl text-[12px] font-semibold text-white ${FOCUS_RING}`}
            style={{ background: '#0F6E56' }}
          >
            Request an estimate →
          </m.button>
        </div>
      </m.div>
    )
  }

  return (
    <m.div
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

      {/* Line items — staggered in (0.15 + i * 0.06). Sub-Total + GST +
          Stamp Duty land 0.2s later as a "tax beat" so the buyer reads
          the base lines first, then sees the additions. */}
      <div className="px-5 py-3">
        {lines.map((line, i) => (
          <m.div
            key={i}
            initial={prefersReduced ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.06, duration: 0.3, ease: 'easeOut' }}
            className="flex items-center justify-between py-2"
            style={{ borderBottom: i < lines.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
          >
            <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{line.label}</span>
            <span className="text-[12px] font-medium tabular-nums" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {formatINR(line.amount)}
            </span>
          </m.div>
        ))}

        {lines.length > 0 && (
          <m.div
            initial={prefersReduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 + lines.length * 0.06 + 0.2, duration: 0.3 }}
            className="flex items-center justify-between py-2 mt-1"
            style={{ borderTop: '1px dashed var(--border)' }}
          >
            <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Sub Total</span>
            <span className="text-[12px] font-semibold tabular-nums" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {formatINR(subTotal)}
            </span>
          </m.div>
        )}

        <m.div
          initial={prefersReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 + lines.length * 0.06 + 0.3, duration: 0.3 }}
          className="flex items-center justify-between py-1.5"
        >
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>GST (5%)</span>
          <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {formatINR(gst)}
          </span>
        </m.div>

        <m.div
          initial={prefersReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 + lines.length * 0.06 + 0.4, duration: 0.3 }}
          className="flex items-center justify-between py-1.5"
        >
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Stamp Duty (6.5%)</span>
          <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {formatINR(stampDuty)}
          </span>
        </m.div>
      </div>

      {/* ALL-IN Total — number ticks 0 → allIn over 0.8s after the line
          stagger lands (delay set in useEffect above). */}
      <div className="mx-5 mb-4 rounded-xl px-4 py-3" style={{ background: 'var(--bg-accent-green)', border: '1px solid var(--border-accent-green)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--text-accent-green)' }}>ALL-IN TOTAL</p>
            <p className="text-[22px] font-bold tabular-nums" style={{ color: 'var(--text-accent-green)', fontFamily: 'var(--font-mono)' }}>
              ₹{Math.round(allInNum / 100000)}L
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
        <m.button
          type="button"
          whileHover={prefersReduced ? undefined : { scale: 1.02 }}
          whileTap={prefersReduced ? undefined : { scale: 0.97 }}
          onClick={() => window.dispatchEvent(new CustomEvent('book-visit', { detail: { projectId: project.id } }))}
          className={`flex-1 py-2.5 rounded-xl text-[12px] font-semibold text-white ${FOCUS_RING}`}
          style={{ background: 'linear-gradient(135deg, #0F6E56, #34D399)' }}
        >
          Book visit →
        </m.button>
        <m.button
          type="button"
          whileHover={prefersReduced ? undefined : { scale: 1.02 }}
          whileTap={prefersReduced ? undefined : { scale: 0.97 }}
          onClick={() => window.dispatchEvent(new CustomEvent('show-project-card', { detail: { projectId: project.id } }))}
          className={`px-4 py-2.5 rounded-xl text-[12px] font-medium border transition-all ${FOCUS_RING}`}
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          Details
        </m.button>
      </div>
    </m.div>
  )
}
