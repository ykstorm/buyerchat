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
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg-base)' }}>
      <div className="rounded-2xl p-10 text-center max-w-md" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <h1 className="text-2xl" style={{ fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)', color: 'var(--text-primary)' }}>Project not found</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
          This project may have been removed or the link is incorrect.
        </p>
        <Link
          href="/projects"
          className="inline-block mt-6 text-sm hover:underline underline-offset-2"
          style={{ color: 'var(--accent)' }}
        >
          ← Back to projects
        </Link>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen pt-28 pb-24" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="h-6 w-24 rounded-xl animate-pulse mb-8" style={{ background: 'var(--bg-subtle)' }} />
        <div className="h-12 w-3/4 rounded-xl animate-pulse mt-4" style={{ background: 'var(--bg-subtle)' }} />
        <div className="h-4 w-1/3 rounded-xl animate-pulse mt-2" style={{ background: 'var(--bg-subtle)' }} />
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-5">
            <div className="h-64 rounded-2xl animate-pulse" style={{ background: 'var(--bg-subtle)' }} />
            <div className="h-80 rounded-2xl animate-pulse" style={{ background: 'var(--bg-subtle)' }} />
            <div className="h-32 rounded-2xl animate-pulse" style={{ background: 'var(--bg-subtle)' }} />
          </div>
          <div className="space-y-4">
            <div className="h-72 rounded-2xl animate-pulse" style={{ background: 'var(--bg-subtle)' }} />
            <div className="h-40 rounded-2xl animate-pulse" style={{ background: 'var(--bg-subtle)' }} />
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
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{ border: '1px solid var(--accent-border)' }}
        animate={{ opacity: [0.15, 0.40, 0.15] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div
        ref={ref}
        className="relative z-10 rounded-2xl p-6"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setOpacity(1)}
        onMouseLeave={() => setOpacity(0)}
      >
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300"
          style={{
            opacity,
            background: `radial-gradient(400px circle at ${pos.x}px ${pos.y}px, var(--accent-bg), transparent 40%)`
          }}
        />
        <div className="relative z-10">
          <p className="text-[10px] tracking-[0.14em] uppercase mb-3" style={{ color: 'var(--accent)' }}>
            BOOK A SITE VISIT
          </p>
          <h3 className="text-2xl font-bold leading-tight" style={{ fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)', color: 'var(--text-primary)' }}>
            See it in person
          </h3>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            No agent pressure. Homesty AI handles the booking.
          </p>
          <motion.button
            className="mt-5 w-full rounded-full py-3.5 font-semibold text-sm transition-all duration-300"
            style={{ background: 'var(--accent)', color: 'var(--bg-base)' }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', damping: 30, stiffness: 500 }}
            onClick={() => {
              // P2-CRITICAL-8 Bug #5 — redirect to /chat with prefilled+autosend
              // message so the AI runs the PART 7 booking flow. Replaces the
              // legacy VisitBookingModal which simulated an OTP step the model
              // has no tool for. The modal stays available via `onBookVisit`
              // (kept as a fallback prop) but the primary CTA now hands off
              // to chat. Old onBookVisit ref retained but unused — operator
              // can wire it back if a non-chat booking path returns later.
              void onBookVisit
              const msg = `Visit book karna hai — ${project.projectName}`
              router.push(`/chat?message=${encodeURIComponent(msg)}`)
            }}
          >
            Book Site Visit
          </motion.button>
          <p
            className="mt-3 text-center text-xs hover:underline cursor-pointer underline-offset-2"
            style={{ color: 'var(--accent)' }}
            onClick={() => router.push(`/chat?intent=visit&project=${encodeURIComponent(project.projectName)}`)}
          >
            Ask AI about this project →
          </p>
          <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Starting from ₹{formatPrice(project.minPrice)}
            </p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
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
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
          {score}/{max}
        </span>
      </div>
      <div className="w-full h-1 rounded-full" style={{ background: 'var(--score-track)' }}>
        <motion.div
          className={`h-full rounded-full ${isLow ? 'bg-red-500' : ''}`}
          style={isLow ? undefined : { background: 'var(--accent)' }}
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

  const gradeColors: Record<string, { bg: string; text: string }> = {
    A: { bg: 'var(--bg-accent-green)', text: 'var(--text-accent-green)' },
    B: { bg: 'var(--bg-accent-blue)', text: 'var(--text-accent-blue)' },
    C: { bg: 'var(--bg-accent-amber)', text: 'var(--text-accent-amber)' },
    D: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444' },
    F: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444' }
  }

  const statusColors: Record<string, { bg: string; border: string; text: string }> = {
    'Ready to Move': { bg: 'var(--bg-accent-green)', border: 'var(--border-accent-green)', text: 'var(--text-accent-green)' },
    'Under Construction': { bg: 'var(--bg-accent-blue)', border: 'var(--border-accent-blue)', text: 'var(--text-accent-blue)' }
  }

  const scores = project.builder
    ? [
        { label: 'Delivery Record', score: project.builder.deliveryScore, max: 30 },
        { label: 'RERA Compliance', score: project.builder.reraScore, max: 20 },
        { label: 'Build Quality', score: project.builder.qualityScore, max: 20 },
        { label: 'Financial Strength', score: project.builder.financialScore, max: 15 },
        { label: 'Responsiveness', score: project.builder.responsivenessScore, max: 15 }
      ]
    : []

  const statusStyle = statusColors[project.constructionStatus]
  const gradeStyle = gradeColors[project.builder?.grade ?? 'C']

  return (
    <>
    <div className="min-h-screen pt-28 pb-24" style={{ background: 'var(--bg-base)' }}>
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
            className="text-xs hover:underline transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            Projects
          </Link>
          <span className="mx-2" style={{ color: 'var(--text-label)' }}>→</span>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{project.projectName}</span>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={mounted ? 'visible' : 'hidden'}
          variants={fadeUp}
          transition={{ ...transition, delay: 0.08 }}
        >
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="rounded-full px-3 py-1 text-[10px]" style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', color: 'var(--accent)' }}>
              {project.microMarket}
            </span>
            {statusStyle && (
              <span
                className="rounded-full px-3 py-1 text-[10px]"
                style={{ background: statusStyle.bg, border: `1px solid ${statusStyle.border}`, color: statusStyle.text }}
              >
                {project.constructionStatus}
              </span>
            )}
            {project.builder && gradeStyle && (
              <span
                className="ml-auto rounded-full px-3 py-1 font-mono text-xs font-bold"
                style={{ background: gradeStyle.bg, color: gradeStyle.text }}
              >
                {project.builder.grade} Grade · {project.builder.totalTrustScore}/100
              </span>
            )}
          </div>

          <h1 className="text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight mt-4" style={{ fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)', color: 'var(--text-primary)' }}>
            {project.projectName}
            <span className="block text-base font-normal mt-3 tracking-normal" style={{ color: 'var(--text-secondary)', fontFamily: 'system-ui, sans-serif' }}>
              by {project.builderName} in {project.microMarket}, Ahmedabad
            </span>
          </h1>

          <div className="mt-4 flex flex-wrap gap-2">
            {project.urgencySignals.fewUnitsLeft && project.availableUnits < 20 && (
              <span className="rounded-full px-3 py-1 text-[11px]" style={{ background: 'var(--bg-accent-amber)', border: '1px solid var(--border-accent-amber)', color: 'var(--text-accent-amber)' }}>
                Only {project.availableUnits} units remaining
              </span>
            )}
            {project.urgencySignals.priceIncreasedRecently && (
              <span className="bg-red-500/[0.12] border border-red-500/[0.25] text-red-400 rounded-full px-3 py-1 text-[11px]">
                Price increased recently
              </span>
            )}
            {project.urgencySignals.possessionSoon && (
              <span className="rounded-full px-3 py-1 text-[11px]" style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', color: 'var(--accent)' }}>
                Possession within 12 months
              </span>
            )}
            {project.urgencySignals.highDemand && (
              <span className="rounded-full px-3 py-1 text-[11px]" style={{ background: 'var(--bg-accent-blue)', border: '1px solid var(--border-accent-blue)', color: 'var(--text-accent-blue)' }}>
                High buyer interest
              </span>
            )}
          </div>
        </motion.div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-5">
            <motion.div
              className="rounded-2xl p-7 transition-colors duration-300"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              initial="hidden"
              animate={mounted ? 'visible' : 'hidden'}
              variants={fadeUp}
              transition={{ ...transition, delay: 0.16 }}
            >
              <p className="text-[10px] tracking-[0.14em] uppercase mb-4" style={{ color: 'var(--accent)' }}>
                PRICING
              </p>
              <p className="text-4xl font-bold" style={{ fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)', color: 'var(--text-primary)' }}>
                ₹{formatPrice(project.minPrice)} – ₹{formatPrice(project.maxPrice)}
              </p>
              <p className="font-mono text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                {project.pricePerSqft && project.pricePerSqft > 0 ? `₹${project.pricePerSqft.toLocaleString('en-IN')}/sqft` : 'Price on request'}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  { label: 'AVAILABLE', value: `${project.availableUnits} units`, highlight: project.availableUnits < 20 },
                  { label: 'POSSESSION', value: formatPossession(project.possessionDate), highlight: false },
                  { label: 'UNIT TYPES', value: project.unitTypes.join(', '), highlight: false },
                  { label: 'STATUS', value: project.constructionStatus, highlight: false },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl p-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
                    <p className="text-[9px] tracking-widest uppercase mb-1.5" style={{ color: 'var(--text-label)' }}>
                      {item.label}
                    </p>
                    <p className="text-sm font-medium" style={{ color: item.highlight ? 'var(--accent)' : 'var(--text-primary)' }}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            {project.builder && (
              <motion.div
                className="rounded-2xl p-7 transition-colors duration-300"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                initial="hidden"
                animate={mounted ? 'visible' : 'hidden'}
                variants={fadeUp}
                transition={{ ...transition, delay: 0.24 }}
              >
                <p className="text-[10px] tracking-[0.14em] uppercase mb-4" style={{ color: 'var(--accent)' }}>
                  BUILDER INTELLIGENCE
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {project.builder.brandName}
                  </p>
                  <p className="font-mono text-3xl font-bold" style={{ color: 'var(--accent)' }}>
                    {project.builder.totalTrustScore}
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>/100</span>
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
              className="rounded-2xl p-7 transition-colors duration-300"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              initial="hidden"
              animate={mounted ? 'visible' : 'hidden'}
              variants={fadeUp}
              transition={{ ...transition, delay: 0.32 }}
            >
              <p className="text-[10px] tracking-[0.14em] uppercase mb-4" style={{ color: 'var(--accent)' }}>
                AMENITIES
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.amenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="rounded-full px-3 py-1.5 text-xs transition-all duration-150"
                    style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="rounded-2xl p-7 transition-colors duration-300"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              initial="hidden"
              animate={mounted ? 'visible' : 'hidden'}
              variants={fadeUp}
              transition={{ ...transition, delay: 0.4 }}
            >
              <p className="text-[10px] tracking-[0.14em] uppercase mb-4" style={{ color: 'var(--accent)' }}>
                RERA REGISTRATION
              </p>
              <div className="flex items-center gap-2 mt-3">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--accent)' }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <p className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>{project.reraNumber}</p>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <a
                  href="https://garvi.gujarat.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs hover:underline underline-offset-2"
                  style={{ color: 'var(--accent)' }}
                >
                  Verify on GARVI portal →
                </a>
                <a
                  href="https://gujrera.gujarat.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs hover:underline underline-offset-2"
                  style={{ color: 'var(--accent)' }}
                >
                  Verify on GujRERA →
                </a>
              </div>
              <p className="text-xs mt-4" style={{ color: 'var(--text-label)' }}>
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
              className="rounded-2xl p-5"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              initial="hidden"
              animate={mounted ? 'visible' : 'hidden'}
              variants={fadeUp}
              transition={{ ...transition, delay: 0.56 }}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Why trust this data?</p>
              <div className="mt-3 space-y-2.5">
                {[
                  'RERA registration verified against official records',
                  'Builder scored across 5 independent criteria',
                  'No paid rankings or sponsored placements'
                ].map((point) => (
                  <div key={point} className="flex gap-2.5 items-start">
                    <div className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center" style={{ background: 'var(--accent-bg)' }}>
                      <svg
                        className="w-2.5 h-2.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="var(--accent)"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{point}</p>
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
