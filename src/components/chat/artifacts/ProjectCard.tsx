'use client'

import { motion } from 'framer-motion'

type ProjectType = {
  id: string; projectName: string; builderName: string
  pricePerSqft: number; minPrice: number; maxPrice: number
  possessionDate: Date | string; constructionStatus: string
  microMarket: string
}

export default function ProjectCard({ project }: { project: ProjectType }) {
  const possession = project.possessionDate
    ? new Date(project.possessionDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : 'TBD'
  const formatL = (n: number | null | undefined) => n ? Math.round(n / 100000) : '—'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="bg-white rounded-2xl border border-[#E7E5E4] overflow-hidden shadow-sm"
    >
      <div className="h-1 bg-gradient-to-r from-[#1B4F8A] to-[#2563EB]" />

      <div className="p-5">
        {/* Name + builder */}
        <h2
          style={{ fontFamily: 'var(--font-playfair)', fontSize: '17px' }}
          className="font-semibold text-[#1C1917] leading-snug"
        >
          {project.projectName}
        </h2>
        <p className="text-[12px] text-[#78716C] mt-1">{project.builderName}</p>

        <div className="my-4 h-px bg-[#F4F3F0]" />

        {/* Price */}
        <p
          style={{ fontFamily: 'var(--font-mono)', fontSize: '24px' }}
          className="font-bold text-[#1B4F8A] leading-none"
        >
          {project.pricePerSqft ? `₹${project.pricePerSqft.toLocaleString('en-IN')}/sqft` : 'Price on request'}
        </p>
        <p className="text-[11px] text-[#A8A29E] mt-0.5">
          {project.minPrice && project.maxPrice
            ? `₹${formatL(project.minPrice)}L – ₹${formatL(project.maxPrice)}L all-in range`
            : 'Price on request'}
        </p>

        {/* Pills */}
        <div className="flex gap-2 mt-4">
          <span className="bg-[#F4F3F0] text-[#78716C] text-[11px] px-2.5 py-1 rounded-full">
            {possession}
          </span>
          <span className="bg-[#E6F1FB] text-[#0C447C] text-[11px] px-2.5 py-1 rounded-full">
            {project.constructionStatus}
          </span>
        </div>

        {/* Location */}
        <p className="text-[12px] text-[#78716C] mt-3">• {project.microMarket}</p>

        {/* CTA */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('book-visit', {
            detail: { projectId: project.id, projectName: project.projectName }
          }))}
          className="w-full mt-4 bg-[#1B4F8A] hover:bg-[#163d6e] text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
        >
          Book OTP-verified visit →
        </button>
      </div>
    </motion.div>
  )
}
