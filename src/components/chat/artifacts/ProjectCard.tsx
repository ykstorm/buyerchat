'use client'

import { motion } from 'framer-motion'

type ProjectType = {
  id: string; projectName: string; builderName: string
  pricePerSqft: number; minPrice: number; maxPrice: number
  possessionDate: Date | string; constructionStatus: string
  microMarket: string
}

const formatL = (n: number | null | undefined) => n ? Math.round(n / 100000) : null

export default function ProjectCard({ project }: { project: ProjectType }) {
  const possession = project.possessionDate
    ? new Date(project.possessionDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : 'TBD'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#E7E5E4]"
    >
      {/* Top accent */}
      <div className="h-0.5 bg-gradient-to-r from-[#1B4F8A] via-[#2563EB] to-[#1B4F8A]" />

      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-[#F4F3F0]">
        <p className="text-[10px] font-medium text-[#A8A29E] uppercase tracking-widest mb-1">
          {project.microMarket ?? 'South Bopal & Shela'}
        </p>
        <h2 style={{ fontFamily: 'var(--font-playfair)' }} className="text-[18px] font-semibold text-[#1C1917] leading-tight">
          {project.projectName}
        </h2>
        <p className="text-[12px] text-[#78716C] mt-0.5">{project.builderName}</p>
      </div>

      {/* Price block */}
      <div className="px-5 py-4 border-b border-[#F4F3F0]">
        <p style={{ fontFamily: 'var(--font-mono)' }} className="text-[26px] font-bold text-[#1B4F8A] leading-none">
          {project.pricePerSqft ? `₹${project.pricePerSqft.toLocaleString('en-IN')}` : '—'}
          <span className="text-[13px] font-normal text-[#A8A29E] ml-1">/sqft</span>
        </p>
        <p className="text-[12px] text-[#78716C] mt-1.5">
          {formatL(project.minPrice) && formatL(project.maxPrice)
            ? `₹${formatL(project.minPrice)}L – ₹${formatL(project.maxPrice)}L all-in`
            : 'Price on request'}
        </p>
      </div>

      {/* Details */}
      <div className="px-5 py-4 flex gap-2 flex-wrap">
        <span className="text-[11px] bg-[#F4F3F0] text-[#52525B] px-2.5 py-1 rounded-full">
          📅 {possession}
        </span>
        <span className="text-[11px] bg-[#E6F1FB] text-[#0C447C] px-2.5 py-1 rounded-full">
          {project.constructionStatus ?? 'Under Construction'}
        </span>
      </div>

      {/* CTA */}
      <div className="px-5 pb-5">
        <motion.button
          type="button"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => window.dispatchEvent(new CustomEvent('book-visit', { detail: { projectId: project.id, projectName: project.projectName } }))}
          className="w-full bg-[#1B4F8A] hover:bg-[#163d6e] text-white text-[13px] font-medium py-2.5 rounded-xl transition-colors"
        >
          Book OTP-verified visit →
        </motion.button>
      </div>
    </motion.div>
  )
}
