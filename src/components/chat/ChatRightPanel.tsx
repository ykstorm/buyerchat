'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { m, AnimatePresence, useReducedMotion } from 'framer-motion'
import type { ProjectType, Artifact } from '@/lib/types/chat'
import type { BuilderAIContext } from '@/lib/types/builder-ai-context'

// Lazy-load all artifact renderers — each pulls framer-motion + chart/date
// utilities that we don't need until an artifact actually mounts. ssr:false
// is safe because ChatRightPanel is client-only (hidden on mobile via `lg:`).
// Placeholders preserve approximate rendered heights to avoid layout shift
// and use dark-mode-aware tokens matching the rest of the chat surface.
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
  () => import('./artifacts/VisitBooking').then(m => ({ default: m.VisitBooking })),
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

export default function ChatRightPanel({
  artifact,
  builders = [],
  onArtifactBack,
  onArtifactForward,
  canGoBack,
  canGoForward,
  artifactCurrent,
  artifactTotal,
  artifactHistory,
  onSelectArtifact,
}: {
  artifact: Artifact | null
  builders?: BuilderAIContext[]
  onArtifactBack?: () => void
  onArtifactForward?: () => void
  canGoBack?: boolean
  canGoForward?: boolean
  artifactCurrent?: number
  artifactTotal?: number
  artifactHistory?: Artifact[]
  onSelectArtifact?: (index: number) => void
}) {
  // Resolve a builder for a builder_trust artifact: prefer artifact.builder attached
  // at parse time, fall back to name lookup in the builders prop.
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
  const [showHistoryMenu, setShowHistoryMenu] = React.useState(false)
  const prefersReduced = useReducedMotion()

  return (
    <>
      {/* Desktop right panel */}
      <div className="w-[380px] flex-shrink-0 h-full overflow-y-auto p-4 hidden lg:block" style={{ borderLeft: '1px solid var(--border)', background: 'var(--bg-base)' }}>
        <AnimatePresence mode="wait">
          {artifact ? (
            <m.div
              key={artifact.data.id + artifact.type}
              initial={prefersReduced ? false : { x: 16, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={prefersReduced ? { opacity: 0 } : { x: -12, opacity: 0 }}
              transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 22 }}
            >
              {(canGoBack || canGoForward) && (
                <div className="flex items-center gap-2 mb-3">
                  <button type="button" onClick={onArtifactBack} disabled={!canGoBack}
                    className="text-[11px] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 px-2 py-1 rounded-lg transition-colors"
                    style={{ color: 'var(--text-secondary)' }}>
                    ← Back
                  </button>
                  <button type="button" onClick={onArtifactForward} disabled={!canGoForward}
                    className="text-[11px] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 px-2 py-1 rounded-lg transition-colors"
                    style={{ color: 'var(--text-secondary)' }}>
                    Forward →
                  </button>
                  {artifactTotal && artifactTotal > 1 && (
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{artifactCurrent} of {artifactTotal}</span>
                  )}
                  {artifactHistory && artifactHistory.length > 1 && (
                    <div className="relative ml-auto">
                      <button type="button"
                        onClick={e => { e.stopPropagation(); setShowHistoryMenu(v => !v) }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                        style={{ border: '1px solid var(--border)' }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                        </svg>
                      </button>
                      {showHistoryMenu && (
                        <div className="absolute right-0 top-9 rounded-xl shadow-lg py-1.5 min-w-[180px] z-50" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                          {artifactHistory.map((a, i) => (
                            <button key={i} type="button"
                              onClick={() => { onSelectArtifact?.(i); setShowHistoryMenu(false) }}
                              className="w-full px-3 py-2 text-left transition-colors"
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                              <p className="text-[11px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                {a.type === 'comparison' && a.dataB ? `${a.data.projectName.split(' ')[0]} vs ${a.dataB.projectName.split(' ')[0]}` : a.data.projectName}
                              </p>
                              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                {a.type === 'visit_booking' ? 'Visit booking' : a.type === 'comparison' ? 'Comparison' : a.type === 'cost_breakdown' ? 'Cost breakdown' : 'Project card'}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {artifact.type === 'visit_booking' ? (
                <>
                  <p className="text-[11px] font-medium text-[#A8A29E] uppercase tracking-wider mb-3">Book a visit</p>
                  <VisitBooking
                    projectId={artifact.data.id}
                    projectName={artifact.data.projectName}
                  />
                </>
              ) : artifact.type === 'comparison' && artifact.dataB ? (
                <>
                  <p className="text-[11px] font-medium text-[#A8A29E] uppercase tracking-wider mb-3">Comparison</p>
                  <ComparisonCard projectA={artifact.data} projectB={artifact.dataB} />
                </>
              ) : artifact.type === 'cost_breakdown' ? (
                <>
                  <p className="text-[11px] font-medium text-[#A8A29E] uppercase tracking-wider mb-3">Cost breakdown</p>
                  <CostBreakdownCard project={artifact.data} />
                </>
              ) : artifact.type === 'visit_prompt' ? (
                <>
                  <p className="text-[11px] font-medium text-[#A8A29E] uppercase tracking-wider mb-3">Visit this project</p>
                  <VisitPromptCard project={artifact.data} />
                </>
              ) : artifact.type === 'builder_trust' ? (
                <>
                  <p className="text-[11px] font-medium text-[#A8A29E] uppercase tracking-wider mb-3">Builder trust</p>
                  {(() => {
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
                  })()}
                </>
              ) : (
                <>
                  <p className="text-[11px] font-medium text-[#A8A29E] uppercase tracking-wider mb-3">Project details</p>
                  <ProjectCard project={artifact.data} />
                </>
              )}
            </m.div>
          ) : (
            <m.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center relative"
            >
              <m.div
                className="absolute inset-0"
                animate={{
                  background: [
                    'radial-gradient(ellipse at 20% 50%, #1B4F8A08 0%, transparent 60%)',
                    'radial-gradient(ellipse at 80% 50%, #1B4F8A08 0%, transparent 60%)',
                    'radial-gradient(ellipse at 20% 50%, #1B4F8A08 0%, transparent 60%)',
                  ]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="relative z-10 text-center">
                <div className="text-[28px] text-[#D6D3D1] mb-3">↗</div>
                <p className="text-[12px] text-[#A8A29E] leading-relaxed">
                  Project details<br />appear here as<br />you chat
                </p>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>

    </>
  )
}
