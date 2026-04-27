'use client'
import { useState, useEffect, useRef } from 'react'
import { m, useMotionValue, useTransform, animate, useReducedMotion } from 'framer-motion'
import { signIn } from 'next-auth/react'
import type { ProjectType } from '@/lib/types/chat'

const emi = (allIn: number) => Math.round(allIn * 0.00729 * Math.pow(1.00729, 240) / (Math.pow(1.00729, 240) - 1))

// Pending-save persistence — survives the OAuth full-page reload so the save
// auto-retries once the buyer is authenticated.
const PENDING_SAVE_TTL_MS = 10 * 60 * 1000 // 10 min
const pendingSaveKey = (projectId: string) => `buyerchat:pendingsave:${projectId}`

const FOCUS_RING = 'focus-visible:ring-2 focus-visible:ring-[#1B4F8A]/50 focus-visible:ring-offset-2 focus-visible:outline-none'

export default function ProjectCardV2({ project }: { project: ProjectType }) {
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [showSignInPrompt, setShowSignInPrompt] = useState(false)
  const [showSavedToast, setShowSavedToast] = useState(false)
  const prefersReduced = useReducedMotion()

  // Trust-score counter — number races the bar 0 → trustScore over 0.8s.
  const trustMV = useMotionValue(0)
  const trustDisplay = useTransform(trustMV, v => Math.round(v))
  const [trustNum, setTrustNum] = useState(0)
  useEffect(() => {
    const unsub = trustDisplay.on('change', v => setTrustNum(v as number))
    return unsub
  }, [trustDisplay])
  useEffect(() => {
    if (!project.trustScore) return
    if (prefersReduced) {
      trustMV.set(project.trustScore)
      return
    }
    const controls = animate(trustMV, project.trustScore, { duration: 0.8, ease: 'easeOut', delay: 0.3 })
    return () => controls.stop()
  }, [project.trustScore, trustMV, prefersReduced])

  useEffect(() => {
    let cancelled = false
    let pending: { ts: number } | null = null
    if (typeof window !== 'undefined') {
      try {
        const raw = window.sessionStorage.getItem(pendingSaveKey(project.id))
        if (raw) {
          const parsed = JSON.parse(raw) as { ts: number }
          if (parsed && typeof parsed.ts === 'number' && Date.now() - parsed.ts < PENDING_SAVE_TTL_MS) {
            pending = parsed
          } else {
            window.sessionStorage.removeItem(pendingSaveKey(project.id))
          }
        }
      } catch { /* no-op */ }
    }

    fetch('/api/saved').then(async r => {
      if (cancelled) return
      if (r.status !== 200) return null
      const data = await r.json()
      const alreadySaved = (data.savedProjects ?? []).some((s: { projectId: string }) => s.projectId === project.id)
      if (alreadySaved) {
        setSaved(true)
        if (pending && typeof window !== 'undefined') {
          try { window.sessionStorage.removeItem(pendingSaveKey(project.id)) } catch {}
        }
        return null
      }
      if (pending) {
        try {
          const saveRes = await fetch('/api/saved', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: project.id }),
          })
          if (!cancelled && (saveRes.ok || saveRes.status === 409)) {
            setSaved(true)
            setShowSavedToast(true)
            setTimeout(() => { if (!cancelled) setShowSavedToast(false) }, 2000)
            window.dispatchEvent(new CustomEvent('saved-projects-updated'))
          }
        } catch { /* no-op */ }
        if (typeof window !== 'undefined') {
          try { window.sessionStorage.removeItem(pendingSaveKey(project.id)) } catch {}
        }
      }
      return null
    }).catch(() => {})
    return () => { cancelled = true }
  }, [project.id])

  const toggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (saving) return
    setSaving(true)
    const prev = saved
    setSaved(!saved)
    try {
      const res = await fetch('/api/saved', {
        method: prev ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id })
      })
      if (res.status === 401) {
        setSaved(prev)
        setShowSignInPrompt(true)
        setTimeout(() => setShowSignInPrompt(false), 4000)
      } else if (prev ? !res.ok : (!res.ok && res.status !== 409)) {
        setSaved(prev)
      } else {
        window.dispatchEvent(new CustomEvent('saved-projects-updated'))
      }
    } catch { setSaved(prev) }
    setSaving(false)
  }

  const possession = project.possessionDate
    ? new Date(project.possessionDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : 'TBD'

  const tagColor = project.decisionTag === 'Strong Buy' ? { bg: '#E1F5EE', text: '#085041', dot: '#34D399' }
    : project.decisionTag === 'Buy w/ Cond' ? { bg: '#E6F1FB', text: '#0C447C', dot: '#60A5FA' }
    : project.decisionTag === 'Wait' ? { bg: '#FAEEDA', text: '#633806', dot: '#FBBF24' }
    : { bg: '#FCEBEB', text: '#791F1F', dot: '#F87171' }

  return (
    <m.div
      initial={prefersReduced ? false : { opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      // 3D tilt removed (P3-WAVE-PARALLEL Agent A) — felt drunk on small
      // panels. Hover lift via shadow only.
      style={{
        background: 'var(--bg-surface-alt)',
        border: '1px solid var(--border)',
        boxShadow: hovered ? '0 20px 60px rgba(27,79,138,0.14)' : '0 4px 20px rgba(0,0,0,0.06)',
        transition: 'box-shadow 220ms ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative overflow-hidden rounded-2xl"
    >
      {/* Gradient accent top */}
      <div className="h-0.5 bg-gradient-to-r from-[#1B4F8A] via-[#3B82F6] to-[#1B4F8A]" />

      {/* Photo placeholder with gradient */}
      <div className="relative h-28 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1B3A6B 0%, #1B4F8A 50%, #2563EB 100%)' }}>
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="white"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><polyline points="9 22 9 12 15 12 15 22" fill="white"/></svg>
        </div>
        <m.div
          className="absolute inset-0 opacity-10"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', backgroundSize: '200% 100%' }}
          animate={{ backgroundPosition: hovered ? ['0% 0%', '200% 0%'] : '0% 0%' }}
          transition={{ duration: 1.5, ease: 'linear', repeat: hovered ? Infinity : 0 }}
        />
        {project.decisionTag && (
          <div className="absolute top-3 left-3">
            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: tagColor.bg, color: tagColor.text }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: tagColor.dot }} />
              {project.decisionTag}
            </span>
          </div>
        )}
        {/* Save button — saved state is now unmistakable: green pill + filled
            bookmark + checkmark badge. Saving state animates a strokeDashoffset
            sweep on the bookmark outline. */}
        <m.button
          type="button"
          onClick={toggleSave}
          disabled={saving}
          aria-label={saved ? 'Remove from saved' : saving ? 'Saving' : 'Save project'}
          aria-pressed={saved}
          whileTap={prefersReduced ? undefined : { scale: 0.85 }}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm ${FOCUS_RING}`}
          style={{
            background: saved ? '#0F6E56' : 'rgba(255,255,255,0.2)',
            border: `1px solid ${saved ? '#34D399' : 'rgba(255,255,255,0.3)'}`,
            boxShadow: saved ? '0 0 12px rgba(52,211,153,0.45)' : 'none',
            transition: 'background 200ms ease, box-shadow 200ms ease, border-color 200ms ease',
          }}
        >
          {saving ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <m.path
                d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"
                strokeDasharray="60"
                animate={prefersReduced ? undefined : { strokeDashoffset: [60, 0, -60] }}
                transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
              />
            </svg>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill={saved ? 'white' : 'none'} stroke="white" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
              </svg>
              {saved && (
                <span
                  aria-hidden
                  className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: '#FAFAF7', color: '#0F6E56', fontSize: 10, fontWeight: 800, boxShadow: '0 0 0 2px #0F6E56' }}
                >
                  ✓
                </span>
              )}
            </>
          )}
        </m.button>
        {showSignInPrompt && (
          <m.button
            type="button"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (typeof window !== 'undefined') {
                try {
                  window.sessionStorage.setItem(
                    pendingSaveKey(project.id),
                    JSON.stringify({ ts: Date.now() })
                  )
                } catch { /* no-op */ }
              }
              const callbackUrl = typeof window !== 'undefined' ? window.location.href : '/chat'
              signIn('google', { callbackUrl })
            }}
            aria-label="Sign in to save this project"
            className={`absolute top-12 right-3 px-2.5 py-1 rounded-full text-[10px] font-semibold backdrop-blur-sm shadow-md transition-opacity hover:opacity-90 ${FOCUS_RING}`}
            style={{ background: 'var(--bg-accent-green)', color: 'var(--text-accent-green)', border: '1px solid var(--border-accent-green)' }}
          >
            Sign in to save →
          </m.button>
        )}
        {showSavedToast && (
          <m.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            aria-label="Project saved"
            role="status"
            className="absolute top-12 right-3 px-2.5 py-1 rounded-full text-[10px] font-semibold backdrop-blur-sm shadow-md"
            style={{ background: 'var(--bg-accent-green)', color: 'var(--text-accent-green)', border: '1px solid var(--border-accent-green)' }}
          >
            Saved ✓
          </m.div>
        )}
        <div className="absolute bottom-3 left-3">
          <span className="text-[10px] font-medium text-white/70 uppercase tracking-wider">{project.microMarket}</span>
        </div>
      </div>

      <div className="p-4">
        <h2 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--text-primary)' }} className="text-[17px] font-semibold leading-tight mb-0.5">
          {project.projectName}
        </h2>
        <p className="text-[11px] mb-3" style={{ color: 'var(--text-secondary)' }}>{project.builderName}</p>

        {/* Price — 5-branch fallback unchanged */}
        {(() => {
          const hasPps = !!(project.pricePerSqft && project.pricePerSqft > 0)
          const hasRange = project.minPrice > 0 && project.maxPrice > 0
          const hasAllIn = !!(project.allInPrice && project.allInPrice > 0)
          const AllInBlock = hasAllIn ? (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2 rounded-xl px-3 py-2"
              style={{ background: 'var(--bg-accent-green)', border: '1px solid var(--border-accent-green)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-accent-green)' }}>ALL-IN</p>
                  <p className="text-[16px] font-bold" style={{ color: 'var(--text-accent-green)' }}>₹{Math.round((project.allInPrice ?? 0) / 100000)}L</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-accent-green-light)' }}>EMI ~</p>
                  <p className="text-[12px] font-semibold" style={{ color: 'var(--text-accent-green)' }}>₹{emi(project.allInPrice ?? 0).toLocaleString('en-IN')}/mo</p>
                </div>
              </div>
            </m.div>
          ) : null
          const NoteLine = project.priceNote ? (
            <p className="text-[10px] mt-1.5 italic" style={{ color: 'var(--text-secondary)' }}>{project.priceNote}</p>
          ) : null

          if (hasPps) {
            return (
              <div className="mb-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-[22px] font-bold text-[#1B4F8A]" style={{ fontFamily: 'var(--font-mono)' }}>
                    ₹{project.pricePerSqft!.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] text-[#A8A29E]">/sqft {project.pricePerSqftType ?? 'SBU'}</span>
                </div>
                {project.loadingFactor && (
                  <p className="text-[10px] text-[#A8A29E]">₹{Math.round(project.pricePerSqft! * (project.loadingFactor ?? 1.37)).toLocaleString('en-IN')}/sqft Carpet</p>
                )}
                {AllInBlock}
                {NoteLine}
              </div>
            )
          }
          if (hasRange) {
            const min = Math.round(project.minPrice / 100000)
            const max = Math.round(project.maxPrice / 100000)
            const label = min === max ? `₹${min}L` : `₹${min}–${max}L`
            return (
              <div className="mb-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-[22px] font-bold text-[#1B4F8A]" style={{ fontFamily: 'var(--font-mono)' }}>{label}</span>
                  <span className="text-[11px] text-[#A8A29E]">total</span>
                </div>
                {AllInBlock}
                {NoteLine}
              </div>
            )
          }
          if (hasAllIn) {
            return (
              <div className="mb-3">
                {AllInBlock}
                {NoteLine}
              </div>
            )
          }
          if (project.priceNote) {
            return (
              <p className="text-[13px] mb-3" style={{ color: 'var(--text-secondary)' }}>{project.priceNote}</p>
            )
          }
          return <p className="text-[13px] text-[#A8A29E] mb-3">Price on request</p>
        })()}

        {/* Meta row */}
        <div className="flex gap-2 mb-3 min-w-0">
          <div className="flex-1 rounded-lg px-2.5 py-2" style={{ background: 'var(--bg-subtle)' }}>
            <p className="text-[9px] uppercase tracking-wider text-[#A8A29E]">Possession</p>
            <p className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{possession}</p>
          </div>
          <div className="flex-1 rounded-lg px-2.5 py-2" style={{ background: 'var(--bg-subtle)' }}>
            <p className="text-[9px] uppercase tracking-wider text-[#A8A29E]">Status</p>
            <p className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{project.constructionStatus === 'Under Construction' ? 'UC' : 'RTM'}</p>
          </div>
          {project.configurations && (
            <div className="flex-1 rounded-lg px-2.5 py-2 min-w-0 overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
              <p className="text-[9px] uppercase tracking-wider text-[#A8A29E]">Config</p>
              <p className="text-[11px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{project.configurations.split(',')[0]?.trim()}</p>
            </div>
          )}
        </div>

        {/* Honest Concern — staggered entrance with subtle settle. */}
        {project.honestConcern && (
          <m.div
            initial={prefersReduced ? false : { opacity: 0, y: 6, rotateZ: -1 }}
            animate={{ opacity: 1, y: 0, rotateZ: 0 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 280, damping: 24 }}
            className="rounded-xl px-3 py-2.5 mb-3"
            style={{ background: 'var(--bg-accent-amber)', border: '1px solid var(--border-accent-amber)' }}
          >
            <p className="text-[9px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-accent-amber-title)' }}>⚠ Honest Concern</p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-accent-amber)' }}>{project.honestConcern}</p>
          </m.div>
        )}

        {/* Analyst note */}
        {project.analystNote && (
          <div className="rounded-xl px-3 py-2.5 mb-3" style={{ background: 'var(--bg-accent-blue)', border: '1px solid var(--border-accent-blue)' }}>
            <p className="text-[9px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-accent-blue-title)' }}>💡 Insider Note</p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-accent-blue)' }}>{project.analystNote}</p>
          </div>
        )}

        {/* Trust score bar — number races bar over 0.8s */}
        {project.trustScore && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#A8A29E' }}>Builder Trust</span>
              <span className="text-[9px] font-medium" style={{ color: '#1B4F8A' }}>
                <span className="font-mono">{trustNum}</span>/100 · Grade {project.trustGrade ?? (project.trustScore >= 80 ? 'A' : project.trustScore >= 65 ? 'B' : project.trustScore >= 50 ? 'C' : 'D')}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
              <m.div
                initial={prefersReduced ? false : { width: 0 }}
                animate={{ width: `${project.trustScore}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                className="h-full rounded-full"
                style={{ background: project.trustScore >= 80 ? '#0F6E56' : project.trustScore >= 65 ? '#1B4F8A' : '#F59E0B' }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <m.button
            type="button"
            whileHover={prefersReduced ? undefined : { scale: 1.02 }}
            whileTap={prefersReduced ? undefined : { scale: 0.97 }}
            onClick={() => window.dispatchEvent(new CustomEvent('book-visit', { detail: { projectId: project.id } }))}
            className={`flex-1 py-2.5 rounded-xl text-[12px] font-semibold text-white transition-all ${FOCUS_RING}`}
            style={{ background: 'linear-gradient(135deg, #1B4F8A, #2563EB)' }}
          >
            Book visit →
          </m.button>
          <m.button
            type="button"
            whileHover={prefersReduced ? undefined : { scale: 1.02 }}
            whileTap={prefersReduced ? undefined : { scale: 0.97 }}
            onClick={() => window.dispatchEvent(new CustomEvent('compare-project', { detail: { projectId: project.id } }))}
            className={`px-4 py-2.5 rounded-xl text-[12px] font-medium border transition-all ${FOCUS_RING}`}
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Compare
          </m.button>
        </div>
      </div>
    </m.div>
  )
}
