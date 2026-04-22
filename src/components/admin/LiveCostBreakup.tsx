'use client'

import type { Breakdown } from '@/lib/pricing/calculator'

interface Props {
  breakdown: Breakdown
  dirty?: boolean
  affectedBuyers?: number
}

function formatINR(n: number): string {
  if (!n || n <= 0) return '—'
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`
  return `₹${n.toLocaleString('en-IN')}`
}

const ROWS: Array<{ key: keyof Breakdown; label: string }> = [
  { key: 'basicCostTotal', label: 'Basic cost' },
  { key: 'plcTotal', label: '— of which PLC' },
  { key: 'devGovtTotal', label: 'Dev + Govt' },
  { key: 'maintenanceTotal', label: 'Maintenance / deposits' },
  { key: 'fixedChargesTotal', label: 'Fixed charges' },
  { key: 'gstTotal', label: 'GST' },
  { key: 'stampRegTotal', label: 'Stamp + Registration' },
]

/**
 * Live cost breakup widget — pure presentation. Parent recomputes the
 * breakdown on form change and re-passes it here.
 */
export default function LiveCostBreakup({ breakdown, dirty, affectedBuyers }: Props) {
  return (
    <aside
      aria-label="Live cost breakup"
      className="rounded-xl p-4"
      style={{
        background: 'var(--card-bg, #111827)',
        border: '1px solid var(--card-border, rgba(255,255,255,0.07))',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
          Live cost breakup
        </p>
        {dirty && (
          <span
            aria-label="Unsaved changes"
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(217,119,6,0.15)',
              color: '#F59E0B',
              border: '1px solid rgba(217,119,6,0.3)',
            }}
          >
            Unsaved
          </span>
        )}
      </div>

      <div className="space-y-1.5 text-[12px]">
        {ROWS.map((row) => (
          <div key={row.key} className="flex justify-between">
            <span className="text-[#9CA3AF]">{row.label}</span>
            <span className="font-mono text-white">
              {formatINR(breakdown[row.key] ?? 0)}
            </span>
          </div>
        ))}

        <div
          className="flex justify-between pt-2 mt-2"
          style={{ borderTop: '1px solid rgba(52,211,153,0.25)' }}
        >
          <span className="font-semibold" style={{ color: '#34D399' }}>
            GRAND TOTAL (All-in)
          </span>
          <span className="font-mono font-bold" style={{ color: '#34D399' }}>
            {formatINR(breakdown.grandTotalAllIn)}
          </span>
        </div>
      </div>

      {typeof affectedBuyers === 'number' && affectedBuyers >= 0 && (
        <div
          className="mt-3 pt-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-[10px] text-[#6B7280]">
            Change will affect{' '}
            <span className="text-white font-semibold">{affectedBuyers}</span>{' '}
            matched buyer{affectedBuyers === 1 ? '' : 's'}
          </p>
        </div>
      )}
    </aside>
  )
}
