// src/components/admin/MetricCard.tsx
import React from 'react'

interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  color?: 'green' | 'red' | 'amber' | 'default'
}

const colorMap = {
  green: '#0F6E56',
  red: '#A32D2D',
  amber: '#BA7517',
  default: '#1A1A2E',
}

export function MetricCard({ label, value, sub, color = 'default' }: MetricCardProps) {
  return (
    <div className="bg-white border border-black/[0.08] rounded-lg p-3">
      <p className="text-[11px] text-[#52525B] mb-1">{label}</p>
      <p className="text-[22px] font-medium leading-none" style={{ color: colorMap[color] }}>{value}</p>
      {sub && <p className="text-[11px] text-[#71717A] mt-0.5">{sub}</p>}
    </div>
  )
}
