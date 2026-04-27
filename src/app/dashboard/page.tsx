'use client'

/**
 * /dashboard — Warm luxury editorial home for signed-in buyers.
 *
 * Sprint P2-DASHBOARD-SITE-REVAMP (2026-04-27): full rewrite. Replaces the
 * earlier 826-line dashboard with a tight single-scroll layout — sticky
 * brand header, greeting, shortlisted projects, recent chats, footer.
 * No timeline, no visits section, no static placeholder text or links.
 *
 * Header note: this page renders its OWN sticky brand header. The shared
 * Navbar suppresses /dashboard via HIDE_PREFIXES to avoid a double header.
 *
 * Data: keeps the existing /api/saved + /api/chat-sessions endpoints. The
 * /api/saved SELECT was widened in this sprint to include pricePerSqft,
 * possessionDate, constructionStatus, decisionTag, honestConcern, and
 * builder.grade so cards can render the full luxury editorial layout.
 */

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { ArrowRight, LogOut, Star } from 'lucide-react'

/* ── Design tokens (warm luxury — private-banker aesthetic) ──────── */
const T = {
  bg: '#0A0A0A',
  surface: '#111111',
  card: '#161616',
  cardHover: '#1C1C1C',
  gold: '#B8860B',
  goldLight: 'rgba(184,134,11,0.12)',
  goldBorder: 'rgba(184,134,11,0.2)',
  goldBorderHover: 'rgba(184,134,11,0.4)',
  text: '#F5F0E8',
  muted: '#6B6B6B',
  amber: '#D97706',
  divider: 'rgba(184,134,11,0.15)',
} as const

// Layout exposes Playfair Display via next/font as var(--font-playfair).
// Georgia is the synchronous fallback so headers render as serif while the
// web font streams in (avoids the FOIT flash).
const SERIF = 'var(--font-playfair), "Playfair Display", Georgia, "Times New Roman", serif'
const SANS = 'var(--font-geist-sans), "Geist", system-ui, sans-serif'
const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1]

/* ── Types matching /api/saved + /api/chat-sessions ──────────────── */
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
    pricePerSqft: number | null
    possessionDate: string | null
    constructionStatus: string | null
    decisionTag: string | null
    honestConcern: string | null
    builder?: { grade: string | null } | null
  }
  createdAt: string
}

