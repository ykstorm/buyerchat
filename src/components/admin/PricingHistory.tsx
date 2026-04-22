'use client'

import { useState } from 'react'

export interface HistoryEntry {
  id: string
  basicRatePerSqft: number | null
  grandTotalAllIn: number | null
  snapshotJson: unknown
  changedAt: string | Date
  changedBy: string | null
  changeReason: string | null
}

interface Props {
  history: HistoryEntry[]
}

function formatINR(n: number | null): string {
  if (!n || n <= 0) return '—'
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`
  return `₹${n.toLocaleString('en-IN')}`
}

function formatDate(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Timeline of past pricing changes. Entries expected in descending order
 * (most recent first — the server already orders by `changedAt desc`).
 * Each row shows before → after arrows for basicRatePerSqft & grandTotal,
 * and the raw snapshot JSON is behind a <details> toggle.
 */
export default function PricingHistory({ history }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (!history || history.length === 0) {
    return (
      <div
        className="rounded-xl p-4"
        style={{
          background: 'var(--card-bg, #111827)',
          border: '1px solid var(--card-border, rgba(255,255,255,0.07))',
        }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-2">
          Pricing history
        </p>
        <p className="text-[12px] text-[#6B7280]">
          No history yet — save pricing to start the timeline.
        </p>
      </div>
    )
  }

  // Pair each entry with the one after it (older) so we can show before→after.
  // history[i] is newer than history[i+1].
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'var(--card-bg, #111827)',
        border: '1px solid var(--card-border, rgba(255,255,255,0.07))',
      }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-3">
        Pricing history ({history.length})
      </p>
      <ol className="space-y-3">
        {history.map((entry, i) => {
          const prev = history[i + 1] // older entry
          const isOpen = expandedId === entry.id
          return (
            <li
              key={entry.id}
              className="rounded-lg p-3"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-[11px] text-white">
                    {formatDate(entry.changedAt)}
                  </span>
                  <span className="text-[10px] text-[#9CA3AF]">
                    by {entry.changedBy ?? 'system'}
                    {entry.changeReason ? ` · ${entry.changeReason}` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label={isOpen ? 'Collapse snapshot' : 'Expand snapshot'}
                  aria-expanded={isOpen}
                  onClick={() => setExpandedId(isOpen ? null : entry.id)}
                  className="text-[10px] text-[#60A5FA] hover:underline"
                >
                  {isOpen ? 'Hide details' : 'Show details'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2 text-[11px]">
                <div>
                  <p className="text-[#6B7280]">Basic rate (₹/sqft)</p>
                  <p className="font-mono text-white">
                    {prev ? `${prev.basicRatePerSqft ?? '—'} → ` : ''}
                    {entry.basicRatePerSqft ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[#6B7280]">Grand total all-in</p>
                  <p className="font-mono text-white">
                    {prev ? `${formatINR(prev.grandTotalAllIn)} → ` : ''}
                    {formatINR(entry.grandTotalAllIn)}
                  </p>
                </div>
              </div>

              {isOpen && (
                <pre
                  className="mt-2 p-2 rounded text-[10px] overflow-x-auto"
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: '#9CA3AF',
                    maxHeight: 240,
                  }}
                >
                  {JSON.stringify(entry.snapshotJson, null, 2)}
                </pre>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
