'use client'

import { motion, AnimatePresence } from 'framer-motion'
import ProjectCard from './artifacts/ProjectCard'

type ProjectType = {
  id: string; projectName: string; builderName: string
  pricePerSqft: number; minPrice: number; maxPrice: number
  possessionDate: Date | string; constructionStatus: string
  microMarket: string
}

export default function ChatRightPanel({ artifact }: { artifact: ProjectType | null }) {
  return (
    <div className="w-80 flex-shrink-0 h-full border-l border-[#E7E5E4] bg-[#FAFAF8] overflow-y-auto p-4 hidden lg:block">
      <AnimatePresence mode="wait">
        {artifact ? (
          <motion.div
            key={artifact.id}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-[11px] font-medium text-[#A8A29E] uppercase tracking-wider mb-3">Project details</p>
            <ProjectCard project={artifact} />
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full flex flex-col items-center justify-center relative"
          >
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle, #D6D3D1 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }} />
            <div className="absolute inset-0" style={{
              background: 'radial-gradient(ellipse at center, transparent 20%, #FAFAF8 75%)'
            }} />
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
  )
}
