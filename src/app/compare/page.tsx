"use client"

import { useState, useEffect, useRef, } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
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
  if (score >= 70) return "#3de8a0"
  if (score >= 50) return "#f59e0b"
  return "#ef4444"
}

function getGradeColor(grade: string): { bg: string; text: string; border: string } {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    A: { bg: "rgba(61,232,160,0.12)", text: "#3de8a0", border: "rgba(61,232,160,0.25)" },
    B: { bg: "rgba(96,165,250,0.12)", text: "#60a5fa", border: "rgba(96,165,250,0.25)" },
    C: { bg: "rgba(245,158,11,0.12)", text: "#f59e0b", border: "rgba(245,158,11,0.25)" },
    D: { bg: "rgba(249,115,22,0.12)", text: "#f97316", border: "rgba(249,115,22,0.25)" },
    F: { bg: "rgba(239,68,68,0.12)", text: "#ef4444", border: "rgba(239,68,68,0.25)" },
  }
  return map[grade] ?? map["C"]
}

// Mock data for projects
const MOCK_ALL_PROJECTS: ProjectOption[] = [
  { id: "p1", projectName: "Shela Heights", microMarket: "Shela", minPrice: 7500000, builder: { grade: "A" } },
  { id: "p2", projectName: "Bopal Greens", microMarket: "South Bopal", minPrice: 6200000, builder: { grade: "B" } },
  { id: "p3", projectName: "Sunrise Residency", microMarket: "Shela", minPrice: 5500000, builder: { grade: "C" } },
  { id: "p4", projectName: "The Pinnacle", microMarket: "South Bopal", minPrice: 9800000, builder: { grade: "A" } },
  { id: "p5", projectName: "Urban Nest", microMarket: "Shela", minPrice: 4800000, builder: { grade: "B" } },
  { id: "p6", projectName: "Sky Gardens", microMarket: "South Bopal", minPrice: 8500000, builder: { grade: "A" } },
]

