'use client'

/**
 * /dashboard — Luxury warm-tone home for signed-in buyers.
 *
 * Sprint P2-DASHBOARD (2026-04-27): rewrites the legacy "var(--bg-base)"
 * dashboard into the sign-in extension aesthetic — ink black background,
 * gold-on-white serif headers, framer-motion staggered mounts, prefers-
 * reduced-motion respected.
 *
 * Header: this page renders its OWN sticky brand header. The shared
 * Navbar suppresses /dashboard via HIDE_PREFIXES to avoid double headers.
 *
 * Data: keeps the existing /api/saved + /api/visit-requests calls and the
 * shapes they return today. Adds /api/chat-sessions for "Recent
 * Conversations" — the route already exists (returns up to 20 sessions,
 * session-gated, returns [] for unauthed). All three calls are run in
 * parallel.
 */

import { useEffect, useState, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Calendar, MapPin, MessageSquare, ArrowRight, LogOut, Sparkles } from 'lucide-react'

/* ── Design tokens (warm ink + gold) ─────────────────────────────── */
const T = {
  bg: '#0A0A0A',
  surface: '#141414',
  surface2: '#1C1C1C',
  gold: '#B8860B',
  goldGlow: 'rgba(184,134,11,0.2)',
  goldBorder: 'rgba(184,134,11,0.25)',
  goldFaint: 'rgba(184,134,11,0.08)',
  text: '#FAFAF7',
  muted: '#737373',
  amber: '#F59E0B',
  blue: '#3B82F6',
  green: '#10B981',
  divider: 'rgba(184,134,11,0.15)',
} as const

// Layout.tsx loads Playfair Display via next/font and exposes
// var(--font-playfair). Apply it for the luxury serif headers; Georgia
// is the synchronous fallback so headers render serif immediately while
// the web font streams in (avoids the FOIT flash).
const SERIF = 'var(--font-playfair), Georgia, "Times New Roman", serif'
const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1]

/* ── Types (shape matches /api/saved + /api/visit-requests today) ── */
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

interface VisitRequestRaw {
  id: string
  project?: { id?: string; projectName?: string; builderName?: string }
  visitScheduledDate: string
  visitCompleted?: boolean
  otpVerified?: boolean
  createdAt: string
  visitToken?: string
}

interface VisitRequest {
  id: string
  projectId?: string
  projectName: string
  builderName: string
  visitDate: string
  status: 'pending' | 'confirmed' | 'completed'
  bookedAt: string
  visitToken?: string
}

interface ChatSessionLite {
  id: string
  buyerStage?: string | null
  lastMessageAt?: string | null
  customName?: string | null
  firstMessage?: string
}

type TimelineEvent = {
  kind: 'shortlist' | 'visit-request' | 'visit-complete'
  label: string
  ts: number
}

const STATUS_CONFIG: Record<VisitRequest['status'], { bg: string; fg: string; label: string }> = {
  pending: { bg: 'rgba(245,158,11,0.12)', fg: T.amber, label: 'Pending' },
  confirmed: { bg: 'rgba(59,130,246,0.12)', fg: T.blue, label: 'Confirmed' },
  completed: { bg: 'rgba(16,185,129,0.12)', fg: T.green, label: 'Completed' },
}

/* ── Time-ago helper ────────────────────────────────────────────── */
function timeAgo(iso: number | string): string {
  const ts = typeof iso === 'string' ? new Date(iso).getTime() : iso
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  const mo = Math.floor(d / 30)
  return `${mo}mo ago`
}

/* ── Price formatter (matches existing dashboard convention) ────── */
function formatPriceRange(min: number, max: number): string {
  if (!min || !max || min <= 0 || max <= 0) return 'Price on request'
  return `INR ${Math.round(min / 100000)}L – ${Math.round(max / 100000)}L`
}

