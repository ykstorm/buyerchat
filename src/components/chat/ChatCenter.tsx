'use client'
import type React from 'react'

import { m, AnimatePresence, useReducedMotion } from 'framer-motion'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { FormEvent, useRef, useEffect, useState, memo, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import type { ProjectType, Artifact } from '@/lib/types/chat'
import type { BuilderAIContext } from '@/lib/types/builder-ai-context'
import StageBCapture from './StageBCapture'
import { STAGE_B_TRIGGER_SCRIPTS } from '@/lib/intent-classifier'

// Mobile/inline artifact renderers — same lazy strategy as ChatRightPanel.
// Skeletons use dark-mode tokens + approximate rendered heights.
const ArtifactSkeleton = ({ heightClass }: { heightClass: string }) => (
  <div
    className={`${heightClass} animate-pulse rounded-xl`}
    style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
  />
)
const ProjectCard = dynamic(() => import('./artifacts/ProjectCardV2'), {
  ssr: false,
  loading: () => <ArtifactSkeleton heightClass="h-[520px]" />,
})
const ComparisonCard = dynamic(() => import('./artifacts/ComparisonCard'), {
  ssr: false,
  loading: () => <ArtifactSkeleton heightClass="h-[420px]" />,
})
const CostBreakdownCard = dynamic(() => import('./artifacts/CostBreakdownCard'), {
  ssr: false,
  loading: () => <ArtifactSkeleton heightClass="h-[460px]" />,
})
const VisitBooking = dynamic(
  () => import('./artifacts/VisitBooking').then(mod => ({ default: mod.VisitBooking })),
  { ssr: false, loading: () => <ArtifactSkeleton heightClass="h-[520px]" /> },
)
const VisitPromptCard = dynamic(() => import('./artifacts/VisitPromptCard'), {
  ssr: false,
  loading: () => <ArtifactSkeleton heightClass="h-[260px]" />,
})
const BuilderTrustCard = dynamic(() => import('./artifacts/BuilderTrustCard'), {
  ssr: false,
  loading: () => <ArtifactSkeleton heightClass="h-[360px]" />,
})

/* ── Floating Particles Component ── */
function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1)
      canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1)
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1)
    }
    resize()
    window.addEventListener('resize', resize)

    // Particle pool — reduced for perf
    const count = 25
    const particles: { x: number; y: number; vx: number; vy: number; r: number; o: number; phase: number }[] = []
    const w = () => canvas.offsetWidth
    const h = () => canvas.offsetHeight
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w(),
        y: Math.random() * h(),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.2 - 0.1,
        r: Math.random() * 1.5 + 0.5,
        o: Math.random() * 0.4 + 0.15,
        phase: Math.random() * Math.PI * 2,
      })
    }

    let time = 0
    const draw = () => {
      ctx.clearRect(0, 0, w(), h())
      time += 0.008
      for (const p of particles) {
        p.x += p.vx + Math.sin(time + p.phase) * 0.15
        p.y += p.vy + Math.cos(time * 0.7 + p.phase) * 0.1
        // Wrap around
        if (p.x < -10) p.x = w() + 10
        if (p.x > w() + 10) p.x = -10
        if (p.y < -10) p.y = h() + 10
        if (p.y > h() + 10) p.y = -10
        // Fade based on distance from center
        const dx = p.x / w() - 0.5
        const dy = p.y / h() - 0.5
        const dist = Math.sqrt(dx * dx + dy * dy)
        const fade = Math.max(0, 1 - dist * 1.8)
        const alpha = p.o * fade * (0.6 + 0.4 * Math.sin(time * 2 + p.phase))

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(196, 155, 80, ${alpha})`
        ctx.fill()
      }

      animRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    />
  )
}

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  // Optional inline action (e.g. "Sign in to continue" on a 401). Rendered as
  // a pill button below the bubble content. Purely presentational — the
  // handler is wired up by the owning component via onMessageAction.
  action?: {
    kind: 'signin'
    label: string
  }
  // Stage B hard-capture marker (Agent G). When present, the renderer mounts
  // <StageBCapture> below this assistant bubble. The original user message is
  // re-fired by the parent on verified.
  captureB?: {
    intent:
      | 'cost_breakdown'
      | 'comparison_request'
      | 'builder_deep_dive'
      | 'visit_booking_attempt'
      | 'full_project_details'
    originalUserContent: string
  }
}

/* ── Stable markdown component overrides (created once, never re-allocated) ── */
const MD_COMPONENTS = {
  strong: ({ children }: any) => <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{children}</span>,
  p: ({ children }: any) => <span className="block mb-2 last:mb-0">{children}</span>,
  ul: ({ children }: any) => <ul className="list-none space-y-1 my-1">{children}</ul>,
  li: ({ children }: any) => <li className="flex gap-2 pl-1" style={{ color: 'var(--text-secondary)' }}><span style={{ color: 'var(--text-muted)', marginRight: 4 }}>·</span>{children}</li>,
}

/* ── Memoized single message bubble — only re-renders when its content changes ── */
const ChatBubble = memo(function ChatBubble({ msg, isGrouped, onAction }: { msg: Message; isGrouped: boolean; onAction?: (msg: Message) => void }) {
  return (
    <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} ${isGrouped ? 'mt-0.5' : 'mt-4'}`}>
      {msg.role === 'assistant' && !isGrouped && (
        <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center bg-[#1C1917] self-start mb-0.5">
          <span
            className="font-bold tracking-tight"
            style={{
              fontFamily: 'var(--font-serif), "Cormorant Garamond", Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: '14px',
              color: '#C49B50',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >H</span>
        </div>
      )}
      <div
        className={`max-w-[75%] px-4 py-2.5 text-[13.5px] leading-relaxed ${
          msg.role === 'user' ? 'rounded-2xl rounded-br-md shadow-luxury-sm' : 'rounded-2xl rounded-bl-md shadow-luxury-sm'
        }`}
        style={msg.role === 'user'
          ? { background: 'var(--bg-message-user)', color: 'var(--text-message-user)' }
          : { background: 'var(--bg-message-ai)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
        }
      >
        {msg.role === 'assistant' ? (
          <div className="prose prose-sm max-w-none" style={{ color: 'var(--text-primary)' }}>
            <ReactMarkdown components={MD_COMPONENTS}>{msg.content}</ReactMarkdown>
          </div>
        ) : (
          <ReactMarkdown components={MD_COMPONENTS}>{msg.content}</ReactMarkdown>
        )}
      </div>
      {msg.action && msg.role === 'assistant' && (
        <button
          type="button"
          onClick={() => onAction?.(msg)}
          aria-label={msg.action.label}
          className="mt-2 ml-8 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-opacity hover:opacity-90"
          style={{ background: '#1B4F8A', color: '#fff', border: '1px solid #1B4F8A' }}
        >
          {msg.action.label} →
        </button>
      )}
    </div>
  )
})

/* ProjectType and Artifact imported from @/lib/types/chat */

type Props = {
  messages: Message[]
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleSubmit: (e: FormEvent) => void
  isLoading: boolean
  append: (msg: { role: 'user'; content: string }) => void
  loadingSession?: boolean
  artifact?: Artifact | null
  builders?: BuilderAIContext[]
  showArtifact?: boolean
  onToggleArtifact?: () => void
  canGoBack?: boolean
  canGoForward?: boolean
  onArtifactBack?: () => void
  onArtifactForward?: () => void
  artifactCurrent?: number
  artifactTotal?: number
  artifactHistory?: Artifact[]
  onSelectArtifact?: (index: number) => void
  onRetry?: () => void
  compareToast?: string | null
  buyerStage?: string | null
  onMessageAction?: (msg: Message) => void
  userId?: string | null
  userName?: string | null
  userImage?: string | null
  captureCard?: React.ReactNode
  sessionId?: string | null
  onStageBVerified?: (msg: Message) => void
}

// P2-CHIPS-DASHBOARD — these chips are tuned to produce CARD-emitting
// responses, not bullet lists. Sentry confirmed earlier chips ("Compare
// two projects for me", "Builder kaunsa reliable hai?") triggered
// MARKDOWN_ABORT because GPT-4o defaulted to bullet/numbered lists for
// vague queries. Each chip below either: (a) names a config + budget +
// area (triggers project_card emission per EXAMPLE 17), (b) names two
// specific projects (triggers comparison card), (c) names a specific
// builder (triggers builder_trust card or prose), or (d) is emotional
// prose-friendly. Avoid generic "show me X" / "which is better" phrasing.
const STARTERS = [
  '3BHK family ke liye, 85L budget Shela mein',
  'Riviera Bliss ka all-in breakdown dikhao',
  'Riviera Bliss ka honest review chahiye',
  'Riviera Bliss aur Shaligram Pride compare karo',
  'Goyal & Co ka trust score kitna hai?',
  'Honest concern wala project dikhao',
]

export default function ChatCenter({ messages, input, handleInputChange, handleSubmit, isLoading, append, loadingSession, artifact, builders = [], showArtifact, onToggleArtifact, canGoBack, canGoForward, onArtifactBack, onArtifactForward, artifactCurrent, artifactTotal, artifactHistory, onSelectArtifact, compareToast, buyerStage, onMessageAction, userId, userName, userImage, captureCard, sessionId, onStageBVerified }: Props) {
  const resolveBuilder = (a: Artifact | null): BuilderAIContext | null => {
    if (!a || a.type !== 'builder_trust') return null
    if (a.builder) return a.builder
    const needle = (a.data.builderName ?? '').toLowerCase()
    return builders.find(b =>
      (b.builderName ?? '').toLowerCase() === needle ||
      (b.brandName ?? '').toLowerCase() === needle ||
      needle.includes((b.builderName ?? '').toLowerCase()) ||
      needle.includes((b.brandName ?? '').toLowerCase())
    ) ?? null
  }
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRafPendingRef = useRef(false)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const mouseRafRef = useRef<number>(0)
  const [showArtifactMenu, setShowArtifactMenu] = useState(false)
  const artifactMenuRef = useRef<HTMLDivElement>(null)
  const prefersReduced = useReducedMotion()

  // Baseline snapshot of message count once a session finishes loading.
  // Messages with index < baseline are "history" and skip the entrance
  // animation; messages appended after that baseline animate in. This
  // distinguishes a fresh AI reply from a session reload (spec 2B: "new
  // AI messages only — not history reload").
  const baselineCountRef = useRef<number | null>(null)
  useEffect(() => {
    if (!loadingSession && baselineCountRef.current === null) {
      baselineCountRef.current = messages.length
    }
  }, [loadingSession, messages.length])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (artifactMenuRef.current && !artifactMenuRef.current.contains(e.target as Node)) {
        setShowArtifactMenu(false)
      }
    }
    if (showArtifactMenu) {
      document.addEventListener('mousedown', close)
      return () => document.removeEventListener('mousedown', close)
    }
  }, [showArtifactMenu])

  useEffect(() => {
    // RAF-gated scroll: during streaming, `messages` mutates every animation
    // frame. Without a gate, each change queues a fresh scrollIntoView and the
    // smooth animation fights itself (visible "pump" on iOS Safari). The gate
    // ensures at most one scroll is scheduled per frame.
    if (scrollRafPendingRef.current) return
    scrollRafPendingRef.current = true
    requestAnimationFrame(() => {
      scrollRafPendingRef.current = false
      // Streaming = instant scroll (no smooth-fight against RAF mutations).
      // Final flush + history loads = smooth.
      bottomRef.current?.scrollIntoView({ behavior: isLoading ? 'instant' : 'smooth', block: 'end' })
    })
  }, [messages, isLoading])

  return (
    <div className="flex-1 flex flex-col h-dvh relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {loadingSession ? (
        <div className="flex-1 flex items-center justify-center">
          <m.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-5 h-5 border-2 border-[#E7E5E4] border-t-[#1C1917] rounded-full"
          />
        </div>
      ) : messages.length === 0 ? (
        <div
          className="flex-1 flex flex-col items-center justify-center relative overflow-hidden"
          style={{ background: 'var(--bg-base)' }}
          onMouseMove={(e) => {
            if (mouseRafRef.current) return
            const cx = e.clientX, cy = e.clientY
            mouseRafRef.current = requestAnimationFrame(() => {
              setMouse({ x: (cx / window.innerWidth - 0.5) * 8, y: (cy / window.innerHeight - 0.5) * 8 })
              mouseRafRef.current = 0
            })
          }}
        >

          {/* Layer 1 — fine dot grid with parallax */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, rgba(168,162,158,0.35) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            transform: `translate(${mouse.x * 0.5}px, ${mouse.y * 0.5}px)`
          }} />

          {/* Layer 2 — deep radial fade to base */}
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse 75% 65% at 50% 45%, transparent 0%, var(--bg-base) 60%)'
          }} />

          {/* Layer 3 — warm golden glow center */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse 45% 40% at 50% 50%, rgba(196,155,80,0.06) 0%, transparent 70%)'
          }} />

          {/* Layer 4 — warm amber glow bottom */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse 55% 30% at 50% 90%, rgba(196,155,80,0.08) 0%, transparent 70%)',
            animation: 'warm-pulse 6s ease-in-out infinite'
          }} />

          {/* Layer 5 — cool blue glow top-right */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse 35% 25% at 80% 15%, rgba(27,79,138,0.04) 0%, transparent 70%)'
          }} />

          {/* Floating particles */}
          <FloatingParticles />

          {/* Layer 6 — grain texture */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              opacity: 0.06,
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: '220px 220px',
              backgroundRepeat: 'repeat'
            }}
          />

          {/* Warm spotlight follows cursor */}
          <m.div
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background: `radial-gradient(500px circle at ${mouse.x + 200}px ${mouse.y + 300}px, rgba(196,155,80,0.05), transparent 40%)`,
            }}
          />

          <m.div
            // P2-DASHBOARD-SITE-REVAMP — wrap empty-state block in a single
            // entrance animation so the whole hero springs in together,
            // not piecemeal. Inner per-element delays still layer for the
            // editorial cascade, but the block itself fades up first.
            initial={prefersReduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 text-center px-6 w-full max-w-lg"
          >

            {/* Eyebrow with gold accent line */}
            <m.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center justify-center gap-3 mb-5"
            >
              <div className="h-[1px] w-8" style={{ background: 'linear-gradient(90deg, transparent, #C49B50)' }} />
              <p className="text-[10px] font-semibold tracking-[0.22em] uppercase" style={{ color: '#C49B50' }}>
                South Bopal & Shela · Ahmedabad
              </p>
              <div className="h-[1px] w-8" style={{ background: 'linear-gradient(90deg, #C49B50, transparent)' }} />
            </m.div>

            {/* Headline with parallax + text shimmer */}
            <m.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              style={{ fontFamily: 'var(--font-playfair)', transform: `translate(${mouse.x * 0.3}px, ${mouse.y * 0.3}px)` }}
              className="relative z-10 text-[42px] leading-tight mb-3 font-bold text-shimmer"
            >
              Find your home.
            </m.h1>

            {/* Subline */}
            <m.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="text-[14px] mb-10 leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              Budget, timeline, aur kya important hai — bata dein.<br />
              Honest analysis Homesty AI karega.
            </m.p>

            {/* Starter cards — P2-DASHBOARD-SITE-REVAMP: spring-scale entry
                + gold-tint hover (scale 1.02, gold bg). Each chip staggers
                4% behind the prior. */}
            <div className="grid grid-cols-2 gap-3 w-full mb-8">
              {STARTERS.map((s, i) => (
                <m.button
                  key={s}
                  type="button"
                  initial={prefersReduced ? false : { opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={
                    prefersReduced
                      ? { duration: 0 }
                      : { type: 'spring', damping: 22, stiffness: 280, delay: 0.18 + i * 0.04 }
                  }
                  whileHover={prefersReduced ? undefined : { scale: 1.02, backgroundColor: 'rgba(184,134,11,0.08)' }}
                  whileTap={prefersReduced ? undefined : { scale: 0.97 }}
                  onClick={() => append({ role: 'user', content: s })}
                  className="text-left px-4 py-4 rounded-2xl backdrop-blur-sm cursor-pointer group"
                  style={{
                    background: 'color-mix(in srgb, var(--bg-surface) 85%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(196,155,80,0.3)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--border) 60%, transparent)')}
                >
                  <p className="text-[12.5px] font-medium leading-snug transition-colors" style={{ color: 'var(--text-secondary)' }}>{s}</p>
                </m.button>
              ))}
            </div>

            {/* Sprint 5 (2026-04-30): brand-bible scrub — founder voice anchor
                removed. Homesty AI is positioned as a pure AI entity; no human
                signature surfaces on buyer surfaces. Trust line stays. */}
            <m.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="text-[11px] text-[#A8A29E]"
            >
              Homesty earns only when you buy. No builder pays for promotion.
            </m.p>
          </m.div>
        </div>

      ) : (
        <div className="flex-1 overflow-y-auto min-h-0 px-5 py-6 space-y-1 pb-6">
          {messages.map((msg, i) => {
            const prevMsg = messages[i - 1]
            const isGrouped = prevMsg?.role === msg.role
            const isLastAI = msg.role === 'assistant' && i === messages.length - 1 && !isLoading
            // A "new" AI message is one mounted after the baseline snapshot.
            // Spring-fade it in. History entries (index < baseline) and
            // user messages render statically (initial={false} skips the
            // entrance animation).
            const isNewAI =
              !prefersReduced &&
              msg.role === 'assistant' &&
              baselineCountRef.current !== null &&
              i >= baselineCountRef.current

            return (
              <m.div
                key={msg.id}
                initial={isNewAI ? { opacity: 0, y: 8 } : false}
                animate={isNewAI ? { opacity: 1, y: 0 } : undefined}
                transition={isNewAI ? { type: 'spring', damping: 25, stiffness: 400 } : undefined}
              >
                <ChatBubble msg={msg} isGrouped={isGrouped} onAction={onMessageAction} />
                {msg.captureB && sessionId && onStageBVerified && (
                  <StageBCapture
                    intent={msg.captureB.intent}
                    message={STAGE_B_TRIGGER_SCRIPTS[msg.captureB.intent]}
                    sessionId={sessionId}
                    onVerified={() => onStageBVerified(msg)}
                  />
                )}
                {/* Context-aware chips — only after last AI message.
                    Stagger-fade so they don't snap in while buyer is still
                    reading the AI bubble (ui-polish-and-motion §5.4). */}
                {isLastAI && (
                  <m.div
                    className="flex flex-wrap gap-1.5 mt-2 ml-8"
                    initial={prefersReduced ? false : 'hidden'}
                    animate="show"
                    variants={prefersReduced ? undefined : {
                      hidden: {},
                      show: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } },
                    }}
                  >
                    {(() => {
                      const lower = msg.content.toLowerCase()
                      const hasProject = lower.includes('possession') || lower.includes('sqft') || lower.includes('bhk')
                      const hasComparison = lower.includes('vs') || lower.includes('compare') || lower.includes('both')
                      // P2-CHIPS-DASHBOARD — chips rewritten to produce card or
                      // prose responses, never bullet lists. Removed "OTP-verified"
                      // language (Rule C). Generic "show me", "which is better"
                      // phrasings replaced with grounded queries that trigger card
                      // emission (specific config / budget / area / project name).
                      const hasVisit = lower.includes('visit') || lower.includes('site')
                      if (hasVisit) return ['Visit book karna hai', 'Site pe kya check karein?', 'Builder ke baare mein batao']
                      if (hasComparison) return ['Dono compare karke decide karne mein help karo', 'Visit book karna hai', 'Iss case ke risks kya hain?']
                      if (buyerStage === 'post_visit') return ['Visit kaisa raha?', 'Ab booking karein?', 'Doosre project se compare karo', 'Koi concerns hain?']
                      if (buyerStage === 'pre_visit') return ['Site pe kya check karein?', 'Builder se kya pucchein?', 'RERA site pe kaise verify karein?', 'Red flags kya hote hain?']
                      if (buyerStage === 'visit_trigger') return ['Visit book karna hai', 'Documents kya chahiye?', 'Best time to visit?', 'Koi concerns?']
                      if (buyerStage === 'comparison') return ['Dono projects compare karo', 'Trust score kis ka behtar hai?', 'Kaunsa better value hai?', 'Cost breakdown dikhao']
                      if (buyerStage === 'qualification') return ['Shela mein strong 3BHK options dikhao', 'Family ke liye ideal budget kya hona chahiye?', 'South Bopal ya Shela — family ke liye kaunsa?', 'Dono compare karke decide karo']
                      if (buyerStage === 'project_disclosure') return ['Aur batao', 'Risks kya hain?', 'Doosre se compare karo', 'Cost breakdown chahiye']
                      if (hasProject) return ['Visit book karna hai', 'Doosre project se compare karo', 'Risks kya hain?', 'Builder ke baare mein batao']
                      return ['Shela mein strong 3BHK options dikhao', 'Family ke liye ideal budget kya hona chahiye?', 'South Bopal ya Shela — family ke liye kaunsa?', 'Dono compare karke decide karne mein help karo']
                    })().map(chip => (
                      <m.button
                        key={chip}
                        type="button"
                        variants={prefersReduced ? undefined : {
                          hidden: { opacity: 0, y: 4 },
                          show: { opacity: 1, y: 0 },
                        }}
                        onClick={() => append({ role: 'user', content: chip })}
                        className="text-[11px] px-3 py-1.5 rounded-full border hover:scale-[1.04] active:scale-[0.96] transition-transform"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-surface)' }}
                      >
                        {chip}
                      </m.button>
                    ))}
                  </m.div>
                )}
              </m.div>
            )
          })}

          {/* Typing indicator — single gold pulse with radar-ping ring.
              Replaces the generic 3-dot bouncing every AI clone uses. Reads
              as "the advisor is thinking" not "the API is loading".
              Reduced motion = static gold dot, no animation. */}
          {isLoading && (
            <div className="flex justify-start items-end gap-2 mt-4">
              <div className="w-6 h-6 rounded-full bg-[#1C1917] flex items-center justify-center flex-shrink-0">
                <span
                  className="font-bold"
                  style={{
                    fontFamily: 'var(--font-serif), "Cormorant Garamond", Georgia, serif',
                    fontStyle: 'italic',
                    fontWeight: 500,
                    fontSize: '14px',
                    color: '#C49B50',
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                  }}
                >H</span>
              </div>
              <div className="rounded-2xl rounded-bl-md px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)]" style={{ background: 'var(--bg-message-ai)', border: '1px solid var(--border)' }}>
                <div className="relative w-2 h-2">
                  {!prefersReduced && (
                    <m.span
                      aria-hidden
                      className="absolute inset-0 rounded-full"
                      style={{ background: '#C49B50' }}
                      animate={{ scale: [1, 2.2], opacity: [0.55, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                    />
                  )}
                  <span aria-label="Homesty AI is thinking" role="status" className="absolute inset-0 rounded-full" style={{ background: '#C49B50' }} />
                </div>
              </div>
            </div>
          )}
          {captureCard}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Mobile artifact — overlay modal.
          Leaves the bottom ~88px clear so the input bar stays visible
          (input bar is sticky-bottom at z-20; modal + backdrop sit above
          at z-40 but stop short of the input so buyers can still type). */}
      <AnimatePresence>
        {artifact && showArtifact && (
          <m.div
            className="lg:hidden fixed inset-x-0 top-0 z-40 flex flex-col"
            style={{ bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop — covers only the area above the input bar */}
            <m.div
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={onToggleArtifact}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Modal card — swipe left/right to navigate, down to dismiss */}
            <m.div
              initial={{ y: 60, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              onTouchStart={(e: React.TouchEvent) => {
                const t = e.touches[0]
                ;(e.currentTarget as any)._touchStartX = t.clientX
                ;(e.currentTarget as any)._touchStartY = t.clientY
              }}
              onTouchEnd={(e: React.TouchEvent) => {
                const el = e.currentTarget as any
                const dx = e.changedTouches[0].clientX - el._touchStartX
                const dy = e.changedTouches[0].clientY - el._touchStartY
                if (Math.abs(dy) > Math.abs(dx) && dy > 80) { onToggleArtifact?.(); return }
                if (Math.abs(dx) > Math.abs(dy)) {
                  if (dx < -60 && canGoForward) { onArtifactForward?.(); return }
                  if (dx > 60 && canGoBack) { onArtifactBack?.(); return }
                }
              }}
              className="relative z-10 mt-12 mx-3 mb-3 rounded-2xl overflow-hidden flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
              style={{
                background: 'var(--bg-surface)',
                // Modal container already stops above input bar (parent has bottom: 88px);
                // cap height so mid-sized content doesn't force overflow into the input area.
                maxHeight: 'calc(100dvh - 140px)',
                willChange: 'transform, opacity',
              }}
            >
              {/* Header bar */}
              <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-2">
                  {artifactTotal && artifactTotal > 1 && (
                    <>
                      <button type="button" onClick={onArtifactBack} disabled={!canGoBack} aria-label="Previous artifact"
                        className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
                        style={{ background: 'var(--bg-subtle)' }}>
                        <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M7.5 9L4.5 6L7.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                      <button type="button" onClick={onArtifactForward} disabled={!canGoForward} aria-label="Next artifact"
                        className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
                        style={{ background: 'var(--bg-subtle)' }}>
                        <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                      <span className="text-[10px] ml-1" style={{ color: 'var(--text-muted)' }}>{artifactCurrent}/{artifactTotal}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {artifact.type === 'visit_booking' ? 'Book Visit' : artifact.type === 'comparison' ? 'Compare' : artifact.type === 'cost_breakdown' ? 'Cost' : artifact.type === 'visit_prompt' ? 'Visit' : artifact.type === 'builder_trust' ? 'Builder' : 'Project'}
                  </span>
                  <button
                    type="button"
                    onClick={onToggleArtifact}
                    aria-label="Close artifact"
                    className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
                    style={{ background: 'var(--bg-subtle)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                      <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Swipe hint dots */}
              {artifactTotal && artifactTotal > 1 && (
                <div className="flex justify-center gap-1.5 py-1.5" style={{ background: 'var(--bg-surface)' }}>
                  {Array.from({ length: artifactTotal }).map((_, i) => (
                    <div key={i} className="rounded-full transition-all duration-200" style={{
                      width: i + 1 === artifactCurrent ? 16 : 5,
                      height: 5,
                      background: i + 1 === artifactCurrent ? '#1B4F8A' : 'var(--border)',
                    }} />
                  ))}
                </div>
              )}

              {/* Content — scrollable */}
              <div
                className="flex-1 overflow-y-auto overscroll-contain px-4 py-4"
                style={{ WebkitOverflowScrolling: 'touch' }}
                onPointerDown={e => e.stopPropagation()}
              >
                {artifact.type === 'visit_booking'
                  ? <VisitBooking projectId={artifact.data.id} projectName={artifact.data.projectName} />
                  : artifact.type === 'comparison' && artifact.dataB
                  ? <ComparisonCard projectA={artifact.data} projectB={artifact.dataB} />
                  : artifact.type === 'cost_breakdown'
                  ? <CostBreakdownCard project={artifact.data} />
                  : artifact.type === 'visit_prompt'
                  ? <VisitPromptCard project={artifact.data} />
                  : artifact.type === 'builder_trust'
                  ? (() => {
                      const b = resolveBuilder(artifact)
                      return (
                        <BuilderTrustCard
                          builder={{
                            brandName: b?.brandName ?? artifact.data.builderName,
                            builderName: b?.builderName ?? artifact.data.builderName,
                            grade: b?.grade ?? artifact.data.trustGrade ?? 'C',
                            totalTrustScore: b?.totalTrustScore ?? artifact.data.trustScore ?? 0,
                            deliveryScore: b?.deliveryScore ?? 0,
                            reraScore: b?.reraScore ?? 0,
                            qualityScore: b?.qualityScore ?? 0,
                            financialScore: b?.financialScore ?? 0,
                            responsivenessScore: b?.responsivenessScore ?? 0,
                            agreementSigned: b?.agreementSigned ?? false,
                          }}
                          hasSubscores={!!b}
                        />
                      )
                    })()
                  : <ProjectCard project={artifact.data} />}
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Mobile artifact minimized pill — removed; top-right artifact icon handles this */}

      {/* Compare toast notification */}
      <AnimatePresence>
        {compareToast && (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-luxury"
            style={{ background: 'var(--bg-surface)', border: '1px solid rgba(196,155,80,0.3)' }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#C49B50] animate-pulse" />
            <p className="text-[12px] whitespace-nowrap font-medium" style={{ color: 'var(--text-primary)' }}>
              {compareToast}
            </p>
          </m.div>
        )}
      </AnimatePresence>

      {/* Sprint 4 (2026-04-30) — restored muted top-right "Sign in" link
          for anonymous /chat users. Sprint C deleted the original pill on
          the assumption Navbar + sidebar footer would carry the affordance,
          but Navbar.tsx HIDE_PREFIXES excludes /chat and the sidebar footer
          was demoted to non-clickable text in the same sprint, leaving zero
          clickable sign-in for anonymous users. This restores it without
          re-introducing the duplicate-signin CTA — the link is anonymous-
          gated, hidden once userId is present (signed-in surface remains
          the sidebar avatar/sign-out row). Style mirrors Sprint 3's deleted
          landing element (text-[12px], muted, no decoration). */}
      {!userId && (
        <Link
          href="/auth/signin"
          aria-label="Sign in to save your chats"
          className="absolute top-3 right-3 z-40 text-[12px] transition-opacity hover:opacity-80"
          style={{ color: '#888', textDecoration: 'none' }}
        >
          Sign in
        </Link>
      )}

      {/* Artifact history button — top right of chat */}
      {artifactHistory && artifactHistory.length > 0 && messages.length > 0 && !showArtifact && (
        <div className="lg:hidden absolute top-3 right-3 z-40">
          <div className="relative" ref={artifactMenuRef}>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setShowArtifactMenu(prev => !prev) }}
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm relative"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1B4F8A" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
              </svg>
              {artifactHistory.length > 1 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#1B4F8A] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {artifactHistory.length}
                </span>
              )}
            </button>
            {showArtifactMenu && (
              <div className="absolute right-0 top-11 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] py-2 min-w-[200px] z-50" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                {artifactHistory.map((a, i) => (
                  <button key={i} type="button"
                    onClick={() => { onSelectArtifact?.(i); setShowArtifactMenu(false) }}
                    className="w-full px-4 py-2.5 text-left transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <p className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {a.type === 'comparison' && a.dataB ? `${a.data.projectName.split(' ')[0]} vs ${a.dataB.projectName.split(' ')[0]}` : a.data.projectName}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{a.type === 'visit_booking' ? 'Visit booking' : a.type === 'comparison' ? 'Comparison' : a.type === 'cost_breakdown' ? 'Cost breakdown' : 'Project card'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input wrapper paddingBottom = max of safe-area inset and the iOS
          keyboard height written to --keyboard-height by chat-client.tsx's
          visualViewport listener. Keeps the input visible above the soft
          keyboard on iOS (where h-dvh + sticky-bottom does not always
          re-flow on focus). transition-padding-* keeps the slide smooth. */}
      <div className="backdrop-blur-sm px-4 py-3 sticky bottom-0 z-50 flex-shrink-0" style={{ borderTop: '1px solid var(--border-subtle)', background: 'color-mix(in srgb, var(--bg-base) 90%, transparent)', paddingBottom: 'max(16px, env(safe-area-inset-bottom), var(--keyboard-height, 0px))', transition: 'padding-bottom 0.12s ease' }}>
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about properties in South Bopal & Shela..."
            maxLength={800}
            className="flex-1 min-w-0 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/15 focus:border-[#1B4F8A]/50 transition-all duration-200 shadow-luxury-sm"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '16px' }}
          />
          <m.button
            type="submit"
            disabled={isLoading || !input.trim()}
            whileTap={{ scale: 0.94 }}
            aria-label="Send message"
            className="w-10 h-10 bg-[#1C1917] text-white rounded-2xl flex items-center justify-center transition-colors hover:bg-[#2C2926] flex-shrink-0 disabled:opacity-50 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 12V2M7 2L2.5 6.5M7 2L11.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </m.button>
        </form>
      </div>
    </div>
  )
}
