"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, useInView } from "framer-motion"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { BuilderProfile } from "./page"

function formatPrice(rupees: number): string {
  if (rupees >= 10000000) return (rupees / 10000000).toFixed(1) + "Cr"
  if (rupees >= 100000) return Math.round(rupees / 100000) + "L"
  return rupees.toLocaleString("en-IN")
}

function formatPossession(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
}

function getScoreColor(score: number, max: number): string {
  const pct = score / max
  if (pct >= 0.7) return "var(--accent)"
  if (pct >= 0.5) return "#f59e0b"
  return "#ef4444"
}

function getGradeVerdict(grade: string): { label: string; description: string; color: string; bg: string } {
  const map: Record<string, { label: string; description: string; color: string; bg: string }> = {
    A: { label: "Highly Trusted", description: "Strong delivery record, clean RERA history, low buyer risk.", color: "var(--text-accent-green)", bg: "var(--bg-accent-green)" },
    B: { label: "Trusted", description: "Reliable track record with minor gaps. Suitable for most buyers.", color: "var(--text-accent-blue)", bg: "var(--bg-accent-blue)" },
    C: { label: "Proceed with Care", description: "Mixed record. Verify delivery timelines and RERA status closely.", color: "#f59e0b", bg: "var(--bg-accent-amber)" },
    D: { label: "High Risk", description: "Significant concerns identified. Not recommended for risk-averse buyers.", color: "#f97316", bg: "rgba(249,115,22,0.10)" },
    F: { label: "Avoid", description: "Serious issues with delivery record or RERA compliance.", color: "#ef4444", bg: "rgba(239,68,68,0.10)" },
  }
  return map[grade] ?? map["C"]
}

const ease = [0.25, 0.46, 0.45, 0.94] as const

function TrustGauge({ score, grade }: { score: number; grade: string }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const RADIUS = 54
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const color = getScoreColor(score, 100)

  return (
    <div className="relative w-32 h-32 flex-shrink-0">
      <svg viewBox="0 0 128 128" className="w-full h-full">
        <circle cx="64" cy="64" r={RADIUS} fill="none" strokeWidth="8" style={{ stroke: 'var(--score-track)' }} />
        <motion.circle
          cx="64"
          cy="64"
          r={RADIUS}
          fill="none"
          strokeWidth="8"
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: mounted ? CIRCUMFERENCE * (1 - score / 100) : CIRCUMFERENCE }}
          transition={{ duration: 1.8, ease: "easeOut", delay: 0.3 }}
          transform="rotate(-90 64 64)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="flex items-baseline">
          <span className="font-mono text-3xl font-bold" style={{ color }}>{score}</span>
          <span className="font-mono text-xs" style={{ color: 'var(--text-label)' }}>/100</span>
        </div>
        <span className="text-2xl font-bold mt-0.5" style={{ fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)', color }}>{grade}</span>
      </div>
    </div>
  )
}

function MiniGauge({ score, max, delay }: { score: number; max: number; delay: number }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const RADIUS = 20
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const color = getScoreColor(score, max)

  return (
    <div className="relative w-12 h-12 mx-auto">
      <svg viewBox="0 0 48 48" className="w-full h-full">
        <circle cx="24" cy="24" r={RADIUS} fill="none" strokeWidth="5" style={{ stroke: 'var(--score-track)' }} />
        <motion.circle
          cx="24"
          cy="24"
          r={RADIUS}
          fill="none"
          strokeWidth="5"
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: mounted ? CIRCUMFERENCE * (1 - score / max) : CIRCUMFERENCE }}
          transition={{ duration: 1.2, ease: "easeOut", delay }}
          transform="rotate(-90 24 24)"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono text-sm font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  )
}

function ProjectCard({ project, index }: { project: BuilderProfile["projects"][0]; index: number }) {
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-30px" })
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isReadyToMove = project.constructionStatus.toLowerCase().includes("ready")

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView && mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.65, ease, delay: index * 0.06 }}
      onClick={() => router.push("/projects/" + project.id)}
      className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-200"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div className="p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full px-3 py-1 text-[10px]" style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', color: 'var(--accent)' }}>
            {project.microMarket}
          </span>
          {isReadyToMove ? (
            <span className="rounded-full px-3 py-1 text-[10px]" style={{ background: 'var(--bg-accent-green)', border: '1px solid var(--border-accent-green)', color: 'var(--text-accent-green)' }}>
              Ready to Move
            </span>
          ) : (
            <span className="rounded-full px-3 py-1 text-[10px]" style={{ background: 'var(--bg-accent-blue)', border: '1px solid var(--border-accent-blue)', color: 'var(--text-accent-blue)' }}>
              Under Construction
            </span>
          )}
        </div>
        <h3 className="text-lg font-bold mt-3 leading-tight" style={{ fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)', color: 'var(--text-primary)' }}>{project.projectName}</h3>
        <p className="text-sm font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
          {formatPrice(project.minPrice)} - {formatPrice(project.maxPrice)}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {project.unitTypes.join(", ")} · Possession {formatPossession(project.possessionDate)}
        </p>
      </div>
      <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <span className="text-xs" style={{ color: project.availableUnits < 20 ? 'var(--accent)' : 'var(--text-muted)' }}>
          {project.availableUnits} units available
        </span>
        <span className="text-xs" style={{ color: 'var(--accent)' }}>View details</span>
      </div>
    </motion.div>
  )
}