interface ChatSessionLite {
  id: string
  buyerStage?: string | null
  lastMessageAt?: string | null
  customName?: string | null
  firstMessage?: string
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function timeAgo(iso: number | string): string {
  const ts = typeof iso === 'string' ? new Date(iso).getTime() : iso
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d`
  const mo = Math.floor(d / 30)
  return `${mo}mo`
}

function formatPossession(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

function shortStatus(s: string | null): string {
  if (!s) return '—'
  if (s.toLowerCase().includes('ready')) return 'RTM'
  if (s.toLowerCase().includes('under')) return 'UC'
  return s
}

function firstName(name?: string | null, email?: string | null): string {
  if (name) return name.split(' ')[0]
  if (email) return email.split('@')[0]
  return 'there'
}

/* Stage → status chip (Recent Chats). Maps the `buyerStage` enum-ish string
 * we persist to a short user-facing label and a colour so buyers see at a
 * glance which thread is closest to a decision. */
function chatStatusChip(stage?: string | null): { label: string; bg: string; fg: string } {
  if (stage === 'comparison' || stage === 'visit_trigger' || stage === 'pre_visit' || stage === 'post_visit') {
    return { label: 'Comparing', bg: T.gold, fg: '#0A0A0A' }
  }
  if (stage === 'qualification' || stage === 'project_disclosure') {
    return { label: 'Qualified', bg: 'rgba(16,185,129,0.15)', fg: '#34D399' }
  }
  return { label: 'Exploring', bg: T.surface, fg: T.muted }
}

/* Decision-tag pill colours — kept warm-tone consistent with the rest of
 * the surface (no green/red traffic-light). Strong Buy = gold accent. */
function tagColors(tag: string | null): { bg: string; fg: string } | null {
  if (!tag) return null
  if (tag.toLowerCase().includes('strong')) return { bg: T.goldLight, fg: T.gold }
  if (tag.toLowerCase().includes('buy')) return { bg: 'rgba(59,130,246,0.12)', fg: '#60A5FA' }
  if (tag.toLowerCase().includes('wait')) return { bg: 'rgba(217,119,6,0.12)', fg: T.amber }
  if (tag.toLowerCase().includes('avoid')) return { bg: 'rgba(248,113,113,0.10)', fg: '#F87171' }
  return { bg: T.surface, fg: T.muted }
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const prefersReduced = useReducedMotion()

  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([])
  const [chatSessions, setChatSessions] = useState<ChatSessionLite[]>([])
  const [loading, setLoading] = useState(true)

  /* Auth gate: bounce to sign-in if unauthenticated. */
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/auth/signin')
  }, [status, router])

  /* Parallel data fetch — only the two endpoints we actually render. */
  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false
    ;(async () => {
      try {
        const [savedRes, chatsRes] = await Promise.all([
          fetch('/api/saved'),
          fetch('/api/chat-sessions'),
        ])
        const savedJson = await savedRes.json().catch(() => ({}))
        const chatsJson = await chatsRes.json().catch(() => [])
        if (cancelled) return
        setSavedProjects(savedJson?.savedProjects ?? [])
        setChatSessions(Array.isArray(chatsJson) ? chatsJson : [])
      } catch (err) {
        // Empty states render — errors here aren't user-actionable.
        console.error('[dashboard] fetch error', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [status])

  /* Reduced-motion: collapse all entrance animations. */
  const initialFade = prefersReduced ? false : { opacity: 0, y: 12 }
  const initialCard = prefersReduced ? false : { opacity: 0, y: 16 }
  const initialRow = prefersReduced ? false : { opacity: 0, x: -12 }

  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: T.bg }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-px w-8" style={{ background: T.gold, opacity: 0.6 }} />
          <p className="text-[11px] uppercase" style={{ color: T.muted, letterSpacing: '0.25em', fontFamily: SERIF }}>
            Loading
          </p>
        </div>
      </main>
    )
  }

  if (status !== 'authenticated') return null

  const fname = firstName(session?.user?.name, session?.user?.email)
  const userImg = session?.user?.image
  const userInitial = fname.charAt(0).toUpperCase()
  const savedCount = savedProjects.length

  return (
    <main className="min-h-screen relative" style={{ background: T.bg, color: T.text, fontFamily: SANS }}>
      {/* ─── Sticky brand header (40px tall, very tight) ────────── */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: 'rgba(10,10,10,0.9)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: `1px solid rgba(184,134,11,0.15)`,
        }}
      >
        <div className="max-w-5xl mx-auto px-5 md:px-8 h-10 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-baseline gap-px" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: SERIF, fontSize: 18, color: T.gold, letterSpacing: '-0.01em' }}>Homesty</span>
            <span style={{ fontFamily: SERIF, fontSize: 18, color: T.muted, letterSpacing: '-0.01em' }}>.ai</span>
          </Link>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 12, color: T.text }} className="hidden sm:inline truncate max-w-[120px]">
              {fname}
            </span>
            <span
              className="flex items-center justify-center rounded-full overflow-hidden"
              style={{
                width: 22,
                height: 22,
                border: `1px solid ${T.goldBorder}`,
                background: T.surface,
                color: T.gold,
                fontSize: 10,
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
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="inline-flex items-center gap-1 transition-colors"
              style={{ fontSize: 11, color: T.muted, background: 'transparent' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = T.gold }}
              onMouseLeave={(e) => { e.currentTarget.style.color = T.muted }}
            >
              <LogOut size={11} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* ─── Body ───────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-5 md:px-8 py-12 md:py-16">

        {/* Greeting (120px region) */}
        <motion.section
          initial={initialFade}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReduced ? 0 : 0.5, ease: EASE_OUT_EXPO }}
          className="mb-12"
          style={{ minHeight: 96 }}
        >
          <h1
            style={{
              fontFamily: SERIF,
              fontSize: 'clamp(28px, 4.5vw, 32px)',
              color: T.text,
              fontWeight: 500,
              letterSpacing: '-0.01em',
              lineHeight: 1.15,
            }}
          >
            Namaste, <span style={{ color: T.gold }}>{fname}</span>.
          </h1>
          <p className="mt-2.5" style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
            Aapka shortlist · {savedCount} project{savedCount === 1 ? '' : 's'} saved
          </p>
        </motion.section>

        {/* Shortlisted projects */}
        <section className="mb-16">
          <SectionLabel>Shortlisted</SectionLabel>
          {savedProjects.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 mt-5">
              {savedProjects.map((sp, i) => (
                <ProjectCard
                  key={sp.id}
                  sp={sp}
                  index={i}
                  prefersReduced={!!prefersReduced}
                  initialCard={initialCard}
                />
              ))}
            </div>
          ) : (
            <EmptyShortlist prefersReduced={!!prefersReduced} />
          )}
        </section>

        {/* Recent conversations */}
        {chatSessions.length > 0 && (
          <section className="mb-16">
            <SectionLabel>Recent Chats</SectionLabel>
            <ul className="flex flex-col gap-2 mt-5">
              {chatSessions.slice(0, 5).map((s, i) => {
                const chip = chatStatusChip(s.buyerStage)
                const title = (s.customName?.trim() || s.firstMessage || 'Conversation').slice(0, 45)
                const preview = (s.firstMessage ?? '').slice(0, 60)
                return (
                  <motion.li
                    key={s.id}
                    initial={initialRow}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: prefersReduced ? 0 : 0.4,
                      delay: prefersReduced ? 0 : i * 0.05,
                      ease: EASE_OUT_EXPO,
                    }}
                  >
                    <Link
                      href={`/chat?session=${s.id}`}
                      className="group flex items-start gap-3 rounded-lg px-4 py-3 transition-colors"
                      style={{ background: T.card, border: `1px solid ${T.divider}`, textDecoration: 'none' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = T.cardHover }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = T.card }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            style={{ fontFamily: SERIF, fontSize: 14, color: T.text }}
                            className="truncate"
                          >
                            {title}
                          </span>
                          <span
                            className="inline-flex shrink-0 items-center rounded-full px-1.5 py-px"
                            style={{
                              fontSize: 10,
                              color: chip.fg,
                              background: chip.bg,
                              fontWeight: 500,
                              letterSpacing: '0.04em',
                            }}
                          >
                            {chip.label}
                          </span>
                        </div>
                        {preview && (
                          <p
                            className="truncate"
                            style={{ fontSize: 11, color: T.muted, lineHeight: 1.4 }}
                          >
                            {preview}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {s.lastMessageAt && (
                          <span style={{ fontSize: 11, color: T.muted }}>{timeAgo(s.lastMessageAt)}</span>
                        )}
                        <span
                          className="inline-flex items-center gap-1 transition-colors"
                          style={{ fontSize: 11, color: T.muted }}
                        >
                          Continue <ArrowRight size={11} />
                        </span>
                      </div>
                    </Link>
                  </motion.li>
                )
              })}
            </ul>
          </section>
        )}

        {/* Footer (minimal) */}
        <footer
          className="pt-8 mt-12 text-center"
          style={{ borderTop: `1px solid ${T.divider}` }}
        >
          <p style={{ fontSize: 11, color: T.muted }}>
            © 2026 Homesty AI Technology LLP
          </p>
        </footer>
      </div>

      {/* keyframes for empty-state gold pulse */}
      <style jsx>{`
        @keyframes goldPulse {
          0%, 100% { box-shadow: 0 0 0 rgba(184,134,11,0); }
          50%      { box-shadow: 0 0 20px rgba(184,134,11,0.4); }
        }
      `}</style>
    </main>
  )
}

/* ── Section label (10px wide-tracked gold, small caps) ──────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span
        style={{
          fontSize: 10,
          color: T.gold,
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          fontWeight: 600,
        }}
      >
        {children}
      </span>
      <div className="flex-1 h-px" style={{ background: T.divider }} />
    </div>
  )
}

/* ── Project card ────────────────────────────────────────────────── */
function ProjectCard({
  sp,
  index,
  prefersReduced,
  initialCard,
}: {
  sp: SavedProject
  index: number
  prefersReduced: boolean
  initialCard: false | { opacity: number; y: number }
}) {
  const p = sp.project
  const tag = tagColors(p.decisionTag)
  const grade = p.builder?.grade
  const possession = formatPossession(p.possessionDate)
  const statusShort = shortStatus(p.constructionStatus)
  const ppsft = p.pricePerSqft && p.pricePerSqft > 0
    ? `₹${p.pricePerSqft.toLocaleString('en-IN')}/sqft`
    : null

  return (
    <motion.article
      initial={initialCard}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: prefersReduced ? 0 : index * 0.07,
        type: prefersReduced ? 'tween' : 'spring',
        damping: 22,
        stiffness: 300,
        duration: prefersReduced ? 0 : 0.45,
      }}
      whileHover={prefersReduced ? undefined : { borderColor: T.goldBorderHover }}
      className="rounded-xl p-5"
      style={{
        background: T.card,
        border: `1px solid ${T.goldBorder}`,
      }}
    >
      {/* Top row: tag + grade + saved star */}
      <div className="flex items-center gap-2 mb-4">
        {tag && p.decisionTag && (
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5"
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: tag.fg,
              background: tag.bg,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {p.decisionTag}
          </span>
        )}
        {grade && (
          <span
            className="inline-flex items-center justify-center rounded px-1.5 py-0.5"
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: T.gold,
              background: T.goldLight,
              letterSpacing: '0.05em',
              minWidth: 18,
            }}
          >
            {grade}
          </span>
        )}
        <Star size={12} className="ml-auto" style={{ color: T.gold, fill: T.gold }} aria-hidden />
      </div>

      {/* Project name */}
      <h3
        style={{
          fontFamily: SERIF,
          fontSize: 18,
          color: T.gold,
          fontWeight: 500,
          lineHeight: 1.25,
          letterSpacing: '-0.005em',
        }}
      >
        {p.projectName}
      </h3>

      {/* Builder · area  |  ₹/sqft */}
      <div className="flex items-baseline justify-between gap-3 mt-2">
        <p
          className="truncate"
          style={{ fontSize: 11, color: T.muted, lineHeight: 1.4 }}
        >
          {p.builderName} · {p.microMarket}
        </p>
        {ppsft && (
          <p
            className="shrink-0"
            style={{
              fontSize: 13,
              color: T.text,
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {ppsft}
          </p>
        )}
      </div>

      {/* Possession + status */}
      <div className="flex items-center gap-4 mt-3">
        <p style={{ fontSize: 11, color: T.muted }}>
          Possession: <span style={{ color: T.text }}>{possession}</span>
        </p>
        <p style={{ fontSize: 11, color: T.muted }}>
          Status: <span style={{ color: T.text }}>{statusShort}</span>
        </p>
      </div>

      {/* Honest concern (max 2 lines) */}
      {p.honestConcern && (
        <p
          className="mt-3"
          style={{
            fontSize: 12,
            color: T.amber,
            lineHeight: 1.45,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          ⚠ {p.honestConcern}
        </p>
      )}

      {/* Footer actions */}
      <div
        className="flex items-center justify-between gap-3 mt-4 pt-3"
        style={{ borderTop: `1px solid ${T.divider}` }}
      >
        <Link
          href={`/projects/${p.id}`}
          className="inline-flex items-center gap-1 transition-colors"
          style={{ fontSize: 12, color: T.muted, textDecoration: 'none' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = T.gold }}
          onMouseLeave={(e) => { e.currentTarget.style.color = T.muted }}
        >
          View <ArrowRight size={11} />
        </Link>
        <Link
          href={`/chat?message=${encodeURIComponent(`${p.projectName} ke baare mein batao`)}`}
          className="inline-flex items-center gap-1 transition-colors"
          style={{ fontSize: 12, color: T.gold, textDecoration: 'none' }}
        >
          Chat about this <ArrowRight size={11} />
        </Link>
      </div>
    </motion.article>
  )
}

/* ── Empty state — gold-bordered pulse CTA ──────────────────────── */
function EmptyShortlist({ prefersReduced }: { prefersReduced: boolean }) {
  return (
    <div
      className="rounded-xl px-6 py-12 text-center mt-5"
      style={{
        background: T.card,
        border: `1px solid ${T.goldBorder}`,
      }}
    >
      <p style={{ fontFamily: SERIF, fontSize: 18, color: T.text, marginBottom: 6 }}>
        Koi project shortlist nahi kiya abhi
      </p>
      <p style={{ fontSize: 12, color: T.muted, marginBottom: 20 }}>
        Tell Homesty AI what you need — get honest matches.
      </p>
      <motion.div
        animate={
          prefersReduced
            ? undefined
            : {
                boxShadow: [
                  '0 0 0px rgba(184,134,11,0)',
                  '0 0 20px rgba(184,134,11,0.4)',
                  '0 0 0px rgba(184,134,11,0)',
                ],
              }
        }
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        whileTap={prefersReduced ? undefined : { scale: 0.97 }}
        className="inline-block rounded-full"
      >
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 rounded-full px-5 py-2"
          style={{
            fontSize: 13,
            color: T.bg,
            background: T.gold,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Begin your HomeSearch <ArrowRight size={12} />
        </Link>
      </motion.div>
    </div>
  )
}
