'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

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
}

const formatL = (n: number | null | undefined) => n ? Math.round(n / 100000) : null

export default function ProjectCard({ project }: { project: ProjectType }) {
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const toggleSave = async () => {
    if (saving) return
    setSaving(true)
    const prev = saved
    setSaved(!saved)
    try {
      if (prev) {
        const res = await fetch('/api/saved', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: project.id })
        })
        if (!res.ok) setSaved(true)
        else window.dispatchEvent(new CustomEvent('saved-projects-updated'))
      } else {
        const res = await fetch('/api/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: project.id })
        })
        if (!res.ok && res.status !== 409) setSaved(false)
        else window.dispatchEvent(new CustomEvent('saved-projects-updated'))
      }
    } catch { setSaved(prev) }
    setSaving(false)
  }

  useEffect(() => {
    let cancelled = false
    fetch('/api/saved')
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        const ids = (data.savedProjects ?? []).map((s: any) => s.projectId)
        if (ids.includes(project.id)) setSaved(true)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [project.id])

  const possession = project.possessionDate
    ? new Date(project.possessionDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : 'TBD'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="bg-white rounded-2xl overflow-hidden shadow-luxury-card border-0"
    >
      {/* Top accent */}
      <div className="h-0.5 bg-gradient-to-r from-[#1B4F8A] via-[#2563EB] to-[#1B4F8A]" />

      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-[#F4F3F0]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-[#1B4F8A] flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><polyline points="9 22 9 12 15 12 15 22" fill="white"/></svg>
          </div>
          <span className="text-[10px] font-semibold text-[#A8A29E] uppercase tracking-wider">BuyerChat Pick</span>
        </div>
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
        {project.pricePerSqft ? (
          <>
            <div className="flex items-baseline gap-3 mb-1.5">
              <p style={{ fontFamily: 'var(--font-mono)' }} className="text-[26px] font-bold text-[#1B4F8A] leading-none">
                ₹{project.pricePerSqft.toLocaleString('en-IN')}
                <span className="text-[13px] font-normal text-[#A8A29E] ml-1">/sqft SBU</span>
              </p>
            </div>
            {project.loadingFactor && (
              <p className="text-[11px] text-[#A8A29E] mb-2">
                ₹{Math.round(project.pricePerSqft * (project.loadingFactor ?? 1.37)).toLocaleString('en-IN')}/sqft Carpet
              </p>
            )}
            {project.allInPrice && project.allInPrice > 0 ? (
              <div className="rounded-xl px-3 py-2 mt-2" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <p className="text-[10px] font-semibold text-[#0F6E56] uppercase tracking-wider mb-0.5">ALL-IN Total</p>
                <p className="text-[18px] font-bold text-[#0F6E56]">₹{Math.round(project.allInPrice / 100000)}L</p>
                <p className="text-[10px] text-[#52525B]">EMI ~₹{Math.round(project.allInPrice * 0.00875 / 12 * Math.pow(1.00729, 240) / (Math.pow(1.00729, 240) - 1)).toLocaleString('en-IN')}/mo · 20yr @ 8.75%</p>
              </div>
            ) : formatL(project.minPrice) && formatL(project.maxPrice) ? (
              <p className="text-[12px] text-[#78716C] mt-1">₹{formatL(project.minPrice)}L – ₹{formatL(project.maxPrice)}L</p>
            ) : null}
          </>
        ) : (
          <p className="text-[13px] text-[#A8A29E]">Price on request</p>
        )}
      </div>

      {/* Details */}
      <div className="px-5 py-4 border-b border-[#F4F3F0] flex gap-2 flex-wrap">
        {project.decisionTag && (
          <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
            project.decisionTag === 'Strong Buy' ? 'bg-[#E1F5EE] text-[#085041]' :
            project.decisionTag === 'Buy w/ Cond' ? 'bg-[#E6F1FB] text-[#0C447C]' :
            project.decisionTag === 'Wait' ? 'bg-[#FAEEDA] text-[#633806]' :
            'bg-[#FCEBEB] text-[#791F1F]'
          }`}>
            {project.decisionTag}
          </span>
        )}
        <span className="text-[11px] bg-[#F4F3F0] text-[#52525B] px-2.5 py-1 rounded-full">
          📅 {possession}
        </span>
        <span className="text-[11px] bg-[#E6F1FB] text-[#0C447C] px-2.5 py-1 rounded-full">
          {project.constructionStatus ?? 'Under Construction'}
        </span>
        {project.configurations && (
          <span className="text-[11px] bg-[#F4F3F0] text-[#52525B] px-2.5 py-1 rounded-full">
            {project.configurations}
          </span>
        )}
      </div>

      {/* Honest Concern */}
      {project.honestConcern && (
        <div className="px-5 py-3 border-b border-[#F4F3F0] bg-[#FFFBF0]">
          <p className="text-[10px] font-semibold text-[#BA7517] uppercase tracking-wider mb-1">⚠️ Honest Concern</p>
          <p className="text-[12px] text-[#78716C] leading-relaxed">{project.honestConcern}</p>
        </div>
      )}

      {/* Analyst Note */}
      {project.analystNote && (
        <div className="px-5 py-3 border-b border-[#F4F3F0] bg-[#F0F7FF]">
          <p className="text-[10px] font-semibold text-[#1B4F8A] uppercase tracking-wider mb-1">💡 Analyst Note</p>
          <p className="text-[12px] text-[#78716C] leading-relaxed">{project.analystNote}</p>
        </div>
      )}

      {/* Bank Approvals + Price Note */}
      {(project.bankApprovals || project.priceNote) && (
        <div className="px-5 py-3 border-b border-[#F4F3F0]">
          {project.priceNote && (
            <p className="text-[11px] text-[#78716C] mb-1">💰 {project.priceNote}</p>
          )}
          {project.bankApprovals && (
            <p className="text-[11px] text-[#78716C]">🏦 {project.bankApprovals}</p>
          )}
        </div>
      )}

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
        <button
          type="button"
          onClick={toggleSave}
          className={`w-full mt-3 py-2 rounded-xl border text-[12px] font-medium flex items-center justify-center gap-2 transition-colors ${
            saved
              ? 'border-[#1B4F8A] text-[#1B4F8A] bg-[#EEF4FF]'
              : 'border-[#E7E5E4] text-[#78716C] hover:bg-[#F4F3F0]'
          }`}
        >
          {saved ? '★ Saved' : '☆ Save project'}
        </button>
        <button
          type="button"
          onClick={async () => {
            const url = `${window.location.origin}/projects/${project.id}`
            if (navigator.share) {
              try {
                await navigator.share({ title: project.projectName, text: `Check out ${project.projectName} on BuyerChat`, url })
              } catch (err: any) {
                if (err?.name === 'AbortError') return // user cancelled — not an error
                navigator.clipboard.writeText(url)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }
            } else {
              navigator.clipboard.writeText(url)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }
          }}
          className="w-full mt-3 py-2 rounded-xl border border-[#E7E5E4] text-[12px] text-[#78716C] hover:bg-[#F4F3F0] transition-colors flex items-center justify-center gap-2"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
          {copied ? 'Link copied!' : 'Share project'}
        </button>
      </div>
    </motion.div>
  )
}