/* ── First-name helper from session ─────────────────────────────── */
function firstName(name?: string | null, email?: string | null): string {
  if (name) return name.split(' ')[0]
  if (email) return email.split('@')[0]
  return 'there'
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const prefersReduced = useReducedMotion()

  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([])
  const [visitRequests, setVisitRequests] = useState<VisitRequest[]>([])
  const [chatSessions, setChatSessions] = useState<ChatSessionLite[]>([])
  const [loading, setLoading] = useState(true)

  /* Auth gate: bounce to sign-in if unauthenticated. */
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin')
    }
  }, [status, router])

  /* Parallel data fetch — preserve the three existing endpoints. */
  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false
    const fetchData = async () => {
      try {
        const [savedRes, visitsRes, chatsRes] = await Promise.all([
          fetch('/api/saved'),
          fetch('/api/visit-requests'),
          fetch('/api/chat-sessions'),
        ])
        const savedJson = await savedRes.json().catch(() => ({}))
        const visitsJson = await visitsRes.json().catch(() => [])
        const chatsJson = await chatsRes.json().catch(() => [])
        if (cancelled) return

        setSavedProjects(savedJson?.savedProjects ?? [])

        const mappedVisits: VisitRequest[] = (Array.isArray(visitsJson) ? visitsJson : []).map((v: VisitRequestRaw) => ({
          id: v.id,
          projectId: v.project?.id,
          projectName: v.project?.projectName ?? '—',
          builderName: v.project?.builderName ?? '—',
          visitDate: v.visitScheduledDate,
          status: v.visitCompleted ? 'completed' : v.otpVerified ? 'confirmed' : 'pending',
          bookedAt: v.createdAt,
          visitToken: v.visitToken,
        }))
        setVisitRequests(mappedVisits)

        setChatSessions(Array.isArray(chatsJson) ? chatsJson : [])
      } catch (err) {
        // Silent — empty states will render. Errors here are not user-actionable.
        console.error('[dashboard] fetch error', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [status])

  /* Activity timeline derived from saved + visits. Top 8, desc by ts. */
  const timeline: TimelineEvent[] = useMemo(() => {
    const events: TimelineEvent[] = []
    for (const sp of savedProjects) {
      events.push({
        kind: 'shortlist',
        label: `Shortlisted ${sp.project.projectName}`,
        ts: new Date(sp.createdAt).getTime(),
      })
    }
    for (const v of visitRequests) {
      events.push({
        kind: 'visit-request',
        label: `Visit requested: ${v.projectName}`,
        ts: new Date(v.bookedAt).getTime(),
      })
      if (v.status === 'completed') {
        events.push({
          kind: 'visit-complete',
          label: `Visit completed: ${v.projectName}`,
          ts: new Date(v.visitDate).getTime(),
        })
      }
    }
    return events.sort((a, b) => b.ts - a.ts).slice(0, 8)
  }, [savedProjects, visitRequests])

  /* Reduced-motion: collapse durations to 0. */
  const D = prefersReduced ? 0 : 0.6
  const D_FAST = prefersReduced ? 0 : 0.4
  const STAGGER = prefersReduced ? 0 : 0.08

  /* Loading splash — matches sign-in vibe. */
  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ background: T.bg }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: prefersReduced ? 0 : 0.4 }}
          className="flex flex-col items-center gap-3"
        >
          <div
            className="h-px w-8"
            style={{ background: T.gold, opacity: 0.6 }}
          />
          <p
            className="text-[11px] uppercase"
            style={{ color: T.muted, letterSpacing: '0.25em', fontFamily: SERIF }}
          >
            Loading
          </p>
        </motion.div>
      </main>
    )
  }

  // status === 'unauthenticated' is handled by useEffect redirect above; render nothing
  if (status !== 'authenticated') return null

  const fname = firstName(session?.user?.name, session?.user?.email)
  const userImg = session?.user?.image
  const userInitial = fname.charAt(0).toUpperCase()

  return (
    <main
      className="min-h-screen relative"
      style={{ background: T.bg, color: T.text, fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
    >
      {/* Ambient warm radial — subtle, behind everything */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: `radial-gradient(600px circle at 20% 0%, ${T.goldFaint}, transparent 60%), radial-gradient(500px circle at 90% 100%, rgba(184,134,11,0.04), transparent 60%)`,
          zIndex: 0,
        }}
      />

      {/* ─── Sticky header (brand-extended) ─────────────────────── */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: 'rgba(10,10,10,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${T.divider}`,
        }}
      >
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-4 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link href="/" className="flex items-baseline">
            <span style={{ fontFamily: SERIF, fontSize: 20, color: T.gold, letterSpacing: '-0.01em' }}>
              Homesty
            </span>
            <span style={{ fontFamily: SERIF, fontSize: 20, color: T.muted, letterSpacing: '-0.01em' }}>
              .ai
            </span>
          </Link>

          {/* Center location line — md+ only */}
          <p
            className="hidden md:block"
            style={{
              fontSize: 10,
              color: T.gold,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              fontWeight: 500,
            }}
          >
            South Bopal · Shela · Ahmedabad
          </p>

          {/* Right: avatar + name + sign out */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5">
              <span
                className="flex items-center justify-center rounded-full overflow-hidden"
                style={{
                  width: 28,
                  height: 28,
                  border: `1px solid ${T.goldBorder}`,
                  background: T.surface,
                  color: T.gold,
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: SERIF,
                }}
                aria-hidden
              >
                {userImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userImg} alt="" className="h-full w-full object-cover" />
                ) : (
                  userInitial
                )}
              </span>
              <span
                style={{ fontSize: 13, color: T.text }}
                className="truncate max-w-[140px]"
              >
                {fname}
              </span>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors"
              style={{
                fontSize: 12,
                color: T.muted,
                border: `1px solid ${T.divider}`,
                background: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = T.gold
                e.currentTarget.style.borderColor = T.goldBorder
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = T.muted
                e.currentTarget.style.borderColor = T.divider
              }}
            >
              <LogOut size={12} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* ─── Body ──────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-6xl mx-auto px-5 md:px-8 py-10 md:py-14">

        {/* Hero greeting */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: D, ease: EASE_OUT_EXPO }}
          className="mb-12 md:mb-16"
        >
          <h1
            className="leading-[1.1]"
            style={{
              fontFamily: SERIF,
              fontSize: 'clamp(28px, 5vw, 36px)',
              color: T.text,
              fontWeight: 400,
              letterSpacing: '-0.01em',
            }}
          >
            Namaste, <span style={{ color: T.gold }}>{fname}</span>.
          </h1>
          <p
            className="mt-3"
            style={{ fontSize: 14, color: T.muted, lineHeight: 1.6 }}
          >
            Aapka shortlist aur recent activity yahan hai.
          </p>
        </motion.section>

        {/* 2-column main grid: shortlist+visits left (60%), timeline right (40%) on md+ */}
        <div className="grid gap-10 md:gap-12 md:grid-cols-[3fr_2fr]">

          {/* ─── Left column ─────────────────────── */}
          <div className="flex flex-col gap-12">

            {/* Shortlisted Projects */}
            <section>
              <SectionHeader label="Shortlisted Projects" count={savedProjects.length} />

              {savedProjects.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 mt-6">
                  {savedProjects.map((sp, i) => (
                    <motion.article
                      key={sp.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: D_FAST,
                        delay: i * STAGGER,
                        type: prefersReduced ? 'tween' : 'spring',
                        damping: 20,
                      }}
                      whileHover={prefersReduced ? undefined : { scale: 1.01, boxShadow: `0 0 0 1px ${T.goldBorder}, 0 8px 24px rgba(184,134,11,0.08)` }}
                      className="rounded-xl p-5 flex flex-col gap-3"
                      style={{
                        background: T.surface,
                        border: `1px solid ${T.divider}`,
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            fontFamily: SERIF,
                            fontSize: 18,
                            color: T.gold,
                            fontWeight: 500,
                            lineHeight: 1.2,
                          }}
                        >
                          {sp.project.projectName}
                        </h3>
                        <p style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
                          {sp.project.builderName} · {sp.project.microMarket}
                        </p>
                      </div>

                      <p
                        style={{
                          fontFamily: SERIF,
                          fontSize: 22,
                          color: T.text,
                          fontWeight: 400,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {formatPriceRange(sp.project.minPrice, sp.project.maxPrice)}
                      </p>

                      {/* TODO: API /api/saved doesn't currently return honestConcern,
                          decisionTag, or builder.grade. Surface them once the API
                          select includes those fields. */}

                      <div className="flex flex-wrap gap-1.5">
                        {sp.project.unitTypes.slice(0, 3).map((ut, j) => (
                          <span
                            key={j}
                            className="rounded-full px-2 py-0.5"
                            style={{
                              fontSize: 10,
                              color: T.muted,
                              background: T.surface2,
                              border: `1px solid ${T.divider}`,
                            }}
                          >
                            {ut}
                          </span>
                        ))}
                      </div>

                      <div
                        className="flex items-center gap-3 pt-3 mt-1"
                        style={{ borderTop: `1px solid ${T.divider}` }}
                      >
                        <Link
                          href={`/projects/${sp.project.id}`}
                          className="inline-flex items-center gap-1 transition-colors"
                          style={{ fontSize: 12, color: T.muted }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = T.gold }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = T.muted }}
                        >
                          View project <ArrowRight size={11} />
                        </Link>
                        <span style={{ width: 1, height: 12, background: T.divider }} aria-hidden />
                        <Link
                          href="/chat"
                          className="inline-flex items-center gap-1 transition-colors"
                          style={{ fontSize: 12, color: T.muted }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = T.gold }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = T.muted }}
                        >
                          Chat about this <ArrowRight size={11} />
                        </Link>
                      </div>
                    </motion.article>
                  ))}
                </div>
              ) : (
                <EmptyShortlist prefersReduced={!!prefersReduced} />
              )}
            </section>

            {/* Site Visits */}
            <section>
              <SectionHeader label="Site Visits" count={visitRequests.length} accent={T.blue} />

              {visitRequests.length > 0 ? (
                <ul className="flex flex-col gap-2 mt-6">
                  {visitRequests.map((v, i) => {
                    const cfg = STATUS_CONFIG[v.status]
                    return (
                      <motion.li
                        key={v.id}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: D_FAST, delay: i * (prefersReduced ? 0 : 0.06), ease: EASE_OUT_EXPO }}
                        className="rounded-lg px-4 py-3 flex items-center gap-3 flex-wrap"
                        style={{
                          background: T.surface,
                          border: `1px solid ${T.divider}`,
                        }}
                      >
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5"
                          style={{
                            background: cfg.bg,
                            color: cfg.fg,
                            fontSize: 10,
                            fontWeight: 500,
                            letterSpacing: '0.04em',
                          }}
                        >
                          <span
                            className="rounded-full"
                            style={{ width: 6, height: 6, background: cfg.fg }}
                          />
                          {cfg.label}
                        </span>
                        <span
                          style={{ fontFamily: SERIF, fontSize: 15, color: T.text }}
                          className="truncate max-w-[260px]"
                        >
                          {v.projectName}
                        </span>
                        <span className="inline-flex items-center gap-1" style={{ fontSize: 12, color: T.muted }}>
                          <Calendar size={11} />
                          {new Date(v.visitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {v.status === 'confirmed' && v.visitToken && (
                          <span
                            className="ml-auto rounded px-2 py-0.5 font-mono"
                            style={{ fontSize: 11, color: T.gold, background: T.goldFaint, letterSpacing: '0.05em' }}
                          >
                            {v.visitToken}
                          </span>
                        )}
                      </motion.li>
                    )
                  })}
                </ul>
              ) : (
                <EmptyVisits prefersReduced={!!prefersReduced} />
              )}
            </section>

            {/* Recent Conversations — only render if API returned anything */}
            <section>
              <SectionHeader label="Recent Conversations" count={chatSessions.length} accent={T.gold} />

              {chatSessions.length > 0 ? (
                <ul className="flex flex-col gap-2 mt-6">
                  {chatSessions.slice(0, 5).map((s, i) => {
                    const title = s.customName?.trim()
                      || (s.firstMessage ? s.firstMessage.slice(0, 60) : 'Conversation')
                    return (
                      <motion.li
                        key={s.id}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: D_FAST, delay: i * (prefersReduced ? 0 : 0.06), ease: EASE_OUT_EXPO }}
                      >
                        <Link
                          href="/chat"
                          className="group rounded-lg px-4 py-3 flex items-center gap-3 transition-colors"
                          style={{
                            background: T.surface,
                            border: `1px solid ${T.divider}`,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.goldBorder }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.divider }}
                        >
                          <MessageSquare size={14} style={{ color: T.gold, flexShrink: 0 }} />
                          <span
                            style={{ fontFamily: SERIF, fontSize: 14, color: T.text }}
                            className="truncate flex-1"
                          >
                            {title}
                          </span>
                          {s.lastMessageAt && (
                            <span style={{ fontSize: 11, color: T.muted }}>
                              {timeAgo(s.lastMessageAt)}
                            </span>
                          )}
                          <ArrowRight size={12} style={{ color: T.muted }} />
                        </Link>
                      </motion.li>
                    )
                  })}
                </ul>
              ) : (
                <div
                  className="rounded-xl px-5 py-8 text-center mt-6"
                  style={{ background: T.surface, border: `1px solid ${T.divider}` }}
                >
                  <p style={{ fontSize: 13, color: T.muted }}>
                    Recent conversations coming soon
                  </p>
                </div>
              )}
            </section>

          </div>

          {/* ─── Right column: timeline ─────────────────────── */}
          <aside>
            <SectionHeader label="Activity" count={timeline.length} accent={T.gold} />

            {timeline.length > 0 ? (
              <ol
                className="relative mt-6 pl-5"
                style={{ borderLeft: `1px solid ${T.divider}` }}
              >
                {timeline.map((e, i) => (
                  <motion.li
                    key={`${e.kind}-${e.ts}-${i}`}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: D_FAST, delay: i * (prefersReduced ? 0 : 0.07), ease: EASE_OUT_EXPO }}
                    className="relative pb-5 last:pb-0"
                  >
                    {/* dot */}
                    <span
                      aria-hidden
                      className="absolute rounded-full"
                      style={{
                        left: -23,
                        top: 4,
                        width: 6,
                        height: 6,
                        background: T.gold,
                        boxShadow: `0 0 0 3px ${T.bg}, 0 0 8px ${T.goldGlow}`,
                      }}
                    />
                    <p style={{ fontSize: 13, color: T.text, lineHeight: 1.4 }}>
                      {e.label}
                    </p>
                    <p style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                      {timeAgo(e.ts)}
                    </p>
                  </motion.li>
                ))}
              </ol>
            ) : (
              <div
                className="rounded-xl px-5 py-8 text-center mt-6"
                style={{ background: T.surface, border: `1px solid ${T.divider}` }}
              >
                <p style={{ fontSize: 13, color: T.muted }}>
                  No activity yet
                </p>
              </div>
            )}
          </aside>
        </div>

        {/* Footer breath line */}
        <div
          className="mt-16 pt-8 flex items-center justify-between gap-4 flex-wrap"
          style={{ borderTop: `1px solid ${T.divider}` }}
        >
          <p
            style={{
              fontSize: 10,
              color: T.muted,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
            }}
          >
            <MapPin size={10} className="inline mr-1.5" style={{ color: T.gold }} />
            South Bopal · Shela
          </p>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-full px-5 py-2 transition-all"
            style={{
              fontSize: 13,
              color: T.gold,
              border: `1px solid ${T.goldBorder}`,
              background: T.goldFaint,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = T.gold
              e.currentTarget.style.color = T.bg
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = T.goldFaint
              e.currentTarget.style.color = T.gold
            }}
          >
            Continue chatting <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* keyframes for empty-state gold pulse */}
      <style jsx>{`
        @keyframes goldPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(184,134,11,0); }
          50%      { box-shadow: 0 0 0 8px rgba(184,134,11,0.5); }
        }
      `}</style>
    </main>
  )
}

