'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { useRouter } from 'next/navigation'

interface Project {
  id: string
  projectName: string
  builderName: string
  microMarket: 'South Bopal' | 'Shela'
  minPrice: number
  maxPrice: number
  pricePerSqft: number
  availableUnits: number
  possessionDate: string
  reraNumber: string
  unitTypes: string[]
  constructionStatus: 'Under Construction' | 'Ready to Move'
  urgencySignals: {
    fewUnitsLeft: boolean
    priceIncreasedRecently: boolean
    highDemand: boolean
    possessionSoon: boolean
  }
  builder?: {
    grade: 'A' | 'B' | 'C' | 'D' | 'F'
    totalTrustScore: number
  }
}

interface FilterState {
  microMarket: string
  unitType: string
  status: string
  sort: string
}

function formatPrice(price: number): string {
  if (!price || price === 0) return '—'
  if (price >= 10000000) return (price / 10000000).toFixed(1) + 'Cr'
  if (price >= 100000) return (price / 100000).toFixed(0) + 'L'
  return price.toLocaleString('en-IN')
}

function formatPossessionDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-30px' })
  const router = useRouter()

  const getGradeStyles = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'bg-emerald-500/[0.15] text-emerald-400'
      case 'B':
        return 'bg-blue-500/[0.15] text-blue-400'
      case 'C':
        return 'bg-amber-500/[0.15] text-amber-400'
      default:
        return 'bg-red-500/[0.15] text-red-400'
    }
  }

  const getUrgencyBanner = () => {
    const { urgencySignals, availableUnits } = project
    if (urgencySignals.fewUnitsLeft) {
      return {
        text: `Only ${availableUnits} units remaining`,
        styles: 'bg-amber-500/[0.12] border-amber-500/[0.20] text-amber-400'
      }
    }
    if (urgencySignals.priceIncreasedRecently) {
      return {
        text: 'Price increased recently',
        styles: 'bg-red-500/[0.12] border-red-500/[0.20] text-red-400'
      }
    }
    if (urgencySignals.possessionSoon) {
      return {
        text: 'Possession within 12 months',
        styles: 'bg-[#3de8a0]/[0.10] border-[#3de8a0]/[0.20] text-[#3de8a0]'
      }
    }
    return null
  }

  const urgencyBanner = getUrgencyBanner()

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.7, delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
      onClick={() => router.push('/projects/' + project.id)}
      className="rounded-2xl border border-white/[0.08] bg-white/[0.03] cursor-pointer hover:border-white/[0.15] hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="p-5">
        <div className="flex items-center justify-between">
          <span className="bg-[#3de8a0]/[0.10] border border-[#3de8a0]/[0.20] rounded-full px-3 py-1 text-[10px] font-sans text-[#3de8a0]">
            {project.microMarket}
          </span>
          {project.builder && (
            <span className={`rounded-full px-2.5 py-0.5 font-mono text-xs font-bold ${getGradeStyles(project.builder.grade)}`}>
              {project.builder.grade}
            </span>
          )}
        </div>

        <h3 className="font-serif text-xl font-bold text-[#e0e0ea] mt-3 leading-tight">
          {project.projectName}
        </h3>
        <p className="font-sans text-xs text-[#8888a8] mt-0.5">{project.builderName}</p>

        {urgencyBanner && (
          <div className={`w-full mt-3 rounded-full text-center text-[10px] font-sans tracking-wide px-3 py-1 border ${urgencyBanner.styles}`}>
            {urgencyBanner.text}
          </div>
        )}

        <div className="border-t border-white/[0.06] my-4" />

        <div className="font-sans text-base font-semibold text-[#e0e0ea]">
          {project.minPrice && project.maxPrice && project.minPrice > 0 && project.maxPrice > 0
            ? `₹${formatPrice(project.minPrice)} – ₹${formatPrice(project.maxPrice)}`
            : project.pricePerSqft > 0
              ? `₹${project.pricePerSqft.toLocaleString('en-IN')}/sqft`
              : 'Price on request'}
        </div>
        <div className="font-sans text-[11px] text-[#636380] mt-0.5">
          ₹{project.pricePerSqft.toLocaleString('en-IN')}/sqft · {project.unitTypes.join(', ')}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2.5">
            <div className="text-[9px] uppercase tracking-wider text-[#454560]">POSSESSION</div>
            <div className="font-sans text-xs text-[#8888a8] mt-0.5">
              {formatPossessionDate(project.possessionDate)}
            </div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2.5">
            <div className="text-[9px] uppercase tracking-wider text-[#454560]">AVAILABLE</div>
            <div className={`font-sans text-xs mt-0.5 ${project.availableUnits < 20 ? 'text-[#3de8a0]' : 'text-[#8888a8]'}`}>
              {project.availableUnits} units{project.availableUnits < 20 && ' · Low'}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.06] px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#3de8a0]" />
          <span className="font-sans text-[11px] text-[#636380]">RERA Verified</span>
        </div>
        <Link href={`/projects/${project.id}`} className="font-sans text-xs text-[#3de8a0] hover:underline">View details →</Link>
      </div>
    </motion.div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="h-5 w-[20%] rounded-full bg-white/[0.06] animate-pulse" />
        <div className="h-5 w-[10%] rounded-full bg-white/[0.06] animate-pulse" />
      </div>
      <div className="h-6 bg-white/[0.06] rounded mt-4 w-3/4 animate-pulse" />
      <div className="h-3 bg-white/[0.06] rounded mt-2 w-1/2 animate-pulse" />
      <div className="h-px bg-white/[0.06] my-4" />
      <div className="h-5 bg-white/[0.06] rounded w-1/2 animate-pulse" />
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="h-14 bg-white/[0.06] rounded-lg animate-pulse" />
        <div className="h-14 bg-white/[0.06] rounded-lg animate-pulse" />
      </div>
    </div>
  )
}

