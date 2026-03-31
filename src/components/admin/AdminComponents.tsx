// src/components/admin/AdminCard.tsx
import React from 'react'

export function AdminCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-black/[0.08] rounded-xl p-4">
      <p className="text-[12px] font-medium text-[#1A1A2E] mb-3">{title}</p>
      {children}
    </div>
  )
}

// src/components/admin/GradePill.tsx
const gradeColors: Record<string, { bg: string; text: string }> = {
  A: { bg: '#E1F5EE', text: '#085041' },
  B: { bg: '#E6F1FB', text: '#0C447C' },
  C: { bg: '#FAEEDA', text: '#633806' },
  D: { bg: '#FCEBEB', text: '#791F1F' },
  F: { bg: '#FCEBEB', text: '#791F1F' },
}

export function GradePill({ grade }: { grade: string }) {
  const colors = gradeColors[grade] ?? gradeColors['F']
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-mono"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      Grade {grade}
    </span>
  )
}

// src/components/admin/BadgeStatus.tsx
const badgeColors: Record<string, { bg: string; text: string }> = {
  green:  { bg: '#E1F5EE', text: '#085041' },
  red:    { bg: '#FCEBEB', text: '#791F1F' },
  amber:  { bg: '#FAEEDA', text: '#633806' },
  blue:   { bg: '#E6F1FB', text: '#0C447C' },
  gray:   { bg: '#F4F4F5', text: '#52525B' },
}

export function BadgeStatus({ label, color = 'gray' }: { label: string; color?: string }) {
  const colors = badgeColors[color] ?? badgeColors.gray
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {label}
    </span>
  )
}
