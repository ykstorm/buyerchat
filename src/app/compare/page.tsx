"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

interface CompareProject {
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
  amenities: string[]
  constructionStatus: string
  unitTypes: string[]
  builder?: {
    grade: string
    totalTrustScore: number
    brandName: string
  }
}

interface ProjectOption {
  id: string
  projectName: string
  microMarket: string
  minPrice: number
  builder?: { grade: string }
}

const ease = [0.25, 0.46, 0.45, 0.94] as const
function formatPrice(rupees: number): string {
  if (rupees >= 10000000) return "₹" + (rupees / 10000000).toFixed(1) + "Cr"
  if (rupees >= 100000) return "₹" + Math.round(rupees / 100000) + "L"
  return "₹" + rupees.toLocaleString("en-IN")
}

function formatPossession(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
}

function getScoreColor(score: number): string {
  if (score >= 70) return "var(--accent)"
  if (score >= 50) return "#f59e0b"
  return "#ef4444"
}

function getGradeColor(grade: string): { bg: string; text: string; border: string } {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    A: { bg: "var(--bg-accent-green)", text: "var(--text-accent-green)", border: "var(--border-accent-green)" },
    B: { bg: "var(--bg-accent-blue)", text: "var(--text-accent-blue)", border: "var(--border-accent-blue)" },
    C: { bg: "var(--bg-accent-amber)", text: "var(--text-accent-amber)", border: "var(--border-accent-amber)" },
    D: { bg: "rgba(249,115,22,0.12)", text: "#f97316", border: "rgba(249,115,22,0.25)" },
    F: { bg: "rgba(239,68,68,0.12)", text: "#ef4444", border: "rgba(239,68,68,0.25)" },
  }
  return map[grade] ?? map["C"]
}

function TrustGauge({ score, size = 80 }: { score: number; size?: number }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const RADIUS = (size / 2) - 8
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const color = getScoreColor(score)

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={RADIUS}
          fill="none"
          strokeWidth="6"
          style={{ stroke: 'var(--score-track)' }}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={RADIUS}
          fill="none"
          strokeWidth="6"
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: mounted ? CIRCUMFERENCE * (1 - score / 100) : CIRCUMFERENCE }}
          transition={{ duration: 1.8, ease: "easeOut", delay: 0.3 }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-lg font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  )
}

