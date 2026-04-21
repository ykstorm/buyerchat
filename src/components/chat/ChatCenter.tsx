'use client'
import type React from 'react'

import { motion, AnimatePresence } from 'framer-motion'
import { FormEvent, useRef, useEffect, useState, memo, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import ProjectCard from './artifacts/ProjectCardV2'
import ComparisonCard from './artifacts/ComparisonCard'
import CostBreakdownCard from './artifacts/CostBreakdownCard'
import { VisitBooking } from './artifacts/VisitBooking'
import VisitPromptCard from './artifacts/VisitPromptCard'
import BuilderTrustCard from './artifacts/BuilderTrustCard'
import type { ProjectType, Artifact } from '@/lib/types/chat'

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
}

/* ── Stable markdown component overrides (created once, never re-allocated) ── */
const MD_COMPONENTS = {
  strong: ({ children }: any) => <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{children}</span>,
  p: ({ children }: any) => <span className="block mb-2 last:mb-0">{children}</span>,
  ul: ({ children }: any) => <ul className="list-none space-y-1 my-1">{children}</ul>,
  li: ({ children }: any) => <li className="flex gap-2 pl-1" style={{ color: 'var(--text-secondary)' }}><span style={{ color: 'var(--text-muted)', marginRight: 4 }}>·</span>{children}</li>,
}

