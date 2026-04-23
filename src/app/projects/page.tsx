'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'

interface Project {
  id: string
  projectName: string
  builderName: string
  microMarket: string
  minPrice: number
  maxPrice: number
  pricePerSqft: number
  availableUnits: number
  possessionDate: string
  reraNumber: string
  unitTypes: string[]
  constructionStatus: string
  decisionTag?: string | null
  honestConcern?: string | null
  builder?: {
    grade: string
    totalTrustScore: number
    brandName: string
  }
}

function formatPrice(price: number): string {
  if (!price || price === 0) return '—'
  if (price >= 10000000) return (price / 10000000).toFixed(1) + 'Cr'
  if (price >= 100000) return (price / 100000).toFixed(0) + 'L'
  return price.toLocaleString('en-IN')
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })

  const tagColor = project.decisionTag === 'Strong Buy' ? { bg: 'rgba(15,110,86,0.12)', text: '#0F6E56', dot: '#34D399' }
    : project.decisionTag === 'Buy w/ Cond' ? { bg: 'rgba(27,79,138,0.12)', text: '#1B4F8A', dot: '#60A5FA' }
    : project.decisionTag === 'Wait' ? { bg: 'rgba(251,191,36,0.12)', text: '#92400E', dot: '#FBBF24' }
    : project.decisionTag === 'Avoid' ? { bg: 'rgba(248,113,113,0.12)', text: '#791F1F', dot: '#F87171' }
    : null

  const possession = new Date(project.possessionDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group rounded-2xl overflow-hidden"
      style={{ background: 'var(--landing-bg-card)', border: '1px solid var(--landing-border)', transition: 'border-color 200ms, box-shadow 200ms' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--landing-accent)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(184,146,74,0.08)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--landing-border)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Accent line */}
      <div style={{ height: '2px', background: 'linear-gradient(90deg, var(--landing-accent), transparent)' }} />

      <div className="p-5">
        {/* Top row: area + tag + grade */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--landing-accent)' }}>
            {project.microMarket}
          </span>
          <div className="flex items-center gap-2">
            {tagColor && project.decisionTag && (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: tagColor.bg, color: tagColor.text }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: tagColor.dot }} />
                {project.decisionTag}
              </span>
            )}
            {project.builder && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{
                background: project.builder.grade === 'A' ? 'rgba(15,110,86,0.12)' : project.builder.grade === 'B' ? 'rgba(27,79,138,0.12)' : 'rgba(251,191,36,0.12)',
                color: project.builder.grade === 'A' ? '#0F6E56' : project.builder.grade === 'B' ? '#1B4F8A' : '#92400E',
              }}>
                {project.builder.grade}
              </span>
            )}
          </div>
        </div>

        {/* Name + builder */}
        <Link href={`/projects/${project.id}`} className="block" style={{ textDecoration: 'none' }}>
          <h3 style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '22px', fontWeight: 600, color: 'var(--landing-text-primary)', lineHeight: 1.2, marginBottom: '2px' }}>
            {project.projectName}
          </h3>
        </Link>
        <p className="text-[12px] mb-3" style={{ color: 'var(--landing-text-muted)' }}>{project.builderName}</p>

        {/* Price */}
        <div className="mb-3">
          <span className="text-[20px] font-bold" style={{ fontFamily: 'monospace', color: 'var(--landing-text-primary)' }}>
            ₹{project.pricePerSqft > 0 ? project.pricePerSqft.toLocaleString('en-IN') : '—'}
          </span>
          <span className="text-[11px] ml-1" style={{ color: 'var(--landing-text-muted)' }}>/sqft</span>
          {project.minPrice > 0 && project.maxPrice > 0 && (
            <p className="text-[11px]" style={{ color: 'var(--landing-text-secondary)' }}>
              ₹{formatPrice(project.minPrice)} – ₹{formatPrice(project.maxPrice)}
            </p>
          )}
        </div>

        {/* Meta row */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 rounded-lg px-2.5 py-2" style={{ background: 'var(--landing-bg-subtle)' }}>
            <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--landing-text-muted)' }}>Possession</p>
            <p className="text-[11px] font-medium" style={{ color: 'var(--landing-text-primary)' }}>{possession}</p>
          </div>
          <div className="flex-1 rounded-lg px-2.5 py-2" style={{ background: 'var(--landing-bg-subtle)' }}>
            <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--landing-text-muted)' }}>Units</p>
            <p className="text-[11px] font-medium" style={{ color: project.availableUnits < 20 ? '#0F6E56' : 'var(--landing-text-primary)' }}>
              {project.availableUnits}{project.availableUnits < 20 ? ' · Low' : ''}
            </p>
          </div>
          <div className="flex-1 rounded-lg px-2.5 py-2" style={{ background: 'var(--landing-bg-subtle)' }}>
            <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--landing-text-muted)' }}>Config</p>
            <p className="text-[11px] font-medium truncate" style={{ color: 'var(--landing-text-primary)' }}>{project.unitTypes.slice(0, 2).join(', ')}</p>
          </div>
        </div>

        {/* Honest concern teaser */}
        {project.honestConcern && (
          <div className="rounded-xl px-3 py-2 mb-3" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}>
            <p className="text-[9px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#B8924A' }}>⚠ Honest Concern</p>
            <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: 'var(--landing-text-secondary)' }}>{project.honestConcern}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Link href={`/projects/${project.id}`} className="flex-1" style={{ textDecoration: 'none' }}>
            <button type="button" className="w-full py-2.5 rounded-xl text-[12px] font-medium transition-colors" style={{ background: 'var(--landing-bg-subtle)', color: 'var(--landing-text-secondary)', border: '1px solid var(--landing-border)' }}>
              Learn more →
            </button>
          </Link>
          <Link href={`/chat?project=${encodeURIComponent(project.projectName)}`} style={{ textDecoration: 'none' }}>
            <button type="button" className="px-4 py-2.5 rounded-xl text-[12px] font-medium text-white" style={{ background: '#1B4F8A' }}>
              Chat
            </button>
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--landing-bg-card)', border: '1px solid var(--landing-border)' }}>
      <div className="h-4 w-20 rounded-full animate-pulse mb-3" style={{ background: 'var(--landing-border)' }} />
      <div className="h-6 w-3/4 rounded animate-pulse mb-2" style={{ background: 'var(--landing-border)' }} />
      <div className="h-3 w-1/2 rounded animate-pulse mb-4" style={{ background: 'var(--landing-border)' }} />
      <div className="h-5 w-1/3 rounded animate-pulse mb-3" style={{ background: 'var(--landing-border)' }} />
      <div className="grid grid-cols-3 gap-2">
        <div className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--landing-border)' }} />
        <div className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--landing-border)' }} />
        <div className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--landing-border)' }} />
      </div>
    </div>
  )
}

