'use client'
import type React from 'react'

import { motion, AnimatePresence } from 'framer-motion'
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
  pricePerSqft: number | null; minPrice: number; maxPrice: number
  possessionDate: Date | string; constructionStatus: string
  microMarket: string
  decisionTag?: string | null
  honestConcern?: string | null
  analystNote?: string | null
  possessionFlag?: string | null
  configurations?: string | null
  bankApprovals?: string | null
  priceNote?: string | null
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
  artifactCurrent?: number
  artifactTotal?: number
  artifactHistory?: Artifact[]
  onSelectArtifact?: (index: number) => void
}

const STARTERS = [
  'Best 3BHK under ₹85L — family, Shela preferred',
  'What are strong options under ₹90L?',
  'Honest opinion on Riviera projects',
  "I'm confused — help me decide",
]

export default function ChatCenter({ messages, input, handleInputChange, handleSubmit, isLoading, append, loadingSession, artifact, showArtifact, onToggleArtifact, canGoBack, canGoForward, onArtifactBack, onArtifactForward, artifactCurrent, artifactTotal, artifactHistory, onSelectArtifact }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const [showArtifactMenu, setShowArtifactMenu] = useState(false)
  useEffect(() => {
    const close = () => setShowArtifactMenu(false)
    if (showArtifactMenu) document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [showArtifactMenu])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div className="flex-1 flex flex-col h-dvh relative overflow-hidden bg-[#FAFAF8]">
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
        <div className={`flex-1 overflow-y-auto min-h-0 px-5 py-6 space-y-1 lg:pb-6 ${artifact && !showArtifact ? 'pb-16' : 'pb-6'}`}>
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
                    ? 'bg-[#1C1917] text-[#FAF9F7] rounded-2xl rounded-br-md shadow-luxury-sm'
                    : 'bg-white text-[#1C1917] rounded-2xl rounded-bl-md shadow-luxury-sm border border-[#F0EDE8]'
                  }
                `}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none text-[#1C1917]">
                      <ReactMarkdown
                        components={{
                          strong: ({ children }) => <span className="font-semibold text-[#1C1917]">{children}</span>,
                          p: ({ children }) => <span className="block mb-2 last:mb-0">{children}</span>,
                          ul: ({ children }) => <ul className="list-none space-y-1 my-1">{children}</ul>,
                          li: ({ children }) => { const s: React.CSSProperties = {}; return <li style={s} className="flex gap-2 pl-1 text-[#52525B]"><span style={{ color: '#A8A29E', marginRight: 4 }}>·</span>{children}</li> },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <ReactMarkdown
                      components={{
                        strong: ({ children }) => <span className="font-semibold text-[#1C1917]">{children}</span>,
                        p: ({ children }) => <span className="block mb-2 last:mb-0">{children}</span>,
                        ul: ({ children }) => <ul className="list-none space-y-1 my-1">{children}</ul>,
                        li: ({ children }) => { const s: React.CSSProperties = {}; return <li style={s} className="flex gap-2 pl-1 text-[#52525B]"><span style={{ color: '#A8A29E', marginRight: 4 }}>·</span>{children}</li> },
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  )}
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

      {/* Mobile artifact — smooth bottom sheet */}
      <AnimatePresence>
        {artifact && (
          <motion.div
            className="lg:hidden fixed inset-x-0 bottom-0 z-30"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {showArtifact ? (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/20 z-[-1]"
                  onClick={onToggleArtifact}
                  style={{ touchAction: 'none' }}
                />
                {/* Sheet */}
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                  drag="y"
                  dragConstraints={{ top: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(_: any, info: any) => { if (info.offset.y > 150 && info.velocity.y > 100) onToggleArtifact?.() }}
                  className="bg-white rounded-t-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.12)] overflow-hidden"
                >
                  {/* Handle */}
                  <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing" style={{ touchAction: 'none' }} onClick={onToggleArtifact}>
                    <div className="w-10 h-1 rounded-full bg-[#E7E5E4]" />
                  </div>
                  {/* Nav bar */}
                  {artifactTotal && artifactTotal > 1 && (
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-[#F4F3F0]">
                      <button type="button" onClick={onArtifactBack} disabled={!canGoBack}
                        className={`text-[11px] flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${canGoBack ? 'text-[#1C1917] hover:bg-[#F4F3F0]' : 'text-[#D6D3D1] cursor-not-allowed'}`}>
                        ← Back
                      </button>
                      <span className="text-[10px] text-[#A8A29E] mx-auto">{artifactCurrent} of {artifactTotal}</span>
                      <button type="button" onClick={onArtifactForward} disabled={!canGoForward}
                        className={`text-[11px] flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${canGoForward ? 'text-[#1C1917] hover:bg-[#F4F3F0]' : 'text-[#D6D3D1] cursor-not-allowed'}`}>
                        Forward →
                      </button>
                    </div>
                  )}
                  {/* Content */}
                  <div className="px-4 pb-6 overflow-y-auto overscroll-contain" style={{ maxHeight: '55vh', touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }} onPointerDown={e => e.stopPropagation()}>
                    {artifact.type === 'visit_booking'
                      ? <VisitBooking projectId={artifact.data.id} projectName={artifact.data.projectName} />
                      : <ProjectCard project={artifact.data} />}
                  </div>
                </motion.div>
              </>
            ) : (!artifactHistory?.length || messages.length === 0) ? (
              <motion.button
                type="button"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                onClick={onToggleArtifact}
                className="w-full bg-white border-t border-[#E7E5E4] px-4 py-2 flex items-center justify-between"
              >
                <span className="text-[12px] font-medium text-[#1C1917] truncate">
                  {artifact.type === 'visit_booking' ? `Book visit — ${artifact.data.projectName}` : artifact.data.projectName}
                </span>
                <span className="text-[11px] text-[#1B4F8A] font-medium">↑ Open</span>
              </motion.button>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      {/* Artifact history button — top right of chat */}
      {artifactHistory && artifactHistory.length > 0 && messages.length > 0 && (
        <div className="lg:hidden absolute top-3 right-3 z-40">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowArtifactMenu(prev => !prev)}
              className="w-9 h-9 bg-white border border-[#E7E5E4] rounded-xl flex items-center justify-center shadow-sm relative"
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
              <div className="absolute right-0 top-11 bg-white border border-[#E7E5E4] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] py-2 min-w-[200px] z-50">
                {artifactHistory.map((a, i) => (
                  <button key={i} type="button"
                    onClick={() => { onSelectArtifact?.(i); setShowArtifactMenu(false) }}
                    className="w-full px-4 py-2.5 text-left hover:bg-[#F4F3F0] transition-colors">
                    <p className="text-[12px] font-medium text-[#1C1917] truncate">{a.data.projectName}</p>
                    <p className="text-[10px] text-[#A8A29E]">{a.type === 'visit_booking' ? 'Visit booking' : 'Project card'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="border-t border-[#EEECE8] bg-[#FAFAF8]/90 backdrop-blur-sm px-4 py-3 sticky bottom-0 z-20 flex-shrink-0" style={{ paddingBottom: artifact && !showArtifact ? '60px' : 'env(safe-area-inset-bottom, 0px)' }}>
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about properties in South Bopal & Shela..."
            maxLength={800}
            className="flex-1 bg-white border border-[#E7E5E4] rounded-2xl px-4 py-2.5 text-[16px] text-[#1C1917] placeholder:text-[#C8C4BF] focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/15 focus:border-[#1B4F8A]/50 transition-all duration-200 shadow-luxury-sm"
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
