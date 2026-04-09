'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface SavedProject {
  id: string
  projectId: string
  project: {
    id: string
    projectName: string
    builderName: string
    microMarket: string
    minPrice: number
    maxPrice: number
    unitTypes: string[]
  }
  createdAt: string
}

interface VisitRequest {
  id: string
  projectName: string
  builderName: string
  visitDate: string
  status: 'pending' | 'confirmed' | 'completed'
  bookedAt: string
  visitToken?: string
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-[#FAEEDA] text-[#633806]',
  confirmed: 'bg-[#E6F1FB] text-[#0C447C]',
  completed: 'bg-[#E1F5EE] text-[#085041]',
}

export default function DashboardPage() {
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([])
  const [visitRequests, setVisitRequests] = useState<VisitRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsRes, visitsRes] = await Promise.all([
          fetch('/api/saved'),
          fetch('/api/visit-requests'),
        ])
        const projects = await projectsRes.json()
        const visits = await visitsRes.json()
        setSavedProjects(projects?.savedProjects ?? [])
        setVisitRequests(visits ?? [])
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-5 h-5 border-2 border-[#E7E5E4] border-t-[#1C1917] rounded-full"
        />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-20">

      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-[#FAFAF8]/90 backdrop-blur-sm border-b border-[#EEECE8] px-5 py-3 flex items-center gap-3">
        <Link href="/chat" className="text-[#A8A29E] hover:text-[#1C1917] text-[13px]">←</Link>
        <span className="text-[14px] font-semibold text-[#1C1917] tracking-tight">BuyerChat</span>
      </div>

      <div className="max-w-xl mx-auto px-5 pt-8">

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-7"
        >
          <h1
            style={{ fontFamily: 'var(--font-playfair)' }}
            className="text-[28px] font-bold text-[#1C1917] leading-tight mb-1"
          >
            Your property journey
          </h1>
          <p className="text-[13px] text-[#78716C]">Saved projects and upcoming visits</p>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="grid grid-cols-3 gap-3 mb-8"
        >
          {[
            { label: 'Saved', value: savedProjects.length },
            { label: 'Visits', value: visitRequests.length },
            { label: 'Active', value: visitRequests.filter(v => v.status !== 'completed').length },
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-[#E7E5E4] rounded-2xl p-4">
              <p className="text-[10px] uppercase tracking-wide text-[#A8A29E] mb-1">{stat.label}</p>
              <p className="text-[24px] font-bold text-[#1C1917] leading-none">{stat.value}</p>
            </div>
          ))}
        </motion.div>

        {/* Saved Projects */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.14 }}
          className="mb-8"
        >
          <p className="text-[12px] uppercase tracking-widest text-[#A8A29E] mb-3">Saved Projects</p>
          {savedProjects.length > 0 ? (
            <div className="space-y-3">
              {savedProjects.map(sp => (
                <div key={sp.id} className="bg-white border border-[#E7E5E4] rounded-2xl p-4">
                  <h3
                    style={{ fontFamily: 'var(--font-playfair)' }}
                    className="text-[18px] text-[#1C1917] leading-tight mb-0.5"
                  >
                    {sp.project.projectName}
                  </h3>
                  <p className="text-[12px] text-[#78716C] mb-2">{sp.project.builderName} · {sp.project.microMarket}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-[14px] font-medium text-[#1B4F8A]">
                      {sp.project.minPrice > 0 && sp.project.maxPrice > 0
                        ? `₹${Math.round(sp.project.minPrice/100000)}L – ₹${Math.round(sp.project.maxPrice/100000)}L`
                        : 'Price on request'}
                    </p>
                    <Link
                      href={`/projects/${sp.project.id}`}
                      className="text-[11px] text-[#A8A29E] hover:text-[#1C1917] transition-colors"
                    >
                      View details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-[#E7E5E4] rounded-2xl p-8 text-center">
              <p className="text-[13px] text-[#A8A29E]">No saved projects yet</p>
              <Link href="/chat" className="text-[12px] text-[#1B4F8A] mt-2 inline-block">
                Start exploring →
              </Link>
            </div>
          )}
        </motion.section>

        {/* Site Visits */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <p className="text-[12px] uppercase tracking-widest text-[#A8A29E] mb-3">Site Visits</p>
          {visitRequests.length > 0 ? (
            <div className="space-y-3">
              {visitRequests.map(visit => (
                <div key={visit.id} className="bg-white border border-[#E7E5E4] rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3
                        style={{ fontFamily: 'var(--font-playfair)' }}
                        className="text-[16px] text-[#1C1917] leading-tight"
                      >
                        {visit.projectName}
                      </h3>
                      <p className="text-[12px] text-[#78716C]">{visit.builderName}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[visit.status] ?? STATUS_STYLES.pending}`}>
                      {(visit.status ?? 'pending').charAt(0).toUpperCase() + (visit.status ?? 'pending').slice(1)}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#78716C] mb-1">
                    {new Date(visit.visitDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  {visit.visitToken && (
                    <p style={{ fontFamily: 'var(--font-mono)' }} className="text-[11px] text-[#0F6E56] mt-1">
                      Token: {visit.visitToken}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-[#E7E5E4] rounded-2xl p-8 text-center">
              <p className="text-[13px] text-[#A8A29E]">No visits booked yet</p>
              <Link href="/chat" className="text-[12px] text-[#1B4F8A] mt-2 inline-block">
                Book a site visit →
              </Link>
            </div>
          )}
        </motion.section>

      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E7E5E4] px-5 py-3 flex items-center justify-center">
        <Link href="/chat" className="text-[13px] text-[#78716C] hover:text-[#1C1917] transition-colors">
          ← Back to chat
        </Link>
      </div>

    </main>
  )
}