const MOCK_COMPARE_DATA: Record<string, CompareProject> = {
  p1: {
    id: "p1",
    projectName: "Shela Heights",
    builderName: "Shivalik Group",
    microMarket: "Shela",
    minPrice: 7500000,
    maxPrice: 12500000,
    pricePerSqft: 5200,
    availableUnits: 42,
    possessionDate: "2026-06-01",
    reraNumber: "PR/GJ/AHMEDABAD/SHELA/CAA00234/010120R1",
    amenities: ["Swimming Pool", "Gym", "Clubhouse", "Garden", "Security", "Parking", "Power Backup", "Lift"],
    constructionStatus: "Under Construction",
    unitTypes: ["2 BHK", "3 BHK", "4 BHK"],
    builder: { grade: "A", totalTrustScore: 87, brandName: "Shivalik Group" },
  },
  p2: {
    id: "p2",
    projectName: "Bopal Greens",
    builderName: "Pacifica Companies",
    microMarket: "South Bopal",
    minPrice: 6200000,
    maxPrice: 9800000,
    pricePerSqft: 4800,
    availableUnits: 28,
    possessionDate: "2025-12-01",
    reraNumber: "PR/GJ/AHMEDABAD/BOPAL/CAA00567/010120R1",
    amenities: ["Swimming Pool", "Gym", "Garden", "Security", "Parking"],
    constructionStatus: "Ready to Move",
    unitTypes: ["2 BHK", "3 BHK"],
    builder: { grade: "B", totalTrustScore: 72, brandName: "Pacifica Companies" },
  },
  p3: {
    id: "p3",
    projectName: "Sunrise Residency",
    builderName: "Sunrise Developers",
    microMarket: "Shela",
    minPrice: 5500000,
    maxPrice: 8200000,
    pricePerSqft: 4200,
    availableUnits: 65,
    possessionDate: "2027-03-01",
    reraNumber: "PR/GJ/AHMEDABAD/SHELA/CAA00891/010120R1",
    amenities: ["Garden", "Security", "Parking", "Lift"],
    constructionStatus: "Under Construction",
    unitTypes: ["2 BHK", "3 BHK"],
    builder: { grade: "C", totalTrustScore: 58, brandName: "Sunrise Developers" },
  },
  p4: {
    id: "p4",
    projectName: "The Pinnacle",
    builderName: "Shivalik Group",
    microMarket: "South Bopal",
    minPrice: 9800000,
    maxPrice: 18500000,
    pricePerSqft: 6100,
    availableUnits: 18,
    possessionDate: "2026-09-01",
    reraNumber: "PR/GJ/AHMEDABAD/BOPAL/CAA01234/010120R1",
    amenities: ["Swimming Pool", "Gym", "Clubhouse", "Garden", "Security", "Parking", "Power Backup", "Lift", "Spa", "Tennis Court"],
    constructionStatus: "Under Construction",
    unitTypes: ["3 BHK", "4 BHK", "Penthouse"],
    builder: { grade: "A", totalTrustScore: 87, brandName: "Shivalik Group" },
  },
  p5: {
    id: "p5",
    projectName: "Urban Nest",
    builderName: "Pacifica Companies",
    microMarket: "Shela",
    minPrice: 4800000,
    maxPrice: 7200000,
    pricePerSqft: 4100,
    availableUnits: 52,
    possessionDate: "2025-09-01",
    reraNumber: "PR/GJ/AHMEDABAD/SHELA/CAA00678/010120R1",
    amenities: ["Gym", "Garden", "Security", "Parking", "Lift", "Children Play Area"],
    constructionStatus: "Ready to Move",
    unitTypes: ["1 BHK", "2 BHK"],
    builder: { grade: "B", totalTrustScore: 72, brandName: "Pacifica Companies" },
  },
  p6: {
    id: "p6",
    projectName: "Sky Gardens",
    builderName: "Shivalik Group",
    microMarket: "South Bopal",
    minPrice: 8500000,
    maxPrice: 14000000,
    pricePerSqft: 5600,
    availableUnits: 35,
    possessionDate: "2026-03-01",
    reraNumber: "PR/GJ/AHMEDABAD/BOPAL/CAA01567/010120R1",
    amenities: ["Swimming Pool", "Gym", "Clubhouse", "Garden", "Security", "Parking", "Power Backup", "Lift", "Rooftop Garden"],
    constructionStatus: "Under Construction",
    unitTypes: ["3 BHK", "4 BHK"],
    builder: { grade: "A", totalTrustScore: 87, brandName: "Shivalik Group" },
  },
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
          stroke="rgba(255,255,255,0.06)" 
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
}: {
  selectedId: string | null
  allProjects: ProjectOption[]
  selectedIds: string[]
  onSelect: (id: string) => void
  onRemove: () => void
  index: number
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
        className="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 min-h-[100px]"
      >
        <button
          onClick={onRemove}
          className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M9 3L3 9M3 3l6 6" stroke="#636380" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <h3 className="font-serif text-base font-bold text-[#e0e0ea] pr-8">{selectedProject.projectName}</h3>
        <div className="flex items-center gap-2 mt-2">
          <span className="bg-[#3de8a0]/[0.10] border border-[#3de8a0]/[0.20] rounded-full px-2 py-0.5 text-[9px] text-[#3de8a0] font-sans">
            {selectedProject.microMarket}
          </span>
          {selectedProject.builder?.grade && (
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-sans font-semibold"
              style={{ background: gradeColors.bg, color: gradeColors.text, border: `1px solid ${gradeColors.border}` }}
            >
              Grade {selectedProject.builder.grade}
            </span>
          )}
        </div>
        <p className="font-mono text-xs text-[#8888a8] mt-2">{formatPrice(selectedProject.minPrice)}+</p>
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
        className="w-full rounded-2xl border border-dashed border-white/[0.15] bg-transparent p-4 min-h-[100px] flex flex-col items-center justify-center gap-2 hover:border-white/[0.25] hover:bg-white/[0.02] transition-all cursor-pointer"
      >
        <div className="w-8 h-8 rounded-full border border-white/[0.15] flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 3v8M3 7h8" stroke="#636380" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <span className="font-sans text-sm text-[#636380]">Add project</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#0f0f14] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-3 border-b border-white/[0.08]">
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                className="w-full bg-transparent border-b border-white/[0.15] focus:border-[#3de8a0] pb-2 font-sans text-sm text-[#e0e0ea] placeholder:text-[#454560] outline-none transition-colors"
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
                    className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors ${
                      isSelected
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-white/[0.04] cursor-pointer"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-sm text-[#e0e0ea] truncate">{project.projectName}</p>
                      <p className="font-sans text-xs text-[#636380] mt-0.5">{project.microMarket}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {project.builder?.grade && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px] font-sans font-semibold"
                          style={{ background: gradeColors.bg, color: gradeColors.text, border: `1px solid ${gradeColors.border}` }}
                        >
                          {project.builder.grade}
                        </span>
                      )}
                      <span className="font-mono text-xs text-[#8888a8]">{formatPrice(project.minPrice)}</span>
                    </div>
                  </button>
                )
              })}
              {filteredProjects.length === 0 && (
                <div className="px-4 py-6 text-center">
                  <p className="font-sans text-sm text-[#636380]">No projects found</p>
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
      <div className="font-sans text-[10px] uppercase tracking-widest text-[#454560] py-4 px-4 border-b border-white/[0.06] bg-[#09090b] sticky left-0">
        {label}
      </div>
      {values.map((value, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease, delay: delay + index * 0.08 }}
          className={`py-4 px-4 border-b border-white/[0.06] flex items-center ${
            isWinnerHighlighted && winnerIndex === index
              ? "bg-[#3de8a0]/[0.08] border-l-2 border-l-[#3de8a0]"
              : ""
          }`}
        >
          <motion.span
            initial={isWinnerHighlighted && winnerIndex === index ? { scale: 1 } : {}}
            animate={isWinnerHighlighted && winnerIndex === index ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 0.4, delay: delay + 0.3 }}
            className={`font-sans text-sm ${
              isWinnerHighlighted && winnerIndex === index ? "text-[#3de8a0] font-semibold" : "text-[#e0e0ea]"
            }`}
          >
            {value}
          </motion.span>
        </motion.div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease }}
      className="pt-20 flex flex-col items-center text-center"
    >
      <div className="relative w-24 h-16 mb-6">
        <div className="absolute left-0 top-0 w-14 h-10 rounded-lg border-2 border-[#454560] bg-[#09090b]" />
        <div className="absolute left-5 top-3 w-14 h-10 rounded-lg border-2 border-[#454560] bg-[#09090b]" />
        <div className="absolute left-10 top-6 w-14 h-10 rounded-lg border-2 border-[#454560] bg-[#09090b]" />
      </div>
      <h3 className="font-sans text-lg text-[#636380]">Select projects to compare</h3>
      <p className="font-sans text-sm text-[#454560] mt-2">Choose up to 3 projects using the selectors above</p>
    </motion.div>
  )
}