function ProjectSelector({
  selectedId,
  allProjects,
  selectedIds,
  onSelect,
  onRemove,
  index,
  highlight,
}: {
  selectedId: string | null
  allProjects: ProjectOption[]
  selectedIds: string[]
  onSelect: (id: string) => void
  onRemove: () => void
  index: number
  highlight?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedProject = selectedId ? allProjects.find((p) => p.id === selectedId) : null
  const filteredProjects = allProjects.filter(
    (p) =>
      p.projectName.toLowerCase().includes(search.toLowerCase()) ||
      p.microMarket.toLowerCase().includes(search.toLowerCase())
  )

  if (selectedProject) {
    const gradeColors = getGradeColor(selectedProject.builder?.grade ?? "C")
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease, delay: index * 0.08 }}
        className="relative rounded-2xl p-4 min-h-[100px] transition-shadow"
        style={{
          background: 'var(--bg-surface)',
          border: highlight ? '1px solid #1B4F8A' : '1px solid var(--border)',
          boxShadow: highlight ? '0 0 0 3px rgba(27,79,138,0.18)' : 'none',
        }}
      >
        <button
          onClick={onRemove}
          className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
          style={{ background: 'var(--bg-subtle)' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M9 3L3 9M3 3l6 6" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <h3 className="text-base font-bold pr-8" style={{ fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)', color: 'var(--text-primary)' }}>{selectedProject.projectName}</h3>
        <div className="flex items-center gap-2 mt-2">
          <span className="rounded-full px-2 py-0.5 text-[9px]" style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', color: 'var(--accent)' }}>
            {selectedProject.microMarket}
          </span>
          {selectedProject.builder?.grade && (
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
              style={{ background: gradeColors.bg, color: gradeColors.text, border: `1px solid ${gradeColors.border}` }}
            >
              Grade {selectedProject.builder.grade}
            </span>
          )}
        </div>
        <p className="font-mono text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>{formatPrice(selectedProject.minPrice)}+</p>
      </motion.div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease, delay: index * 0.08 }}
        onClick={() => setIsOpen(true)}
        className="w-full rounded-2xl border-dashed p-4 min-h-[100px] flex flex-col items-center justify-center gap-2 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#1B4F8A]/50 focus-visible:ring-offset-2 focus-visible:outline-none"
        style={{ border: '2px dashed var(--border)', background: 'transparent' }}
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ border: '1px solid var(--border)' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 3v8M3 7h8" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Add project</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <div className="p-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                className="w-full bg-transparent pb-2 text-sm outline-none transition-colors"
                style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              />
            </div>
            <div className="max-h-[280px] overflow-y-auto">
              {filteredProjects.map((project) => {
                const isSelected = selectedIds.includes(project.id)
                const gradeColors = getGradeColor(project.builder?.grade ?? "C")
                return (
                  <button
                    key={project.id}
                    disabled={isSelected}
                    onClick={() => {
                      onSelect(project.id)
                      setIsOpen(false)
                      setSearch("")
                    }}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors focus-visible:ring-2 focus-visible:ring-[#1B4F8A]/50 focus-visible:ring-offset-2 focus-visible:outline-none ${
                      isSelected ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{project.projectName}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{project.microMarket}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {project.builder?.grade && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
                          style={{ background: gradeColors.bg, color: gradeColors.text, border: `1px solid ${gradeColors.border}` }}
                        >
                          {project.builder.grade}
                        </span>
                      )}
                      <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{formatPrice(project.minPrice)}</span>
                    </div>
                  </button>
                )
              })}
              {filteredProjects.length === 0 && (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No projects found</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ComparisonRow({
  label,
  values,
  winnerIndex,
  isWinnerHighlighted = true,
  delay,
}: {
  label: string
  values: React.ReactNode[]
  winnerIndex: number | null
  isWinnerHighlighted?: boolean
  delay: number
}) {
  return (
    <div className="grid" style={{ gridTemplateColumns: `180px repeat(${values.length}, 1fr)` }}>
      <div className="text-[10px] uppercase tracking-widest py-4 px-4 sticky left-0" style={{ color: 'var(--text-label)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-base)' }}>
        {label}
      </div>
      {values.map((value, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease, delay: delay + index * 0.08 }}
          className={`py-4 px-4 flex items-center`}
          style={{
            borderBottom: '1px solid var(--border-subtle)',
            ...(isWinnerHighlighted && winnerIndex === index ? { background: 'var(--accent-bg)', borderLeft: '2px solid var(--accent)' } : {}),
          }}
        >
          <motion.span
            initial={isWinnerHighlighted && winnerIndex === index ? { scale: 1 } : {}}
            animate={isWinnerHighlighted && winnerIndex === index ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 0.4, delay: delay + 0.3 }}
            className="text-sm"
            style={{
              color: isWinnerHighlighted && winnerIndex === index ? 'var(--accent)' : 'var(--text-primary)',
              fontWeight: isWinnerHighlighted && winnerIndex === index ? 600 : 400,
            }}
          >
            {value}
          </motion.span>
        </motion.div>
      ))}
    </div>
  )
}

function EmptyState({ count }: { count: number }) {
  const heading = count === 1 ? '1 selected — pick one more' : 'Select projects to compare'
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease }}
      className="pt-20 flex flex-col items-center text-center"
    >
      <div className="relative w-24 h-16 mb-6">
        <div className="absolute left-0 top-0 w-14 h-10 rounded-lg" style={{ border: '2px solid var(--border)', background: 'var(--bg-base)' }} />
        <div className="absolute left-5 top-3 w-14 h-10 rounded-lg" style={{ border: '2px solid var(--border)', background: 'var(--bg-base)' }} />
        <div className="absolute left-10 top-6 w-14 h-10 rounded-lg" style={{ border: '2px solid var(--border)', background: 'var(--bg-base)' }} />
      </div>
      <h3 className="text-lg" style={{ color: 'var(--text-muted)' }}>{heading}</h3>
      <p className="text-sm mt-2 italic" style={{ color: 'var(--text-label)' }}>
        Pick two — Homesty AI will show the honest difference.
      </p>
    </motion.div>
  )
}

