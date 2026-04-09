'use client'

import { motion, AnimatePresence } from 'framer-motion'
import ProjectCard from './artifacts/ProjectCard'
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

type Artifact = { type: 'project_card' | 'visit_booking'; data: ProjectType }

export default function ChatRightPanel({
  artifact,
  onArtifactBack,
}: {
  artifact: Artifact | null
  onArtifactBack?: () => void
}) {
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
              {artifact.type === 'visit_booking' ? (
                <>
                  <p className="text-[11px] font-medium text-[#A8A29E] uppercase tracking-wider mb-3">Book a visit</p>
                  <VisitBooking
                    projectId={artifact.data.id}
                    projectName={artifact.data.projectName}
                    onBack={onArtifactBack}
                  />
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
