'use client'

import { motion } from 'framer-motion'
import { FormEvent, useRef, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import ProjectCard from './artifacts/ProjectCard'
import { VisitBooking } from './artifacts/VisitBooking'

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type ProjectType = {
  id: string; projectName: string; builderName: string
  pricePerSqft: number; minPrice: number; maxPrice: number
  possessionDate: Date | string; constructionStatus: string
  microMarket: string
}
type Artifact = { type: 'project_card' | 'visit_booking'; data: ProjectType }

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
}

const STARTERS = [
  'Best 3BHK under ₹85L — family, Shela preferred',
  'What are strong options under ₹90L?',
  'Honest opinion on Riviera projects',
  "I'm confused — help me decide",
]

export default function ChatCenter({ messages, input, handleInputChange, handleSubmit, isLoading, append, loadingSession, artifact, showArtifact, onToggleArtifact, canGoBack, canGoForward, onArtifactBack, onArtifactForward }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#FAFAF8]">
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
          onMouseMove={(e) => setMouse({ x: (e.clientX / window.innerWidth - 0.5) * 8, y: (e.clientY / window.innerHeight - 0.5) * 8 })}
        >

          {/* Layer 1 — fine dot grid with parallax */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, #C4BFB8 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            transform: `translate(${mouse.x * 0.5}px, ${mouse.y * 0.5}px)`
          }} />

          {/* Layer 2 — deep radial fade */}
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 0%, #FAFAF8 65%)'
          }} />

          {/* Layer 3 — warm amber glow bottom-center */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse 50% 35% at 50% 85%, rgba(196,155,80,0.07) 0%, transparent 70%)'
          }} />

          {/* Layer 4 — cool blue glow top-right */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse 40% 30% at 80% 15%, rgba(27,79,138,0.05) 0%, transparent 70%)'
          }} />

          {/* Layer 5 — animated floating grain */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{
              backgroundPosition: ['0px 0px', '30px 20px', '0px 40px', '0px 0px']
            }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            style={{
              opacity: 0.035,
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: '220px 220px',
              backgroundRepeat: 'repeat'
            }}
          />

          <div className="relative z-10 text-center px-6 w-full max-w-lg">

            {/* Eyebrow */}
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-[11px] font-medium tracking-[0.18em] text-[#A8A29E] uppercase mb-4"
            >
              South Bopal & Shela · Ahmedabad
            </motion.p>

            {/* Headline with parallax */}
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              style={{ fontFamily: 'var(--font-playfair)', transform: `translate(${mouse.x * 0.3}px, ${mouse.y * 0.3}px)` }}
              className="text-[38px] leading-tight text-[#1C1917] mb-3 font-bold"
            >
              Find your home.
            </motion.h1>

            {/* Subline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="text-[14px] text-[#78716C] mb-10 leading-relaxed"
            >
              Tell me your budget, timeline, and what matters to you.<br />
              I&apos;ll do the rest.
            </motion.p>

            {/* Starter cards */}
            <div className="grid grid-cols-2 gap-2.5 w-full mb-8">
              {STARTERS.map((s, i) => (
                <motion.button
                  key={s}
                  type="button"
                  onClick={() => append({ role: 'user', content: s })}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 + i * 0.07, duration: 0.3 }}
                  whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(27,79,138,0.08)' }}
                  whileTap={{ scale: 0.98 }}
                  className="text-left px-4 py-3.5 bg-white/80 backdrop-blur-sm rounded-2xl border border-[#E7E5E4] hover:border-[#1B4F8A]/40 transition-all duration-200 cursor-pointer group"
                >
                  <p className="text-[12.5px] text-[#44403C] font-medium leading-snug group-hover:text-[#1C1917] transition-colors">{s}</p>
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
              BuyerChat earns only when you buy. No builder pays for promotion.
            </motion.p>
          </div>
        </div>

      ) : (
        <div className="flex-1 overflow-y-auto min-h-0 px-5 py-6 space-y-1 pb-0 lg:pb-0">
          {messages.map((msg, i) => {
            const prevMsg = messages[i - 1]
            const isGrouped = prevMsg?.role === msg.role

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start items-end gap-2'} ${isGrouped ? 'mt-0.5' : 'mt-4'}`}
              >
                {/* AI avatar — only show on last in group */}
                {msg.role === 'assistant' && (
                  <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center ${isGrouped ? 'opacity-0' : 'bg-[#1C1917]'}`}>
                    <span className="text-white text-[8px] font-bold tracking-tight">BC</span>
                  </div>
                )}

                <div className={`
                  max-w-[75%] px-4 py-2.5 text-[13.5px] leading-relaxed
                  ${msg.role === 'user'
                    ? 'bg-[#1C1917] text-[#FAF9F7] rounded-2xl rounded-br-md'
                    : 'bg-white text-[#1C1917] rounded-2xl rounded-bl-md shadow-[0_1px_4px_rgba(0,0,0,0.06)] border border-[#F0EDE8]'
                  }
                `}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none text-[#1C1917] [&>p]:mb-2 [&>p:last-child]:mb-0 [&>strong]:font-semibold [&>strong]:text-[#1C1917]">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : msg.content}
                </div>
              </motion.div>
            )
          })}

          {/* Loading dots */}
          {isLoading && (
            <div className="flex justify-start items-end gap-2 mt-4">
              <div className="w-6 h-6 rounded-full bg-[#1C1917] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[8px] font-bold">BC</span>
              </div>
              <div className="bg-white border border-[#F0EDE8] rounded-2xl rounded-bl-md px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
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

      {/* Mobile artifact card — renders above input bar in normal flow */}
      {artifact && (
        <div className="lg:hidden flex-shrink-0">
          {showArtifact ? (
            <div className="bg-white border-t border-[#E7E5E4] relative">
              <div className="pt-3 pb-1 flex justify-center">
                <div className="w-10 h-1 rounded-full bg-[#E7E5E4]" />
              </div>
              {(canGoBack || canGoForward) && (
                <div className="flex items-center gap-2 px-4 py-1.5 border-b border-[#F4F3F0]">
                  <button type="button" onClick={onArtifactBack} disabled={!canGoBack}
                    className="text-[11px] text-[#78716C] disabled:text-[#D6D3D1] hover:text-[#1C1917] disabled:cursor-not-allowed flex items-center gap-1">
                    ← Back
                  </button>
                  <span className="text-[#E7E5E4]">|</span>
                  <button type="button" onClick={onArtifactForward} disabled={!canGoForward}
                    className="text-[11px] text-[#78716C] disabled:text-[#D6D3D1] hover:text-[#1C1917] disabled:cursor-not-allowed flex items-center gap-1">
                    Forward →
                  </button>
                </div>
              )}
              <button type="button" onClick={onToggleArtifact}
                className="absolute top-3 right-3 text-[11px] text-[#A8A29E] hover:text-[#1C1917]">
                Hide ↓
              </button>
              <div className="px-4 pb-4 max-h-[50vh] overflow-y-auto">
                {artifact.type === 'visit_booking'
                  ? <VisitBooking projectId={artifact.data.id} projectName={artifact.data.projectName} />
                  : <ProjectCard project={artifact.data} />}
              </div>
            </div>
          ) : (
            <button type="button" onClick={onToggleArtifact}
              className="w-full bg-white border-t border-[#E7E5E4] px-4 py-2.5 flex items-center justify-between text-[12px] font-medium text-[#1C1917] hover:bg-[#F4F3F0]">
              <span className="truncate">
                {artifact.type === 'visit_booking' ? `Book visit — ${artifact.data.projectName}` : artifact.data.projectName}
              </span>
              <span className="text-[#A8A29E] text-[11px] ml-2">Show ↑</span>
            </button>
          )}
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-[#EEECE8] bg-[#FAFAF8] px-4 py-3 sticky bottom-0 z-20 flex-shrink-0" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about properties in South Bopal & Shela..."
            maxLength={800}
            className="flex-1 bg-white border border-[#E7E5E4] rounded-2xl px-4 py-2.5 text-[13px] text-[#1C1917] placeholder:text-[#C8C4BF] focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/15 focus:border-[#1B4F8A]/50 transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
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