export function BuilderProfileClient({ builder }: { builder: BuilderProfile }) {
  const [mounted, setMounted] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const ctaRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ctaRef.current) return
    const rect = ctaRef.current.getBoundingClientRect()
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }, [])

  const verdict = getGradeVerdict(builder.grade)

  const scores = [
    { label: "Delivery Record", score: builder.deliveryScore, max: 30 },
    { label: "RERA Compliance", score: builder.reraScore, max: 20 },
    { label: "Build Quality", score: builder.qualityScore, max: 20 },
    { label: "Financial Strength", score: builder.financialScore, max: 15 },
    { label: "Responsiveness", score: builder.responsivenessScore, max: 15 },
  ]

  const getBestForItems = () => {
    if (builder.grade === "A" || builder.grade === "B") {
      return [
        "End-use family buyers who prioritise certainty",
        "First-time buyers who cannot afford delays",
        "Buyers without alternative housing during possession",
      ]
    } else if (builder.grade === "C") {
      return [
        "Buyers with backup housing options during possession",
        "Investors comfortable with moderate execution uncertainty",
        "Buyers who have verified this specific project's status personally",
      ]
    }
    return [
      "Not recommended for any buyer category at this time",
      "Institutional investors with strong legal due diligence only",
    ]
  }

  const getGuidanceText = () => {
    if (builder.grade === "A" || builder.grade === "B") return "feel confident proceeding"
    if (builder.grade === "C") return "verify timelines before committing"
    return "exercise significant caution"
  }

  return (
    <div className="min-h-screen pt-28 pb-24" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.65, ease }}
          className="mb-10"
        >
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            <Link href="/projects" className="hover:underline">Builders</Link>
            <span style={{ color: 'var(--text-label)' }}> / </span>
            {builder.brandName}
          </span>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-start">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.65, ease, delay: 0.08 }}
              className="mb-4"
            >
              <span
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs"
                style={{ background: verdict.bg, color: verdict.color, border: `1px solid ${verdict.color}33` }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: verdict.color }} />
                {verdict.label}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.65, ease, delay: 0.16 }}
              className="text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight"
              style={{ fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)', color: 'var(--text-primary)' }}
            >
              {builder.builderName}
            </motion.h1>

            {builder.brandName !== builder.builderName && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.65, ease, delay: 0.24 }}
                className="text-base mt-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                {builder.brandName}
              </motion.p>
            )}

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.65, ease, delay: 0.32 }}
              className="text-sm mt-4 max-w-lg leading-relaxed"
              style={{ color: 'var(--text-muted)' }}
            >
              {verdict.description}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.65, ease, delay: 0.4 }}
              className="mt-6 flex flex-wrap gap-x-6 gap-y-2"
            >
              {[
                { label: 'EST.', value: builder.establishedYear ?? "-" },
                { label: 'PROJECTS DELIVERED', value: builder.totalProjectsCompleted },
                { label: 'UNITS DELIVERED', value: builder.totalUnitsDelivered?.toLocaleString("en-IN") ?? "-" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-label)' }}>{item.label}</span>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.value}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-label)' }}>RERA</span>
                <span className="text-xs" style={{ color: builder.reraRegistered ? 'var(--text-accent-green)' : '#ef4444' }}>
                  {builder.reraRegistered ? "Registered" : "Not Registered"}
                </span>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.65, ease, delay: 0.24 }}
            className="flex flex-col items-center"
          >
            <TrustGauge score={builder.totalTrustScore} grade={builder.grade} />
            <span className="text-[10px] tracking-widest uppercase text-center mt-2" style={{ color: 'var(--text-label)' }}>
              Trust Score
            </span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.65, ease, delay: 0.2 }}
          className="mt-10 rounded-2xl px-6 py-5 flex items-center gap-4 flex-wrap"
          style={{ background: verdict.bg, border: `1px solid ${verdict.color}30` }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
            {builder.grade === "A" || builder.grade === "B" ? (
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke={verdict.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke={verdict.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold" style={{ color: verdict.color }}>{verdict.label}</h3>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              This builder has been scored across 5 independent criteria. Buyers should {getGuidanceText()}.
            </p>
          </div>
          <span className="text-4xl font-bold flex-shrink-0" style={{ fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)', color: verdict.color }}>
            {builder.grade}
          </span>
        </motion.div>

        <div className="mt-14">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.65, ease, delay: 0.3 }}
            className="text-[10px] tracking-[0.14em] uppercase mb-6 block"
            style={{ color: 'var(--accent)' }}
          >
            TRUST SCORE BREAKDOWN
          </motion.span>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.65, ease, delay: 0.38 }}
            className="rounded-2xl p-7"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
              {scores.map((item, index) => (
                <div
                  key={item.label}
                  className={`px-5 py-4 md:py-2 ${index < scores.length - 1 ? "border-b md:border-b-0 md:border-r" : ""}`}
                  style={index < scores.length - 1 ? { borderColor: 'var(--border-subtle)' } : undefined}
                >
                  <p className="text-[9px] uppercase tracking-widest mb-3 text-center" style={{ color: 'var(--text-label)' }}>
                    {item.label}
                  </p>
                  <MiniGauge score={item.score} max={item.max} delay={0.4 + index * 0.12} />
                  <p className="font-mono text-[9px] text-center mt-2" style={{ color: 'var(--text-label)' }}>/{item.max}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <div className="flex justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-label)' }}>TOTAL TRUST SCORE</span>
                <span className="font-mono text-sm font-bold" style={{ color: getScoreColor(builder.totalTrustScore, 100) }}>
                  {builder.totalTrustScore}/100
                </span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ background: 'var(--score-track)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: getScoreColor(builder.totalTrustScore, 100) }}
                  initial={{ width: 0 }}
                  animate={mounted ? { width: `${builder.totalTrustScore}%` } : { width: 0 }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.4 }}
                />
              </div>
            </div>
          </motion.div>
        </div>

        {(builder.bankApprovals?.length ?? 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.65, ease, delay: 0.46 }}
            className="mt-6 flex flex-wrap items-center gap-2"
          >
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Approved by:</span>
            {builder.bankApprovals?.map((bank: string) => (
              <span key={bank} className="rounded-full px-3 py-1 text-xs" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                {bank}
              </span>
            ))}
          </motion.div>
        )}

        <div className="mt-16">
          <div className="flex items-end justify-between mb-6">
            <div>
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.65, ease, delay: 0.5 }}
                className="text-[10px] uppercase tracking-[0.14em] block"
                style={{ color: 'var(--accent)' }}
              >
                ACTIVE PROJECTS
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.65, ease, delay: 0.58 }}
                className="text-2xl font-bold mt-1 block"
                style={{ fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)', color: 'var(--text-primary)' }}
              >
                {builder.projects.length} Projects in South Bopal & Shela
              </motion.span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {builder.projects.map((project, index) => (
              <ProjectCard key={project.id} project={project} index={index} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.65, ease, delay: 0.6 }}
            className="rounded-2xl p-6"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <h3 className="text-[10px] uppercase tracking-[0.14em] mb-4" style={{ color: 'var(--accent)' }}>Best For</h3>
            <ul className="flex flex-col gap-3">
              {getBestForItems().map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 mt-0.5">
                    <path d="M5.25 7l1.75 1.75 3.5-3.5" stroke={verdict.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="7" cy="7" r="5.5" stroke={verdict.color} strokeWidth="1" />
                  </svg>
                  <span className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.65, ease, delay: 0.68 }}
            className="rounded-2xl p-6"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <h3 className="text-[10px] uppercase tracking-[0.14em] mb-4" style={{ color: 'var(--accent)' }}>Verification Checklist</h3>
            <ul className="flex flex-col gap-3">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ border: '1px solid var(--border)' }}>
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--accent)' }} />
                </span>
                <span className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Verify RERA registration at rera.gujarat.gov.in</span>
              </li>
              {[
                'Request and review possession letters from past projects',
                'Confirm bank approvals with your lender directly',
                'Visit completed projects to assess construction quality',
              ].map((text) => (
                <li key={text} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ border: '1px solid var(--border)' }}>
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--score-track)' }} />
                  </span>
                  <span className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{text}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <motion.div
          ref={ctaRef}
          initial={{ opacity: 0, y: 20 }}
          animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.65, ease, delay: 0.76 }}
          onMouseMove={handleMouseMove}
          className="mt-16 relative overflow-hidden rounded-2xl p-8 text-center"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-40 transition-opacity"
            style={{
              background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, var(--accent-bg), transparent 60%)`,
            }}
          />
          <h2 className="relative text-2xl md:text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-cormorant, "Cormorant Garamond", Georgia, serif)', color: 'var(--text-primary)' }}>
            Have questions about {builder.builderName}?
          </h2>
          <p className="relative text-sm mb-6 max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
            Chat with Homesty AI for personalised insights, project comparisons, and risk analysis.
          </p>
          <Link
            href="/chat"
            className="relative inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-full transition-colors"
            style={{ background: 'var(--accent)', color: 'var(--bg-base)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 8c0 3.314-2.686 6-6 6a5.972 5.972 0 01-2.758-.67L2 14l.67-3.242A5.972 5.972 0 012 8c0-3.314 2.686-6 6-6s6 2.686 6 6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Start a Conversation
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