function FilterPill({
  label,
  active,
  onClick
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`px-4 py-1.5 text-xs font-sans rounded-full cursor-pointer whitespace-nowrap transition-all duration-150 border ${
        active
          ? 'bg-[#3de8a0]/[0.12] border-[#3de8a0]/[0.30] text-[#3de8a0]'
          : 'border-white/[0.10] bg-white/[0.03] text-[#8888a8] hover:border-white/[0.15]'
      }`}
    >
      {label}
    </motion.button>
  )
}

function FilterSeparator() {
  return <div className="h-4 w-px bg-white/[0.08] self-center mx-2 flex-shrink-0" />
}

export default function ProjectsPage() {
  const [filters, setFilters] = useState<FilterState>({
    microMarket: 'all',
    unitType: 'all',
    status: 'all',
    sort: 'newest'
  })
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams(filters as unknown as Record<string, string>)
        const response = await fetch('/api/projects?' + params.toString())
        const data = await response.json()
        setProjects(data)
      } catch (error) {
        console.error('Failed to fetch projects:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [filters])

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      microMarket: 'all',
      unitType: 'all',
      status: 'all',
      sort: 'newest'
    })
  }

  return (
    <div className="min-h-screen bg-[#09090b]">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="pt-32 pb-10"
        >
          <div className="font-sans text-[10px] font-medium tracking-[0.12em] uppercase text-[#3de8a0] mb-3">
            VERIFIED PROJECTS
          </div>
          <Link href="/chat" className="inline-flex items-center gap-1 text-[11px] text-[#636380] hover:text-[#3de8a0] mb-4 transition-colors">
            ← Back to chat
          </Link>
          <h1 className="font-serif text-5xl font-bold text-[#e0e0ea] leading-tight tracking-tight">
            Active projects in South Bopal & Shela
          </h1>
          <p className="font-sans text-sm text-[#636380] mt-3">
            25+ verified listings · Prices updated every 2 weeks · All RERA confirmed
          </p>
        </motion.div>

        <div className="sticky top-[73px] z-40 bg-[#09090b]/90 backdrop-blur-md border-b border-white/[0.08] py-3 -mx-6 px-6">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-nowrap">
            <FilterPill label="All" active={filters.microMarket === 'all'} onClick={() => updateFilter('microMarket', 'all')} />
            <FilterPill label="South Bopal" active={filters.microMarket === 'South Bopal'} onClick={() => updateFilter('microMarket', 'South Bopal')} />
            <FilterPill label="Shela" active={filters.microMarket === 'Shela'} onClick={() => updateFilter('microMarket', 'Shela')} />

            <FilterSeparator />

            <FilterPill label="All" active={filters.unitType === 'all'} onClick={() => updateFilter('unitType', 'all')} />
            <FilterPill label="2BHK" active={filters.unitType === '2BHK'} onClick={() => updateFilter('unitType', '2BHK')} />
            <FilterPill label="3BHK" active={filters.unitType === '3BHK'} onClick={() => updateFilter('unitType', '3BHK')} />
            <FilterPill label="4BHK" active={filters.unitType === '4BHK'} onClick={() => updateFilter('unitType', '4BHK')} />
            <FilterPill label="5BHK" active={filters.unitType === '5BHK'} onClick={() => updateFilter('unitType', '5BHK')} />

            <FilterSeparator />

            <FilterPill label="All" active={filters.status === 'all'} onClick={() => updateFilter('status', 'all')} />
            <FilterPill label="Under Construction" active={filters.status === 'Under Construction'} onClick={() => updateFilter('status', 'Under Construction')} />
            <FilterPill label="Ready to Move" active={filters.status === 'Ready to Move'} onClick={() => updateFilter('status', 'Ready to Move')} />

            <FilterSeparator />

            <FilterPill label="Newest" active={filters.sort === 'newest'} onClick={() => updateFilter('sort', 'newest')} />
            <FilterPill label="Price ↑" active={filters.sort === 'price-asc'} onClick={() => updateFilter('sort', 'price-asc')} />
            <FilterPill label="Price ↓" active={filters.sort === 'price-desc'} onClick={() => updateFilter('sort', 'price-desc')} />
            <FilterPill label="Trust Grade" active={filters.sort === 'trust'} onClick={() => updateFilter('sort', 'trust')} />
          </div>
        </div>

        <div className="py-4 flex items-center justify-between">
          <span className="font-sans text-[13px] text-[#636380]">
            Showing {projects.length} projects
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
                viewMode === 'grid'
                  ? 'border-white/[0.20] bg-white/[0.06]'
                  : 'border-white/[0.10] bg-white/[0.03]'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[#8888a8]">
                <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
                viewMode === 'list'
                  ? 'border-white/[0.20] bg-white/[0.06]'
                  : 'border-white/[0.10] bg-white/[0.03]'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[#8888a8]">
                <line x1="1" y1="3" x2="13" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="1" y1="11" x2="13" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-20">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="pt-24 text-center">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="mx-auto text-[#636380]">
              <circle cx="28" cy="28" r="18" stroke="currentColor" strokeWidth="2" />
              <line x1="41" y1="41" x2="54" y2="54" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="22" y1="22" x2="34" y2="34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="34" y1="22" x2="22" y2="34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="font-sans text-lg text-[#636380] mt-6">No projects match your filters</p>
            <p className="font-sans text-sm text-[#454560] mt-1">Try adjusting your search criteria</p>
            <button
              onClick={clearFilters}
              className="mt-6 rounded-full border border-white/[0.10] bg-white/[0.03] px-6 py-2.5 text-sm font-sans text-[#8888a8] hover:border-white/[0.20] hover:text-[#e0e0ea] transition-all"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className={`pb-20 ${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5' : 'flex flex-col gap-4'}`}>
            {projects.map((project, index) => (
              <ProjectCard key={project.id} project={project} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
