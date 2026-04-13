'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface SavedProject {
  id: string
  projectId: string
  project: {
    id: string
    projectName: string
    builderName: string
    microMarket: string
    minPrice: number
    maxPrice: number
    unitTypes: string[]
  }
  createdAt: string
}

interface VisitRequest {
  id: string
  projectName: string
  builderName: string
  visitDate: string
  status: 'pending' | 'confirmed' | 'completed'
  bookedAt: string
  visitToken?: string
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pending: { bg: 'rgba(196,155,80,0.10)', text: '#8B6914', dot: '#C49B50', label: 'Pending' },
  confirmed: { bg: 'rgba(27,79,138,0.10)', text: '#1B4F8A', dot: '#1B4F8A', label: 'Confirmed' },
  completed: { bg: 'rgba(15,110,86,0.10)', text: '#0F6E56', dot: '#0F6E56', label: 'Completed' },
}

export default function DashboardPage() {
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([])
  const [visitRequests, setVisitRequests] = useState<VisitRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      try {
        const [projectsRes, visitsRes] = await Promise.all([
          fetch('/api/saved'),
          fetch('/api/visit-requests'),
        ])
        const projects = await projectsRes.json()
        const visits = await visitsRes.json()
        if (cancelled) return
        setSavedProjects(projects?.savedProjects ?? [])
        const mapped = (visits ?? []).map((v: any) => ({
          id: v.id,
          projectName: v.project?.projectName ?? '—',
          builderName: v.project?.builderName ?? '—',
          visitDate: v.visitScheduledDate,
          status: v.visitCompleted ? 'completed' : v.otpVerified ? 'confirmed' : 'pending',
          bookedAt: v.createdAt,
          visitToken: v.visitToken,
        }))
        setVisitRequests(mapped)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-5 h-5 rounded-full"
          style={{ border: '2px solid var(--border)', borderTopColor: 'var(--text-primary)' }}
        />
      </main>
    )
  }

  return (
    <main className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg-base)', paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}>

      {/* Warm ambient background layers */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div
          className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(196,155,80,0.06) 0%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'warm-pulse 6s ease-in-out infinite',
          }}
        />
        <div
          className="absolute bottom-1/4 right-0 w-[400px] h-[400px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(27,79,138,0.04) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      {/* Top bar */}
      <div
        className="sticky top-0 z-20 backdrop-blur-md px-5 py-3 flex items-center gap-3"
        style={{
          background: 'color-mix(in srgb, var(--bg-base) 85%, transparent)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <Link
          href="/chat"
          className="flex items-center gap-1.5 transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-[13px]">Chat</span>
        </Link>
        <div className="flex-1" />
        <span className="text-[13px] font-medium tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Dashboard
        </span>
      </div>

      <div className="relative z-10 max-w-xl mx-auto px-5 pt-8">

        {/* Heading with gold accent */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-8"
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div style={{ width: 24, height: 1.5, background: 'linear-gradient(90deg, #C49B50, transparent)', borderRadius: 1 }} />
            <span className="text-[11px] uppercase tracking-[0.15em] font-medium" style={{ color: '#C49B50' }}>
              Your Journey
            </span>
          </div>
          <h1
            style={{ fontFamily: '"Playfair Display", Georgia, serif', color: 'var(--text-primary)' }}
            className="text-[32px] font-bold leading-[1.15] mb-1.5"
          >
            Property Journey
          </h1>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            Saved projects and upcoming visits
          </p>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="grid grid-cols-3 gap-3 mb-9"
        >
          {[
            { label: 'Saved', value: savedProjects.length, accent: '#C49B50' },
            { label: 'Visits', value: visitRequests.length, accent: '#1B4F8A' },
            { label: 'Active', value: visitRequests.filter(v => v.status !== 'completed').length, accent: '#0F6E56' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              className="relative rounded-2xl p-4 grain"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.04)',
              }}
            >
              <div
                className="absolute top-0 left-4 right-4 h-[1px]"
                style={{ background: `linear-gradient(90deg, transparent, ${stat.accent}30, transparent)` }}
              />
              <p className="text-[10px] uppercase tracking-[0.12em] mb-1.5" style={{ color: 'var(--text-muted)' }}>
                {stat.label}
              </p>
              <p className="text-[26px] font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
                {stat.value}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Saved Projects */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.14, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-9"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-1 h-4 rounded-full" style={{ background: '#C49B50' }} />
            <p className="text-[11px] uppercase tracking-[0.15em] font-medium" style={{ color: 'var(--text-muted)' }}>
              Saved Projects
            </p>
            {savedProjects.length > 0 && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(196,155,80,0.10)', color: '#C49B50' }}
              >
                {savedProjects.length}
              </span>
            )}
          </div>

          {savedProjects.length > 0 ? (
            <div className="space-y-3">
              {savedProjects.map((sp, i) => (
                <motion.div
                  key={sp.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.16 + i * 0.04 }}
                  className="group relative rounded-2xl p-4 transition-all duration-200 grain"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(196,155,80,0.25)'
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06), 0 0 0 1px rgba(196,155,80,0.08)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)'
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.04)'
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3
                        style={{ fontFamily: '"Playfair Display", Georgia, serif', color: 'var(--text-primary)' }}
                        className="text-[17px] leading-tight mb-0.5 truncate"
                      >
                        {sp.project.projectName}
                      </h3>
                      <p className="text-[12px] mb-2.5" style={{ color: 'var(--text-secondary)' }}>
                        {sp.project.builderName} · {sp.project.microMarket}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {sp.project.unitTypes.slice(0, 3).map((ut, j) => (
                          <span
                            key={j}
                            className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
                          >
                            {ut}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Link
                      href={`/projects/${sp.project.id}`}
                      className="flex-shrink-0 mt-1 flex items-center gap-1 text-[11px] transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#1B4F8A' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
                    >
                      View
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </Link>
                  </div>

                  <div
                    className="pt-2.5 flex items-center justify-between"
                    style={{ borderTop: '1px solid var(--border-subtle)' }}
                  >
                    <p className="text-[14px] font-semibold" style={{ color: '#1B4F8A' }}>
                      {sp.project.minPrice > 0 && sp.project.maxPrice > 0
                        ? `₹${Math.round(sp.project.minPrice / 100000)}L – ₹${Math.round(sp.project.maxPrice / 100000)}L`
                        : 'Price on request'}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      Saved {new Date(sp.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div
              className="rounded-2xl p-8 text-center grain"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <div
                className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{ background: 'rgba(196,155,80,0.08)' }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 2.25L10.85 6.95L16 7.5L12.25 10.8L13.3 15.75L9 13.25L4.7 15.75L5.75 10.8L2 7.5L7.15 6.95L9 2.25Z" stroke="#C49B50" strokeWidth="1.2" fill="none" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-[13px] mb-1.5" style={{ color: 'var(--text-secondary)' }}>No saved projects yet</p>
              <Link href="/chat" className="text-[12px] font-medium transition-colors" style={{ color: '#1B4F8A' }}>
                Start exploring →
              </Link>
            </div>
          )}
        </motion.section>

        {/* Site Visits */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-1 h-4 rounded-full" style={{ background: '#1B4F8A' }} />
            <p className="text-[11px] uppercase tracking-[0.15em] font-medium" style={{ color: 'var(--text-muted)' }}>
              Site Visits
            </p>
            {visitRequests.length > 0 && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(27,79,138,0.10)', color: '#1B4F8A' }}
              >
                {visitRequests.length}
              </span>
            )}
          </div>

          {visitRequests.length > 0 ? (
            <div className="space-y-3">
              {visitRequests.map((visit, i) => {
                const config = STATUS_CONFIG[visit.status] ?? STATUS_CONFIG.pending
                return (
                  <motion.div
                    key={visit.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.22 + i * 0.04 }}
                    className="relative rounded-2xl p-4 grain"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <h3
                          style={{ fontFamily: '"Playfair Display", Georgia, serif', color: 'var(--text-primary)' }}
                          className="text-[16px] leading-tight mb-0.5"
                        >
                          {visit.projectName}
                        </h3>
                        <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                          {visit.builderName}
                        </p>
                      </div>
                      <span
                        className="flex-shrink-0 flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full"
                        style={{ background: config.bg, color: config.text }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: config.dot }}
                        />
                        {config.label}
                      </span>
                    </div>

                    <div
                      className="pt-3 flex items-center justify-between"
                      style={{ borderTop: '1px solid var(--border-subtle)' }}
                    >
                      <div className="flex items-center gap-1.5">
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ color: 'var(--text-muted)' }}>
                          <rect x="1.5" y="2.5" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1"/>
                          <path d="M1.5 5.5H11.5" stroke="currentColor" strokeWidth="1"/>
                          <path d="M4 1V3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                          <path d="M9 1V3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                        </svg>
                        <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                          {new Date(visit.visitDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      {visit.visitToken && (
                        <p
                          className="text-[11px] font-mono font-medium px-2 py-0.5 rounded"
                          style={{ background: 'rgba(15,110,86,0.08)', color: '#0F6E56' }}
                        >
                          {visit.visitToken}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div
              className="rounded-2xl p-8 text-center grain"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <div
                className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{ background: 'rgba(27,79,138,0.08)' }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="2.5" y="3.5" width="13" height="12" rx="2" stroke="#1B4F8A" strokeWidth="1.2" fill="none"/>
                  <path d="M2.5 7.5H15.5" stroke="#1B4F8A" strokeWidth="1.2"/>
                  <path d="M6 1.5V4.5" stroke="#1B4F8A" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M12 1.5V4.5" stroke="#1B4F8A" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-[13px] mb-1.5" style={{ color: 'var(--text-secondary)' }}>No visits booked yet</p>
              <Link href="/chat" className="text-[12px] font-medium transition-colors" style={{ color: '#1B4F8A' }}>
                Book a site visit →
              </Link>
            </div>
          )}
        </motion.section>

      </div>

      {/* Fixed bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 backdrop-blur-md flex items-center justify-center"
        style={{
          background: 'color-mix(in srgb, var(--bg-surface) 90%, transparent)',
          borderTop: '1px solid var(--border-subtle)',
          padding: `12px 20px calc(12px + env(safe-area-inset-bottom, 0px))`,
        }}
      >
        <Link
          href="/chat"
          className="flex items-center gap-1.5 text-[13px] transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M12 7C12 9.76 9.76 12 7 12C5.93 12 4.95 11.65 4.15 11.06L2 12L2.94 9.85C2.34 9.05 2 8.07 2 7C2 4.24 4.24 2 7 2C9.76 2 12 4.24 12 7Z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round"/>
          </svg>
          Back to chat
        </Link>
      </div>

    </main>
  )
}
