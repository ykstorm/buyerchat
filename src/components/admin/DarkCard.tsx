'use client'
import Link from 'next/link'
import React from 'react'

export function DarkMetricCard({ label, value, sub, color, href }: {
  label: string; value: string | number; sub?: string; color?: string; href?: string
}) {
  const inner = (
    <div className="rounded-xl px-4 py-3 transition-all hover:scale-[1.02]" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>{label}</p>
      <p className="text-[24px] font-bold leading-none mb-1" style={{ color: color ?? '#60A5FA' }}>{value}</p>
      {sub && <p className="text-[10px]" style={{ color: '#4B5563' }}>{sub}</p>}
    </div>
  )
  return href ? <Link href={href} className="block">{inner}</Link> : inner
}

export function DarkCard({ title, children, action }: {
  title: string; children: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] font-semibold text-white">{title}</p>
        {action}
      </div>
      {children}
    </div>
  )
}

export function DarkTable({ headers, rows }: {
  headers: string[]
  rows: (string | React.ReactNode)[][]
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#4B5563', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              {row.map((cell, j) => (
                <td key={j} className="py-2.5 px-3" style={{ color: '#D1D5DB' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function DarkBadge({ label, color }: { label: string; color: 'green' | 'red' | 'amber' | 'blue' | 'gray' }) {
  const styles = {
    green:  { background: 'rgba(52,211,153,0.12)',  color: '#34D399' },
    red:    { background: 'rgba(248,113,113,0.12)', color: '#F87171' },
    amber:  { background: 'rgba(251,191,36,0.12)',  color: '#FBBF24' },
    blue:   { background: 'rgba(96,165,250,0.12)',  color: '#60A5FA' },
    gray:   { background: 'rgba(156,163,175,0.12)', color: '#9CA3AF' },
  }
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={styles[color]}>{label}</span>
  )
}
