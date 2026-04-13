'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ProjectCard from './artifacts/ProjectCardV2'
import ComparisonCard from './artifacts/ComparisonCard'
import { VisitBooking } from './artifacts/VisitBooking'

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

type Artifact = { type: 'project_card' | 'visit_booking' | 'comparison'; data: ProjectType; dataB?: ProjectType }

export default function ChatRightPanel({
  artifact,
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
  onArtifactBack?: () => void
  onArtifactForward?: () => void
  canGoBack?: boolean
  canGoForward?: boolean
  artifactCurrent?: number
  artifactTotal?: number
  artifactHistory?: Artifact[]
  onSelectArtifact?: (index: number) => void
}) {
  const [showHistoryMenu, setShowHistoryMenu] = React.useState(false)

  return (
    <>
      {/* Desktop right panel */}
      <div className="w-80 flex-shrink-0 h-full border-l border-[#E7E5E4] bg-[#FAFAF8] overflow-y-auto p-4 hidden lg:block">
        <AnimatePresence mode="wait">
          {artifact ? (
            <motion.div
              key={artifact.data.id + artifact.type}
              initial={{ x: 40, opacity: 0, scale: 0.96 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28, mass: 0.8 }}
            >
              {(canGoBack || canGoForward) && (
                <div className="flex items-center gap-2 mb-3">
                  <button type="button" onClick={onArtifactBack} disabled={!canGoBack}
                    className="text-[11px] text-[#78716C] disabled:text-[#D6D3D1] hover:text-[#1C1917] disabled:cursor-not-allowed flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[#F4F3F0] transition-colors">
                    ← Back
                  </button>
                  <button type="button" onClick={onArtifactForward} disabled={!canGoForward}
                    className="text-[11px] text-[#78716C] disabled:text-[#D6D3D1] hover:text-[#1C1917] disabled:cursor-not-allowed flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[#F4F3F0] transition-colors">
                    Forward →
                  </button>
                  {artifactTotal && artifactTotal > 1 && (
                    <span className="text-[10px] text-[#A8A29E]">{artifactCurrent} of {artifactTotal}</span>
                  )}
                  {artifactHistory && artifactHistory.length > 1 && (
                    <div className="relative ml-auto">
                      <button type="button"
                        onClick={e => { e.stopPropagation(); setShowHistoryMenu(v => !v) }}
                        className="w-7 h-7 rounded-lg border border-[#E7E5E4] flex items-center justify-center hover:bg-[#F4F3F0] transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#78716C" strokeWidth="2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                        </svg>
                      </button>
                      {showHistoryMenu && (
                        <div className="absolute right-0 top-9 bg-white border border-[#E7E5E4] rounded-xl shadow-lg py-1.5 min-w-[180px] z-50">
                          {artifactHistory.map((a, i) => (
                            <button key={i} type="button"
                              onClick={() => { onSelectArtifact?.(i); setShowHistoryMenu(false) }}
                              className="w-full px-3 py-2 text-left hover:bg-[#F4F3F0] transition-colors">
                              <p className="text-[11px] font-medium text-[#1C1917] truncate">{a.data.projectName}</p>
                              <p className="text-[10px] text-[#A8A29E]">Project card</p>
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
              ) : (
                <>
                  <p className="text-[11px] font-medium text-[#A8A29E] uppercase tracking-wider mb-3">Project details</p>
                  <ProjectCard project={artifact.data} />
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center relative"
            >
              <motion.div
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </>
  )
}