export default function ComparePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  // Initialise from `?ids=a,b,c` (one-time on mount). Future Compare buttons
  // and shareable links can preselect projects by appending `?ids=...` to
  // `/compare`. Up to 3 ids respected; extras ignored.
  const [selectedIds, setSelectedIds] = useState<(string | null)[]>(() => {
    const raw = searchParams?.get('ids') ?? ''
    const parsed = raw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 3)
    const slots: (string | null)[] = [null, null, null]
    parsed.forEach((id, i) => { slots[i] = id })
    return slots
  })
  const [allProjects, setAllProjects] = useState<ProjectOption[]>([])
  const [projects, setProjects] = useState<CompareProject[]>([])

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => setAllProjects(data))
      .catch(console.error)
  }, [])

  useEffect(() => {
    const ids = selectedIds.filter((id): id is string => id !== null)
    if (ids.length === 0) { setProjects([]); return }
    fetch('/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    })
      .then(r => r.json())
      .then(data => setProjects(Array.isArray(data) ? data : []))
      .catch(console.error)
  }, [selectedIds])
  const activeSelectedIds = selectedIds.filter((id): id is string => id !== null)

  const handleSelect = (index: number, id: string) => {
    setSelectedIds((prev) => {
      const next = [...prev]
      next[index] = id
      return next
    })
  }

  const handleRemove = (index: number) => {
    setSelectedIds((prev) => {
      const next = [...prev]
      next[index] = null
      return next
    })
  }

  const getWinnerIndex = (
    values: number[],
    type: "lowest" | "highest" | "earliest"
  ): number | null => {
    if (values.length < 2) return null
    if (type === "lowest") {
      const min = Math.min(...values)
      return values.indexOf(min)
    }
    if (type === "highest") {
      const max = Math.max(...values)
      return values.indexOf(max)
    }
    if (type === "earliest") {
      const earliest = Math.min(...values)
      return values.indexOf(earliest)
    }
    return null
  }

  const priceWinner = projects.length >= 2
    ? getWinnerIndex(projects.map((p) => p.minPrice), "lowest")
    : null
  const sqftWinner = projects.length >= 2
    ? getWinnerIndex(projects.map((p) => p.pricePerSqft), "lowest")
    : null
  const trustWinner = projects.length >= 2
    ? getWinnerIndex(projects.map((p) => p.builder?.totalTrustScore ?? 0), "highest")
    : null
  const possessionWinner = projects.length >= 2
    ? getWinnerIndex(projects.map((p) => new Date(p.possessionDate).getTime()), "earliest")
    : null
  const unitsWinner = projects.length >= 2
    ? getWinnerIndex(projects.map((p) => p.availableUnits), "highest")
    : null
  const amenitiesWinner = projects.length >= 2
    ? getWinnerIndex(projects.map((p) => p.amenities.length), "highest")
    : null

  return (
    <div className="min-h-screen pt-32 pb-24" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.7, ease }}
          className="pb-8"
        >
          <span className="text-[10px] uppercase tracking-widest block mb-3" style={{ color: 'var(--accent)' }}>
            COMPARE PROJECTS
          </span>
          <h1 className="text-5xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)', color: 'var(--text-primary)' }}>
            Side-by-side comparison
          </h1>
          <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>
            Select up to 3 projects to compare pricing, trust scores, and specs.
          </p>
        </motion.div>

        {/* Project Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {[0, 1, 2].map((index) => (
            <ProjectSelector
              key={index}
              index={index}
              selectedId={selectedIds[index]}
              allProjects={allProjects}
              selectedIds={activeSelectedIds}
              onSelect={(id) => handleSelect(index, id)}
              onRemove={() => handleRemove(index)}
              highlight={activeSelectedIds.length === 1 && selectedIds[index] !== null}
            />
          ))}
        </div>

        {/* Comparison Table or Empty State */}
        {projects.length >= 2 ? (
          <div className="overflow-x-auto -mx-6 px-6">
            <div className="min-w-[600px]">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              >
                <ComparisonRow
                  label="PRICE RANGE"
                  values={projects.map((p) => `${formatPrice(p.minPrice)} – ${formatPrice(p.maxPrice)}`)}
                  winnerIndex={priceWinner}
                  delay={0.1}
                />
                <ComparisonRow
                  label="PRICE / SQFT"
                  values={projects.map((p) => `₹${p.pricePerSqft.toLocaleString("en-IN")}`)}
                  winnerIndex={sqftWinner}
                  delay={0.15}
                />
                <ComparisonRow
                  label="TRUST GRADE"
                  values={projects.map((p) => {
                    const grade = p.builder?.grade ?? "–"
                    const score = p.builder?.totalTrustScore ?? 0
                    const colors = getGradeColor(grade)
                    return (
                      <span key={p.id} className="flex items-center gap-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-semibold"
                          style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                        >
                          {grade}
                        </span>
                        <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{score}/100</span>
                      </span>
                    )
                  })}
                  winnerIndex={trustWinner}
                  delay={0.2}
                />
                <ComparisonRow
                  label="POSSESSION"
                  values={projects.map((p) => formatPossession(p.possessionDate))}
                  winnerIndex={possessionWinner}
                  delay={0.25}
                />
                <ComparisonRow
                  label="AVAILABLE UNITS"
                  values={projects.map((p) => p.availableUnits.toString())}
                  winnerIndex={unitsWinner}
                  delay={0.3}
                />
                <ComparisonRow
                  label="CONFIGURATIONS"
                  values={projects.map((p) => p.unitTypes.join(", "))}
                  winnerIndex={null}
                  isWinnerHighlighted={false}
                  delay={0.35}
                />
                <ComparisonRow
                  label="STATUS"
                  values={projects.map((p) => {
                    const isReady = p.constructionStatus.toLowerCase().includes("ready")
                    return (
                      <span
                        key={p.id}
                        className="rounded-full px-2 py-0.5 text-[10px]"
                        style={isReady
                          ? { background: 'var(--bg-accent-green)', border: '1px solid var(--border-accent-green)', color: 'var(--text-accent-green)' }
                          : { background: 'var(--bg-accent-blue)', border: '1px solid var(--border-accent-blue)', color: 'var(--text-accent-blue)' }
                        }
                      >
                        {p.constructionStatus}
                      </span>
                    )
                  })}
                  winnerIndex={null}
                  isWinnerHighlighted={false}
                  delay={0.4}
                />
                <ComparisonRow
                  label="AMENITIES"
                  values={projects.map((p) => `${p.amenities.length} amenities`)}
                  winnerIndex={amenitiesWinner}
                  delay={0.45}
                />
                <ComparisonRow
                  label="RERA"
                  values={projects.map((p) => (
                    <span key={p.id} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                      <span className="font-mono text-xs truncate max-w-[120px]" title={p.reraNumber}>
                        {p.reraNumber.slice(0, 20)}...
                      </span>
                    </span>
                  ))}
                  winnerIndex={null}
                  isWinnerHighlighted={false}
                  delay={0.5}
                />
              </motion.div>

              {/* Builder Trust Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, ease, delay: 0.55 }}
                className="mt-8"
              >
                <span className="text-[10px] uppercase tracking-widest block mb-4" style={{ color: 'var(--accent)' }}>
                  BUILDER TRUST SCORES
                </span>
                <div
                  className="grid gap-4"
                  style={{ gridTemplateColumns: `repeat(${projects.length}, 1fr)` }}
                >
                  {projects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease, delay: 0.6 + index * 0.1 }}
                      className="rounded-2xl p-5 flex flex-col items-center"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                    >
                      <TrustGauge score={project.builder?.totalTrustScore ?? 0} />
                      <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-secondary)' }}>
                        {project.builder?.brandName ?? project.builderName}
                      </p>
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-[10px] mt-2 hover:underline"
                        style={{ color: 'var(--accent)' }}
                      >
                        View builder profile
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Bottom CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, ease, delay: 0.7 }}
                className="mt-10 rounded-2xl p-8 text-center"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              >
                <h3 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)', color: 'var(--text-primary)' }}>
                  Want a deeper analysis?
                </h3>
                <p className="text-sm mt-2 max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
                  Ask Homesty AI to compare these projects and give you a personalised recommendation.
                </p>
                <button
                  onClick={() => router.push('/chat')}
                  className="mt-5 rounded-full px-8 py-3 font-semibold text-sm transition-colors inline-flex items-center gap-2"
                  style={{ background: 'var(--accent)', color: 'var(--bg-base)' }}
                >
                  Ask AI to Compare
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M5 3l5 4-5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </motion.div>
            </div>
          </div>
        ) : (
          <EmptyState count={activeSelectedIds.length} />
        )}
      </div>
    </div>
  )
}