/* ── Memoized single message bubble — only re-renders when its content changes ── */
const ChatBubble = memo(function ChatBubble({ msg, isGrouped }: { msg: Message; isGrouped: boolean }) {
  return (
    <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} ${isGrouped ? 'mt-0.5' : 'mt-4'}`}>
      {msg.role === 'assistant' && !isGrouped && (
        <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center bg-[#1C1917] self-start mb-0.5">
          <span className="text-white text-[8px] font-bold tracking-tight">BC</span>
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
}

const STARTERS = [
  'Best 3BHK options under ₹85L in Shela?',
  'Strong options under ₹90L — family use',
  'Honest opinion on Riviera projects',
  'Compare two projects for me',
  'Which builder is most reliable?',
  "I'm confused — help me decide",
]

export default function ChatCenter({ messages, input, handleInputChange, handleSubmit, isLoading, append, loadingSession, artifact, showArtifact, onToggleArtifact, canGoBack, canGoForward, onArtifactBack, onArtifactForward, artifactCurrent, artifactTotal, artifactHistory, onSelectArtifact, compareToast, buyerStage }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const mouseRafRef = useRef<number>(0)
  const [showArtifactMenu, setShowArtifactMenu] = useState(false)
  const artifactMenuRef = useRef<HTMLDivElement>(null)

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
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
  }, [messages, isLoading])

  return (
    <div className="flex-1 flex flex-col h-dvh relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {loadingSession ? (
        <div className="flex-1 flex items-center justify-center">
          <motion.div
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
          <motion.div
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background: `radial-gradient(500px circle at ${mouse.x + 200}px ${mouse.y + 300}px, rgba(196,155,80,0.05), transparent 40%)`,
            }}
          />

          <div className="relative z-10 text-center px-6 w-full max-w-lg">

            {/* Eyebrow with gold accent line */}
            <motion.div
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
            </motion.div>

            {/* Headline with parallax + text shimmer */}
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              style={{ fontFamily: 'var(--font-playfair)', transform: `translate(${mouse.x * 0.3}px, ${mouse.y * 0.3}px)` }}
              className="relative z-10 text-[42px] leading-tight mb-3 font-bold text-shimmer"
            >
              Find your home.
            </motion.h1>

            {/* Subline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="text-[14px] mb-10 leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              Tell me your budget, timeline, and what matters to you.<br />
              I&apos;ll do the rest.
            </motion.p>

            {/* Starter cards */}
            <div className="grid grid-cols-2 gap-3 w-full mb-8">
              {STARTERS.map((s, i) => (
                <motion.button
                  key={s}
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 + i * 0.07, duration: 0.3 }}
                  whileHover={{ y: -3, boxShadow: '0 12px 32px rgba(196,155,80,0.1), 0 4px 12px rgba(0,0,0,0.04)' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => append({ role: 'user', content: s })}
                  className="text-left px-4 py-4 rounded-2xl backdrop-blur-sm cursor-pointer group transition-all duration-300"
                  style={{
                    background: 'color-mix(in srgb, var(--bg-surface) 85%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(196,155,80,0.3)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--border) 60%, transparent)')}
                >
                  <p className="text-[12.5px] font-medium leading-snug transition-colors" style={{ color: 'var(--text-secondary)' }}>{s}</p>
                </motion.button>
              ))}
            </div>

            {/* Trust line */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="text-[11px] text-[#A8A29E]"
            >
              Homesty earns only when you buy. No builder pays for promotion.
            </motion.p>
          </div>
        </div>

      ) : (
        <div className="flex-1 overflow-y-auto min-h-0 px-5 py-6 space-y-1 pb-6">
          {messages.map((msg, i) => {
            const prevMsg = messages[i - 1]
            const isGrouped = prevMsg?.role === msg.role
            const isLastAI = msg.role === 'assistant' && i === messages.length - 1 && !isLoading

            return (
              <div key={msg.id}>
                <ChatBubble msg={msg} isGrouped={isGrouped} />
                {/* Context-aware chips — only after last AI message */}
                {isLastAI && (
                  <div className="flex flex-wrap gap-1.5 mt-2 ml-8">
                    {(() => {
                      const lower = msg.content.toLowerCase()
                      const hasProject = lower.includes('possession') || lower.includes('sqft') || lower.includes('bhk')
                      const hasComparison = lower.includes('vs') || lower.includes('compare') || lower.includes('both')
                      const hasVisit = lower.includes('visit') || lower.includes('site')
                      if (hasVisit) return ['Book OTP-verified visit', 'What to check at site?', 'Tell me about the builder']
                      if (hasComparison) return ['Which one should I choose?', 'Book a site visit', 'What are the risks?']
                      if (buyerStage === 'post_visit') return ['How was the visit?', 'Should I book now?', 'Compare with another project', 'Any concerns?']
                      if (buyerStage === 'pre_visit') return ['What to check at site?', 'Questions to ask builder?', 'How to verify RERA on site?', 'What are red flags?']
                      if (buyerStage === 'visit_trigger') return ['Book OTP-verified visit', 'What documents needed?', 'Best time to visit?', 'Any concerns?']
                      if (buyerStage === 'comparison') return ['Compare these two projects', 'Which has better trust score?', 'Which is better value?', 'Show cost breakdown']
                      if (buyerStage === 'qualification') return ['Show me strong options', 'What fits my budget?', 'Which area is better?', 'Help me decide']
                      if (buyerStage === 'project_disclosure') return ['Tell me more', 'What are the risks?', 'Compare with another', 'Show cost breakdown']
                      if (hasProject) return ['Book a site visit', 'Compare with another project', 'What are the risks?', 'Tell me about the builder']
                      return ['Show me strong options', 'What is my ideal budget?', 'Which area is better?', 'Help me decide']
                    })().map(chip => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => append({ role: 'user', content: chip })}
                        className="text-[11px] px-3 py-1.5 rounded-full border hover:scale-[1.04] active:scale-[0.96] transition-transform"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-surface)' }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Loading dots */}
          {isLoading && (
            <div className="flex justify-start items-end gap-2 mt-4">
              <div className="w-6 h-6 rounded-full bg-[#1C1917] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[8px] font-bold">BC</span>
              </div>
              <div className="rounded-2xl rounded-bl-md px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)]" style={{ background: 'var(--bg-message-ai)', border: '1px solid var(--border)' }}>
                <div className="flex gap-1.5 items-center">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-[#C8C4BF]"
                      animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Mobile artifact — full-screen overlay modal */}
      <AnimatePresence>
        {artifact && showArtifact && (
          <motion.div
            className="lg:hidden fixed inset-0 z-40 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={onToggleArtifact}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Modal card — swipe left/right to navigate, down to dismiss */}
            <motion.div
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
              className="relative z-10 mt-12 mx-3 rounded-2xl overflow-hidden flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
              style={{
                background: 'var(--bg-surface)',
                maxHeight: 'calc(100dvh - 80px)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                willChange: 'transform, opacity',
              }}
            >
              {/* Header bar */}
              <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-2">
                  {artifactTotal && artifactTotal > 1 && (
                    <>
                      <button type="button" onClick={onArtifactBack} disabled={!canGoBack}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
                        style={{ background: 'var(--bg-subtle)' }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 9L4.5 6L7.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                      <button type="button" onClick={onArtifactForward} disabled={!canGoForward}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
                        style={{ background: 'var(--bg-subtle)' }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                    style={{ background: 'var(--bg-subtle)' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
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
                  ? <BuilderTrustCard builder={{
                      brandName: artifact.data.builderName,
                      builderName: artifact.data.builderName,
                      grade: artifact.data.trustGrade ?? 'C',
                      totalTrustScore: artifact.data.trustScore ?? 0,
                      deliveryScore: 0,
                      reraScore: 0,
                      qualityScore: 0,
                      financialScore: 0,
                      responsivenessScore: 0,
                      agreementSigned: false,
                    }} />
                  : <ProjectCard project={artifact.data} />}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile artifact minimized pill — removed; top-right artifact icon handles this */}

      {/* Compare toast notification */}
      <AnimatePresence>
        {compareToast && (
          <motion.div
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
          </motion.div>
        )}
      </AnimatePresence>

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

      <div className="backdrop-blur-sm px-4 py-3 sticky bottom-0 z-20 flex-shrink-0" style={{ borderTop: '1px solid var(--border-subtle)', background: 'color-mix(in srgb, var(--bg-base) 90%, transparent)', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about properties in South Bopal & Shela..."
            maxLength={800}
            className="flex-1 min-w-0 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/15 focus:border-[#1B4F8A]/50 transition-all duration-200 shadow-luxury-sm"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '16px' }}
          />
          <motion.button
            type="submit"
            disabled={isLoading || !input.trim()}
            whileTap={{ scale: 0.94 }}
            className="w-10 h-10 bg-[#1C1917] text-white rounded-2xl flex items-center justify-center disabled:opacity-30 transition-opacity hover:bg-[#2C2926] flex-shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 12V2M7 2L2.5 6.5M7 2L11.5 6.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.button>
        </form>
      </div>
    </div>
  )
}
