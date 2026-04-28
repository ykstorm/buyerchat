'use client'

import * as Sentry from '@sentry/nextjs'
import Link from 'next/link'
import { useEffect } from 'react'

// Lineart icon set — replaces the emoji nav icons + decorates dead-state shells.
// 16×16 viewBox; stroke inherits from currentColor so callers control colour.
type IconKind =
  | 'gauge' | 'building' | 'users' | 'crane' | 'phone'
  | 'wallet' | 'brain' | 'calendar' | 'gear'
  | 'inbox' | 'spark' | 'alert' | 'compass' | 'check-circle'
  | 'arrow-up' | 'clock' | 'note' | 'shield'

export function AdminIcon({ kind, size = 16 }: { kind: IconKind; size?: number }) {
  const common = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const, 'aria-hidden': true,
  }
  switch (kind) {
    case 'gauge':       return <svg {...common}><path d="M12 14l4-4M3 12a9 9 0 0118 0v0M5 18h14" /><circle cx="12" cy="14" r="1.5" /></svg>
    case 'building':    return <svg {...common}><path d="M4 21V5a2 2 0 012-2h12a2 2 0 012 2v16M4 21h16M9 7v.01M9 11v.01M9 15v.01M15 7v.01M15 11v.01M15 15v.01" /></svg>
    case 'users':       return <svg {...common}><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M22 21v-2a4 4 0 00-3-3.87" /><circle cx="9" cy="7" r="4" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
    case 'crane':       return <svg {...common}><path d="M5 21V8l8-4 8 4v13M9 21V12h6v9M3 8l10-5 10 5" /></svg>
    case 'phone':       return <svg {...common}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" /></svg>
    case 'wallet':      return <svg {...common}><path d="M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h16v-5" /><circle cx="18" cy="14" r="1.5" /></svg>
    case 'brain':       return <svg {...common}><path d="M9 3a3 3 0 00-3 3v0a3 3 0 00-2 5v0a3 3 0 002 5v0a3 3 0 003 3 3 3 0 003-3 3 3 0 003 3 3 3 0 003-3v0a3 3 0 002-5v0a3 3 0 00-2-5v0a3 3 0 00-3-3 3 3 0 00-3 3 3 3 0 00-3-3z" /></svg>
    case 'calendar':    return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
    case 'gear':        return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
    case 'inbox':       return <svg {...common}><path d="M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" /></svg>
    case 'spark':       return <svg {...common}><path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3z" /></svg>
    case 'alert':       return <svg {...common}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" /></svg>
    case 'compass':     return <svg {...common}><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>
    case 'check-circle':return <svg {...common}><circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" /></svg>
    case 'arrow-up':    return <svg {...common}><path d="M12 19V5M5 12l7-7 7 7" /></svg>
    case 'clock':       return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
    case 'note':        return <svg {...common}><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" /><path d="M14 3v6h6M9 13h6M9 17h4" /></svg>
    case 'shield':      return <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
  }
}

// Inline empty state — renders centered on the host surface (no own bg).
// Use inside a list/table when the dataset is empty.
export function AdminEmptyState({
  icon, title, body, ctaLabel, ctaHref,
}: {
  icon: IconKind
  title: string
  body?: string
  ctaLabel?: string
  ctaHref?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-6">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(96,165,250,0.10)', color: '#60A5FA' }}>
        <AdminIcon kind={icon} size={20} />
      </div>
      <p className="text-[15px] italic mb-1" style={{ fontFamily: 'var(--font-playfair, Georgia), serif', color: '#E5E7EB' }}>{title}</p>
      {body && <p className="text-[12px] max-w-[280px]" style={{ color: '#6B7280' }}>{body}</p>}
      {ctaLabel && ctaHref && (
        <Link href={ctaHref} className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors" style={{ background: 'rgba(96,165,250,0.10)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.25)' }}>
          {ctaLabel} <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  )
}

// Full-page error shell — used by error.tsx route segments.
// Pass `back` to set the "back to ___" link target; defaults to /admin/overview.
export function AdminErrorShell({
  error, reset, title, body, back,
}: {
  error: Error
  reset: () => void
  title?: string
  body?: string
  back?: { href: string; label: string }
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])
  const t = title ?? 'Something glitched on our side — not yours.'
  const b = body ?? "Sentry has been notified. Try once more — if it sticks, ping the engineer."
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0A0F1E' }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(248,113,113,0.10)', color: '#F87171' }}>
        <AdminIcon kind="alert" size={22} />
      </div>
      <p className="text-[18px] italic mb-1.5 max-w-md text-center" style={{ fontFamily: 'var(--font-playfair, Georgia), serif', color: '#E5E7EB' }}>{t}</p>
      <p className="text-[12px] max-w-sm text-center" style={{ color: '#6B7280' }}>{b}</p>
      <div className="mt-5 flex items-center gap-2">
        <button type="button" onClick={reset} className="text-[12px] font-medium px-4 py-2 rounded-lg transition-colors" style={{ background: '#1B4F8A', color: 'white' }}>
          Retry ↻
        </button>
        {back && (
          <Link href={back.href} className="text-[12px] font-medium px-4 py-2 rounded-lg transition-colors" style={{ color: '#60A5FA', border: '1px solid rgba(96,165,250,0.25)' }}>
            ← {back.label}
          </Link>
        )}
      </div>
    </div>
  )
}

// Full-page not-found shell — used by not-found.tsx route segments under /admin.
// Branded equivalent of Next's default 404 — single back-link affordance.
export function AdminNotFoundShell({
  title, body, back,
}: {
  title?: string
  body?: string
  back: { href: string; label: string }
}) {
  const t = title ?? 'Nothing here at this ID.'
  const b = body ?? "It may have been deleted, renamed, or never existed. Browse the list to find what you're looking for."
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0A0F1E' }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(96,165,250,0.10)', color: '#60A5FA' }}>
        <AdminIcon kind="compass" size={22} />
      </div>
      <p className="text-[18px] italic mb-1.5 max-w-md text-center" style={{ fontFamily: 'var(--font-playfair, Georgia), serif', color: '#E5E7EB' }}>{t}</p>
      <p className="text-[12px] max-w-sm text-center" style={{ color: '#6B7280' }}>{b}</p>
      <Link href={back.href} className="mt-5 text-[12px] font-medium px-4 py-2 rounded-lg transition-colors" style={{ background: '#1B4F8A', color: 'white' }}>
        ← {back.label}
      </Link>
    </div>
  )
}

// Generic admin loading skeleton — used by route segments without a dedicated
// list/table layout (visits, intelligence, revenue, builders).
export function AdminLoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="min-h-screen" style={{ background: '#0A0F1E' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="h-6 w-44 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-3 w-56 rounded mt-2 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        </div>
        <div className="h-7 w-24 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="w-9 h-9 rounded-xl animate-pulse flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/5 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-2.5 w-3/5 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
            <div className="h-6 w-16 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// Eyebrow above page H1 — Sora 11px uppercase 0.32em tracking, gold accent
// per DESIGN.md §5. Use as <AdminEyebrow>OVERVIEW</AdminEyebrow> above the
// existing H1 to give every admin surface the editorial pre-title beat.
export function AdminEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase mb-1" style={{ letterSpacing: '0.32em', color: '#C49B50' }}>
      {children}
    </p>
  )
}
