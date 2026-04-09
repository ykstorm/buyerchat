'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { VisitBookingModal } from '@/components/VisitBookingModal'
interface ProjectDetail {
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
  amenities: string[]
  latitude: number
  longitude: number
  isActive: boolean
  builder?: {
    brandName: string
    grade: string
    totalTrustScore: number
    deliveryScore: number
    reraScore: number
    qualityScore: number
    financialScore: number
    responsivenessScore: number
  }
  priceHistory?: {
    pricePerSqft: number
    recordedAt: string
  }[]
  urgencySignals: {
    fewUnitsLeft: boolean
    priceIncreasedRecently: boolean
    highDemand: boolean
    possessionSoon: boolean
  }
}

function formatPrice(rupees: number): string {
  if (rupees >= 10000000) return (rupees / 10000000).toFixed(1) + 'Cr'
  if (rupees >= 100000) return Math.round(rupees / 100000) + 'L'
  return rupees.toLocaleString('en-IN')
}

function calculateEMI(principal: number, annualRate: number, years: number): number {
  const r = annualRate / 12 / 100
  const n = years * 12
  return Math.round(principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1))
}

function formatPossession(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

const transition = {
    duration: 0.65,
    ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
  }

function NotFoundState() {
  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-6">
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-10 text-center max-w-md">
        <h1 className="font-serif text-2xl text-[#e0e0ea]">Project not found</h1>
        <p className="font-sans text-sm text-[#636380] mt-2">
          This project may have been removed or the link is incorrect.
        </p>
        <Link
          href="/projects"
          className="inline-block mt-6 font-sans text-sm text-[#3de8a0] hover:underline underline-offset-2"
        >
          ← Back to projects
        </Link>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#09090b] pt-28 pb-24">
      <div className="max-w-5xl mx-auto px-6">
        <div className="h-6 w-24 bg-white/[0.04] rounded-xl animate-pulse mb-8" />
        <div className="h-12 w-3/4 bg-white/[0.04] rounded-xl animate-pulse mt-4" />
        <div className="h-4 w-1/3 bg-white/[0.04] rounded-xl animate-pulse mt-2" />
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-5">
            <div className="h-64 bg-white/[0.04] rounded-2xl animate-pulse" />
            <div className="h-80 bg-white/[0.04] rounded-2xl animate-pulse" />
            <div className="h-32 bg-white/[0.04] rounded-2xl animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-72 bg-white/[0.04] rounded-2xl animate-pulse" />
            <div className="h-40 bg-white/[0.04] rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}

function SpotlightCTACard({ project, onBookVisit }: { project: ProjectDetail; onBookVisit: () => void }) {
    const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }, [])

  const emi = calculateEMI(project.minPrice, 8.5, 20)

  return (
    <div className="relative rounded-2xl p-[1px] overflow-hidden">
      <motion.div
        className="absolute inset-0 rounded-2xl border border-[#3de8a0]/[0.15] pointer-events-none"
        animate={{ opacity: [0.15, 0.40, 0.15] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div
        ref={ref}
        className="relative z-10 bg-[#0c1a14] rounded-2xl p-6"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setOpacity(1)}
        onMouseLeave={() => setOpacity(0)}
      >
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300"
          style={{
            opacity,
            background: `radial-gradient(400px circle at ${pos.x}px ${pos.y}px, rgba(61,232,160,0.08), transparent 40%)`
          }}
        />
        <div className="relative z-10">
          <p className="font-sans text-[10px] tracking-[0.14em] uppercase text-[#3de8a0] mb-3">
            BOOK A SITE VISIT
          </p>
          <h3 className="font-serif text-2xl font-bold text-[#e0e0ea] leading-tight">
            See it in person
          </h3>
          <p className="font-sans text-xs text-[#636380] mt-2">
            OTP-verified. No agent pressure. 30 seconds.
          </p>
          <motion.button
            className="mt-5 w-full bg-[#3de8a0] text-[#09090b] rounded-full py-3.5 font-sans font-semibold text-sm hover:shadow-[0_0_28px_rgba(61,232,160,0.30)] transition-all duration-300"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={onBookVisit}          >
            Book Site Visit
          </motion.button>
          <p
            className="mt-3 text-center font-sans text-xs text-[#3de8a0] hover:underline cursor-pointer underline-offset-2"
            onClick={() => router.push('/chat')}
          >
            Ask AI about this project →
          </p>
          <div className="border-t border-white/[0.06] mt-6 pt-5">
            <p className="font-sans text-sm font-semibold text-[#e0e0ea]">
              Starting from ₹{formatPrice(project.minPrice)}
            </p>
            <p className="font-sans text-[11px] text-[#636380] mt-1">
              EMI ~₹{emi.toLocaleString('en-IN')}/mo at 8.5% · 20yr
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ScoreBar({
  label,
  score,
  max,
  index
}: {
  label: string
  score: number
  max: number
  index: number
}) {
  const [mounted, setMounted] = useState(false)
  const pct = (score / max) * 100
  const isLow = pct < 50

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="font-sans text-xs text-[#8888a8]">{label}</span>
        <span className="font-mono text-xs text-[#8888a8]">
          {score}/{max}
        </span>
      </div>
      <div className="w-full h-1 rounded-full bg-white/[0.06]">
        <motion.div
          className={`h-full rounded-full ${isLow ? 'bg-red-500' : 'bg-[#3de8a0]'}`}
          initial={{ width: 0 }}
          animate={{ width: mounted ? `${pct}%` : 0 }}
          transition={{ duration: 1.2, delay: index * 0.15, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

function ProjectDetailClient({ project }: { project: ProjectDetail }) {
  const [mounted, setMounted] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const gradeColors: Record<string, string> = {
    A: 'bg-emerald-500/[0.15] text-emerald-400',
    B: 'bg-blue-500/[0.15] text-blue-400',
    C: 'bg-amber-500/[0.15] text-amber-400',
    D: 'bg-red-500/[0.15] text-red-400',
    F: 'bg-red-500/[0.15] text-red-400'
  }

  const statusColors: Record<string, string> = {
    'Ready to Move': 'bg-emerald-500/[0.12] border-emerald-500/[0.20] text-emerald-400',
    'Under Construction': 'bg-blue-500/[0.12] border-blue-500/[0.20] text-blue-400'
  }

  const scores = project.builder
    ? [
        { label: 'Delivery Record', score: project.builder.deliveryScore, max: 20 },
        { label: 'RERA Compliance', score: project.builder.reraScore, max: 20 },
        { label: 'Build Quality', score: project.builder.qualityScore, max: 20 },
        { label: 'Financial Strength', score: project.builder.financialScore, max: 15 },
        { label: 'Responsiveness', score: project.builder.responsivenessScore, max: 15 }
      ]
    : []

  return (
    <>
    <div className="min-h-screen bg-[#09090b] pt-28 pb-24">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          className="mb-8"
          initial="hidden"
          animate={mounted ? 'visible' : 'hidden'}
          variants={fadeUp}
          transition={transition}
        >
          <Link
            href="/projects"
            className="font-sans text-xs text-[#636380] hover:text-[#8888a8] transition-colors"
          >
            Projects
          </Link>
          <span className="text-[#454560] mx-2">→</span>
          <span className="font-sans text-xs text-[#8888a8]">{project.projectName}</span>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={mounted ? 'visible' : 'hidden'}
          variants={fadeUp}
          transition={{ ...transition, delay: 0.08 }}
        >
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="bg-[#3de8a0]/[0.10] border border-[#3de8a0]/[0.20] rounded-full px-3 py-1 font-sans text-[10px] text-[#3de8a0]">
              {project.microMarket}
            </span>
            <span
              className={`border rounded-full px-3 py-1 font-sans text-[10px] ${statusColors[project.constructionStatus] || ''}`}
            >
              {project.constructionStatus}
            </span>
            {project.builder && (
              <span
                className={`ml-auto rounded-full px-3 py-1 font-mono text-xs font-bold ${gradeColors[project.builder.grade] || ''}`}
              >
                {project.builder.grade} Grade · {project.builder.totalTrustScore}/100
              </span>
            )}
          </div>

          <h1 className="font-serif text-5xl md:text-6xl font-bold text-[#e0e0ea] leading-[1.05] tracking-tight mt-4">
            {project.projectName}
          </h1>
          <p className="font-sans text-base text-[#8888a8] mt-2">{project.builderName}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {project.urgencySignals.fewUnitsLeft && project.availableUnits < 20 && (
              <span className="bg-amber-500/[0.12] border border-amber-500/[0.25] text-amber-400 rounded-full px-3 py-1 text-[11px] font-sans">
                Only {project.availableUnits} units remaining
              </span>
            )}
            {project.urgencySignals.priceIncreasedRecently && (
              <span className="bg-red-500/[0.12] border border-red-500/[0.25] text-red-400 rounded-full px-3 py-1 text-[11px] font-sans">
                Price increased recently
              </span>
            )}
            {project.urgencySignals.possessionSoon && (
              <span className="bg-[#3de8a0]/[0.10] border border-[#3de8a0]/[0.25] text-[#3de8a0] rounded-full px-3 py-1 text-[11px] font-sans">
                Possession within 12 months
              </span>
            )}
            {project.urgencySignals.highDemand && (
              <span className="bg-blue-500/[0.12] border border-blue-500/[0.25] text-blue-400 rounded-full px-3 py-1 text-[11px] font-sans">
                High buyer interest
              </span>
            )}
          </div>
        </motion.div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-5">
            <motion.div
              className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-7 hover:border-white/[0.12] transition-colors duration-300"
              initial="hidden"
              animate={mounted ? 'visible' : 'hidden'}
              variants={fadeUp}
              transition={{ ...transition, delay: 0.16 }}
            >
              <p className="font-sans text-[10px] tracking-[0.14em] uppercase text-[#3de8a0] mb-4">
                PRICING
              </p>
              <p className="font-serif text-4xl font-bold text-[#e0e0ea]">
                ₹{formatPrice(project.minPrice)} – ₹{formatPrice(project.maxPrice)}
              </p>
              <p className="font-mono text-sm text-[#8888a8] mt-1">
                ₹{project.pricePerSqft.toLocaleString('en-IN')}/sqft
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                  <p className="font-sans text-[9px] tracking-widest uppercase text-[#454560] mb-1.5">
                    AVAILABLE
                  </p>
                  <p
                    className={`font-sans text-sm font-medium ${project.availableUnits < 20 ? 'text-[#3de8a0]' : 'text-[#e0e0ea]'}`}
                  >
                    {project.availableUnits} units
                  </p>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                  <p className="font-sans text-[9px] tracking-widest uppercase text-[#454560] mb-1.5">
                    POSSESSION
                  </p>
                  <p className="font-sans text-sm font-medium text-[#e0e0ea]">
                    {formatPossession(project.possessionDate)}
                  </p>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                  <p className="font-sans text-[9px] tracking-widest uppercase text-[#454560] mb-1.5">
                    UNIT TYPES
                  </p>
                  <p className="font-sans text-sm font-medium text-[#e0e0ea]">
                    {project.unitTypes.join(', ')}
                  </p>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                  <p className="font-sans text-[9px] tracking-widest uppercase text-[#454560] mb-1.5">
                    STATUS
                  </p>
                  <p className="font-sans text-sm font-medium text-[#e0e0ea]">
                    {project.constructionStatus}
                  </p>
                </div>
              </div>
            </motion.div>

            {project.builder && (
              <motion.div
                className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-7 hover:border-white/[0.12] transition-colors duration-300"
                initial="hidden"
                animate={mounted ? 'visible' : 'hidden'}
                variants={fadeUp}
                transition={{ ...transition, delay: 0.24 }}
              >
                <p className="font-sans text-[10px] tracking-[0.14em] uppercase text-[#3de8a0] mb-4">
                  BUILDER INTELLIGENCE
                </p>
                <div className="flex items-center justify-between">
                  <p className="font-sans text-lg font-semibold text-[#e0e0ea]">
                    {project.builder.brandName}
                  </p>
                  <p className="font-mono text-3xl font-bold text-[#3de8a0]">
                    {project.builder.totalTrustScore}
                    <span className="text-sm text-[#636380]">/100</span>
                  </p>
                </div>

                <div className="mt-6 space-y-4">
                  {scores.map((s, i) => (
                    <ScoreBar key={s.label} label={s.label} score={s.score} max={s.max} index={i} />
                  ))}
                </div>
              </motion.div>
            )}

            <motion.div
              className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-7 hover:border-white/[0.12] transition-colors duration-300"
              initial="hidden"
              animate={mounted ? 'visible' : 'hidden'}
              variants={fadeUp}
              transition={{ ...transition, delay: 0.32 }}
            >
              <p className="font-sans text-[10px] tracking-[0.14em] uppercase text-[#3de8a0] mb-4">
                AMENITIES
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.amenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1.5 font-sans text-xs text-[#8888a8] hover:border-white/[0.15] hover:text-[#e0e0ea] transition-all duration-150"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-7 hover:border-white/[0.12] transition-colors duration-300"
              initial="hidden"
              animate={mounted ? 'visible' : 'hidden'}
              variants={fadeUp}
              transition={{ ...transition, delay: 0.4 }}
            >
              <p className="font-sans text-[10px] tracking-[0.14em] uppercase text-[#3de8a0] mb-4">
                RERA REGISTRATION
              </p>
              <div className="flex items-center gap-2 mt-3">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-[#3de8a0]"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <p className="font-mono text-sm text-[#e0e0ea]">{project.reraNumber}</p>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <a
                  href="https://garvi.gujarat.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-sans text-xs text-[#3de8a0] hover:underline underline-offset-2"
                >
                  Verify on GARVI portal →
                </a>
                <a
                  href="https://gujrera.gujarat.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-sans text-xs text-[#3de8a0] hover:underline underline-offset-2"
                >
                  Verify on GujRERA →
                </a>
              </div>
              <p className="font-sans text-xs text-[#454560] mt-4">
                Registration data is sourced from public RERA records.
              </p>
            </motion.div>
          </div>

          <div className="lg:col-span-1 sticky top-28 self-start space-y-4">
            <motion.div
              initial="hidden"
              animate={mounted ? 'visible' : 'hidden'}
              variants={fadeUp}
              transition={{ ...transition, delay: 0.48 }}
            >
              <SpotlightCTACard project={project} onBookVisit={() => setIsModalOpen(true)} />
            </motion.div>

            <motion.div
              className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5"
              initial="hidden"
              animate={mounted ? 'visible' : 'hidden'}
              variants={fadeUp}
              transition={{ ...transition, delay: 0.56 }}
            >
              <p className="font-sans text-sm font-medium text-[#e0e0ea]">Why trust this data?</p>
              <div className="mt-3 space-y-2.5">
                {[
                  'RERA registration verified against official records',
                  'Builder scored across 5 independent criteria',
                  'No paid rankings or sponsored placements'
                ].map((point) => (
                  <div key={point} className="flex gap-2.5 items-start">
                    <div className="w-4 h-4 rounded-full bg-[#3de8a0]/[0.15] flex-shrink-0 mt-0.5 flex items-center justify-center">
                      <svg
                        className="w-2.5 h-2.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="#3de8a0"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="font-sans text-xs text-[#636380]">{point}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
    <VisitBookingModal
      projectId={project.id}
      projectName={project.projectName}
      builderName={project.builderName}
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
    />
    </>
  )
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function fetchProject() {
      const { id } = await params
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''
      const res = await fetch(`${baseUrl}/api/projects/${id}`, { cache: 'no-store' })

      if (!res.ok) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const data = await res.json()
      setProject(data)
      setLoading(false)
    }

    fetchProject()
  }, [params])

  if (loading) return <LoadingState />
  if (notFound || !project) return <NotFoundState />

  return <ProjectDetailClient project={project} />
}