export default function ComparePage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [selectedIds, setSelectedIds] = useState<(string | null)[]>([null, null, null])
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

  // Winner calculation helpers
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
    <div className="min-h-screen bg-[#09090b] pt-32 pb-24">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.7, ease }}
          className="pb-8"
        >
          <span className="font-sans text-[10px] uppercase tracking-widest text-[#3de8a0] block mb-3">
            COMPARE PROJECTS
          </span>
          <h1 className="font-serif text-5xl font-bold text-[#e0e0ea] tracking-tight">
            Side-by-side comparison
          </h1>
          <p className="font-sans text-sm text-[#636380] mt-3">
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
            />
          ))}
        </div>

        {/* Comparison Table or Empty State */}
        {projects.length >= 2 ? (
          <div className="overflow-x-auto -mx-6 px-6">
            <div className="min-w-[600px]">
              {/* Main Comparison Table */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="bg-white/[0.02] border border-white/[0.08] rounded-2xl overflow-hidden"
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
                        <span className="font-mono text-xs text-[#8888a8]">{score}/100</span>
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
                        className={`rounded-full px-2 py-0.5 text-[10px] font-sans ${
                          isReady
                            ? "bg-emerald-500/[0.12] border border-emerald-500/[0.20] text-emerald-400"
                            : "bg-blue-500/[0.12] border border-blue-500/[0.20] text-blue-400"
                        }`}
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
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3de8a0]" />
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
                <span className="font-sans text-[10px] uppercase tracking-widest text-[#3de8a0] block mb-4">
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
                      className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 flex flex-col items-center"
                    >
                      <TrustGauge score={project.builder?.totalTrustScore ?? 0} />
                      <p className="font-sans text-xs text-[#8888a8] mt-3 text-center">
                        {project.builder?.brandName ?? project.builderName}
                      </p>
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-sans text-[10px] text-[#3de8a0] mt-2 hover:underline"
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
                className="mt-10 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 text-center"
              >
                <h3 className="font-serif text-2xl font-bold text-[#e0e0ea]">
                  Want a deeper analysis?
                </h3>
                <p className="font-sans text-sm text-[#636380] mt-2 max-w-md mx-auto">
                  Ask Homesty AI to compare these projects and give you a personalised recommendation.
                </p>
                <button
                  onClick={() => {
                    router.push('/chat')
                  }}
                  className="mt-5 bg-[#3de8a0] text-[#09090b] rounded-full px-8 py-3 font-sans font-semibold text-sm hover:bg-[#2dd891] transition-colors inline-flex items-center gap-2"
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
          <EmptyState />
        )}
      </div>
    </div>
  )
}