/* ── Section header (small-caps gold tag) ───────────────────────── */
function SectionHeader({ label, count, accent = T.gold }: { label: string; count?: number; accent?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        style={{
          fontSize: 13,
          color: accent,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          fontWeight: 500,
          fontFamily: SERIF,
        }}
      >
        {label}
      </span>
      {typeof count === 'number' && count > 0 && (
        <span
          className="rounded-full px-1.5 py-0"
          style={{
            fontSize: 10,
            color: accent,
            background: 'rgba(184,134,11,0.08)',
            border: `1px solid ${T.divider}`,
            minWidth: 18,
            textAlign: 'center',
          }}
        >
          {count}
        </span>
      )}
      <div className="flex-1 h-px" style={{ background: T.divider }} />
    </div>
  )
}

/* ── Empty states ─────────────────────────────────────────────── */
function EmptyShortlist({ prefersReduced }: { prefersReduced: boolean }) {
  return (
    <div
      className="rounded-xl px-6 py-10 text-center mt-6"
      style={{ background: T.surface, border: `1px solid ${T.divider}` }}
    >
      <Sparkles size={20} className="mx-auto mb-4" style={{ color: T.gold }} />
      <p style={{ fontSize: 14, color: T.text, marginBottom: 4 }}>
        Koi project shortlist nahi kiya abhi tak.
      </p>
      <p style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>
        Tell Homesty AI what you need — get honest matches.
      </p>
      <Link
        href="/chat"
        className="inline-flex items-center gap-2 rounded-full px-5 py-2 transition-all"
        style={{
          fontSize: 13,
          color: T.bg,
          background: T.gold,
          fontWeight: 500,
          animation: prefersReduced ? undefined : 'goldPulse 2.5s ease-in-out infinite',
        }}
      >
        Begin your HomeSearch <ArrowRight size={12} />
      </Link>
    </div>
  )
}

function EmptyVisits({ prefersReduced }: { prefersReduced: boolean }) {
  return (
    <div
      className="rounded-xl px-6 py-8 text-center mt-6"
      style={{ background: T.surface, border: `1px solid ${T.divider}` }}
    >
      <Calendar size={18} className="mx-auto mb-3" style={{ color: T.muted }} />
      <p style={{ fontSize: 13, color: T.muted, marginBottom: 12 }}>
        Koi visit book nahi hua abhi.
      </p>
      <Link
        href="/chat"
        className="inline-flex items-center gap-1.5 transition-colors"
        style={{
          fontSize: 12,
          color: T.gold,
          animation: prefersReduced ? undefined : undefined,
        }}
      >
        Book a site visit <ArrowRight size={11} />
      </Link>
    </div>
  )
}
