'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'

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
  pricePerSqftType?: string | null
  loadingFactor?: number | null
  allInPrice?: number | null
  trustScore?: number | null
  trustGrade?: string | null
}

const formatL = (n: number | null | undefined) => n ? Math.round(n / 100000) : null
const emi = (allIn: number) => Math.round(allIn * 0.00729 * Math.pow(1.00729, 240) / (Math.pow(1.00729, 240) - 1))

export default function ProjectCardV2({ project }: { project: ProjectType }) {
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hovered, setHovered] = useState(false)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useTransform(y, [-100, 100], [4, -4])
  const rotateY = useTransform(x, [-100, 100], [-4, 4])
  const lastMoveTs = useRef(0)

  useEffect(() => {
    fetch('/api/saved').then(r => r.json()).then(data => {
      if ((data.savedProjects ?? []).some((s: any) => s.projectId === project.id)) setSaved(true)
    }).catch(() => {})
  }, [project.id])

  const toggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (saving) return
    setSaving(true)
    const prev = saved
    setSaved(!saved)
    try {
      const res = await fetch('/api/saved', {
        method: prev ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id })
      })
      if (prev ? !res.ok : (!res.ok && res.status !== 409)) setSaved(prev)
      else window.dispatchEvent(new CustomEvent('saved-projects-updated'))
    } catch { setSaved(prev) }
    setSaving(false)
  }

  const possession = project.possessionDate
    ? new Date(project.possessionDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : 'TBD'

  const tagColor = project.decisionTag === 'Strong Buy' ? { bg: '#E1F5EE', text: '#085041', dot: '#34D399' }
    : project.decisionTag === 'Buy w/ Cond' ? { bg: '#E6F1FB', text: '#0C447C', dot: '#60A5FA' }
    : project.decisionTag === 'Wait' ? { bg: '#FAEEDA', text: '#633806', dot: '#FBBF24' }
    : { bg: '#FCEBEB', text: '#791F1F', dot: '#F87171' }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      onMouseMove={e => {
        const now = Date.now()
        if (now - lastMoveTs.current < 30) return
        lastMoveTs.current = now
        const rect = e.currentTarget.getBoundingClientRect()
        x.set(e.clientX - rect.left - rect.width / 2)
        y.set(e.clientY - rect.top - rect.height / 2)
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); x.set(0); y.set(0) }}
      className="relative overflow-hidden rounded-2xl"
      style={{ background: '#FAFAF9', border: '1px solid #E7E5E4', boxShadow: hovered ? '0 20px 60px rgba(27,79,138,0.12)' : '0 4px 20px rgba(0,0,0,0.06)' }}
    >
      {/* Gradient accent top */}
      <div className="h-0.5 bg-gradient-to-r from-[#1B4F8A] via-[#3B82F6] to-[#1B4F8A]" />

      {/* Photo placeholder with gradient */}
      <div className="relative h-28 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1B3A6B 0%, #1B4F8A 50%, #2563EB 100%)' }}>
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="white"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><polyline points="9 22 9 12 15 12 15 22" fill="white"/></svg>
        </div>
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 opacity-20"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', backgroundSize: '200% 100%' }}
          animate={{ backgroundPosition: hovered ? ['0% 0%', '200% 0%'] : '0% 0%' }}
          transition={{ duration: 1.5, ease: 'linear', repeat: hovered ? Infinity : 0 }}
        />
        {/* Tag */}
        {project.decisionTag && (
          <div className="absolute top-3 left-3">
            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: tagColor.bg, color: tagColor.text }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: tagColor.dot }} />
              {project.decisionTag}
            </span>
          </div>
        )}
        {/* Save button */}
        <motion.button
          type="button"
          onClick={toggleSave}
          whileTap={{ scale: 0.85 }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm"
          style={{ background: saved ? '#1B4F8A' : 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={saved ? 'white' : 'none'} stroke="white" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
          </svg>
        </motion.button>
        {/* Location */}
        <div className="absolute bottom-3 left-3">
          <span className="text-[10px] font-medium text-white/70 uppercase tracking-wider">{project.microMarket}</span>
        </div>
      </div>

      <div className="p-4">
        {/* Name */}
        <h2 style={{ fontFamily: 'var(--font-playfair)' }} className="text-[17px] font-semibold text-[#1C1917] leading-tight mb-0.5">
          {project.projectName}
        </h2>
        <p className="text-[11px] text-[#78716C] mb-3">{project.builderName}</p>

        {/* Price */}
        {project.pricePerSqft ? (
          <div className="mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[22px] font-bold text-[#1B4F8A]" style={{ fontFamily: 'var(--font-mono)' }}>
                ₹{project.pricePerSqft.toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] text-[#A8A29E]">/sqft SBU</span>
            </div>
            {project.loadingFactor && (
              <p className="text-[10px] text-[#A8A29E]">₹{Math.round(project.pricePerSqft * (project.loadingFactor ?? 1.37)).toLocaleString('en-IN')}/sqft Carpet</p>
            )}
            {project.allInPrice && project.allInPrice > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-2 rounded-xl px-3 py-2"
                style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-semibold text-[#0F6E56] uppercase tracking-wider">ALL-IN</p>
                    <p className="text-[16px] font-bold text-[#0F6E56]">₹{Math.round(project.allInPrice / 100000)}L</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-[#52525B] uppercase tracking-wider">EMI ~</p>
                    <p className="text-[12px] font-semibold text-[#0F6E56]">₹{emi(project.allInPrice).toLocaleString('en-IN')}/mo</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          <p className="text-[13px] text-[#A8A29E] mb-3">Price on request</p>
        )}

        {/* Meta row */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 rounded-lg px-2.5 py-2" style={{ background: '#F4F3F0' }}>
            <p className="text-[9px] uppercase tracking-wider text-[#A8A29E]">Possession</p>
            <p className="text-[11px] font-medium text-[#1C1917]">{possession}</p>
          </div>
          <div className="flex-1 rounded-lg px-2.5 py-2" style={{ background: '#F4F3F0' }}>
            <p className="text-[9px] uppercase tracking-wider text-[#A8A29E]">Status</p>
            <p className="text-[11px] font-medium text-[#1C1917]">{project.constructionStatus === 'Under Construction' ? 'UC' : 'RTM'}</p>
          </div>
          {project.configurations && (
            <div className="flex-1 rounded-lg px-2.5 py-2" style={{ background: '#F4F3F0' }}>
              <p className="text-[9px] uppercase tracking-wider text-[#A8A29E]">Config</p>
              <p className="text-[11px] font-medium text-[#1C1917] truncate">{project.configurations.split(',')[0]}</p>
            </div>
          )}
        </div>

        {/* Honest Concern */}
        {project.honestConcern && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl px-3 py-2.5 mb-3"
            style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}
          >
            <p className="text-[9px] font-semibold text-[#92400E] uppercase tracking-wider mb-0.5">⚠ Honest Concern</p>
            <p className="text-[11px] text-[#78350F] leading-relaxed">{project.honestConcern}</p>
          </motion.div>
        )}

        {/* Analyst note */}
        {project.analystNote && (
          <div className="rounded-xl px-3 py-2.5 mb-3" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <p className="text-[9px] font-semibold text-[#1E40AF] uppercase tracking-wider mb-0.5">💡 Insider Note</p>
            <p className="text-[11px] text-[#1E3A8A] leading-relaxed">{project.analystNote}</p>
          </div>
        )}

        {/* Trust score bar — real DB value */}
        {project.trustScore && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#A8A29E' }}>Builder Trust</span>
              <span className="text-[9px] font-medium" style={{ color: '#1B4F8A' }}>
                {project.trustScore}/100 · Grade {project.trustGrade ?? (project.trustScore >= 80 ? 'A' : project.trustScore >= 65 ? 'B' : project.trustScore >= 50 ? 'C' : 'D')}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#F4F3F0' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${project.trustScore}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                className="h-full rounded-full"
                style={{ background: project.trustScore >= 80 ? '#0F6E56' : project.trustScore >= 65 ? '#1B4F8A' : '#F59E0B' }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => window.dispatchEvent(new CustomEvent('book-visit', { detail: { projectId: project.id } }))}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #1B4F8A, #2563EB)' }}
          >
            Book visit →
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="px-4 py-2.5 rounded-xl text-[12px] font-medium border transition-all"
            style={{ borderColor: '#E7E5E4', color: '#78716C' }}
          >
            Compare
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