type FilterKey = 'area' | 'status' | 'sort'

export default function ProjectsPage() {
  const [area, setArea] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('newest')
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams()
    if (area !== 'all') params.set('microMarket', area)
    if (status !== 'all') params.set('status', status)
    params.set('sort', sort)
    setLoading(true)
    fetch('/api/projects?' + params.toString())
      .then(r => r.json())
      .then(data => setProjects(data))
      .catch(err => console.error('Failed to fetch projects:', err))
      .finally(() => setLoading(false))
  }, [area, status, sort])

  const pill = (label: string, active: boolean, onClick: () => void) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      className="px-4 py-1.5 text-[12px] font-medium rounded-full whitespace-nowrap transition-all"
      style={{
        background: active ? 'var(--landing-accent-light)' : 'transparent',
        color: active ? 'var(--landing-accent)' : 'var(--landing-text-muted)',
        border: `1px solid ${active ? 'var(--landing-accent)' : 'var(--landing-border)'}`,
      }}
    >
      {label}
    </button>
  )

  return (
    <>
      {/* Landing-scope CSS tokens (--landing-*) live in globals.css so the
          pre-hydration theme script covers them — prevents dark-mode FOUC. */}
      <div style={{ background: 'var(--landing-bg)', minHeight: '100vh', fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}>
        <div className="max-w-6xl mx-auto px-6">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="pt-28 pb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div style={{ width: '32px', height: '1px', background: 'var(--landing-accent)' }} />
              <span className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--landing-accent)' }}>
                Verified Projects
              </span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, color: 'var(--landing-text-primary)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              South Bopal &amp; Shela
            </h1>
            <p className="text-[14px] mt-2" style={{ color: 'var(--landing-text-secondary)', maxWidth: '440px', lineHeight: 1.7 }}>
              {projects.length > 0 ? `${projects.length} active projects` : 'Loading...'} · Prices updated every 2 weeks · RERA verified
            </p>
          </motion.div>

          {/* Filters */}
          <div className="sticky top-[64px] z-30 py-3 -mx-6 px-6" style={{ background: 'var(--landing-bg)', borderBottom: '1px solid var(--landing-border)' }}>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {pill('All Areas', area === 'all', () => setArea('all'))}
              {pill('South Bopal', area === 'South Bopal', () => setArea('South Bopal'))}
              {pill('Shela', area === 'Shela', () => setArea('Shela'))}
              <div className="w-px h-5 mx-1" style={{ background: 'var(--landing-border)' }} />
              {pill('All', status === 'all', () => setStatus('all'))}
              {pill('Under Construction', status === 'Under Construction', () => setStatus('Under Construction'))}
              {pill('Ready to Move', status === 'Ready to Move', () => setStatus('Ready to Move'))}
              <div className="w-px h-5 mx-1" style={{ background: 'var(--landing-border)' }} />
              {pill('Newest', sort === 'newest', () => setSort('newest'))}
              {pill('Price ↑', sort === 'price-asc', () => setSort('price-asc'))}
              {pill('Price ↓', sort === 'price-desc', () => setSort('price-desc'))}
              {pill('Trust', sort === 'trust', () => setSort('trust'))}
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 py-8 pb-20">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : projects.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-[16px]" style={{ color: 'var(--landing-text-muted)' }}>No projects match your filters</p>
              <button
                type="button"
                onClick={() => { setArea('all'); setStatus('all'); setSort('newest') }}
                className="mt-4 px-6 py-2.5 text-[13px] font-medium rounded-lg"
                style={{ background: 'var(--landing-bg-subtle)', color: 'var(--landing-text-secondary)', border: '1px solid var(--landing-border)' }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 py-8 pb-20">
              {projects.map((project, index) => (
                <ProjectCard key={project.id} project={project} index={index} />
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  )
}
