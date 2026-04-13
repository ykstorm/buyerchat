'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'

type ProjectType = {
  id: string
  projectName: string
  builderName: string
  microMarket: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getSlots() {
  return Array.from({ length: 6 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i + 1)
    if (d.getDay() === 0) d.setDate(d.getDate() + 1)
    return {
      label: `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`,
      date: d,
      time: i % 2 === 0 ? '10:00 AM' : '3:00 PM'
    }
  })
}

export default function VisitPromptCard({ project, onBook }: {
  project: ProjectType
  onBook?: (projectId: string) => void
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const slots = getSlots()

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="bg-white rounded-2xl overflow-hidden"
      style={{ border: '1px solid #E7E5E4' }}
    >
      <div className="h-0.5 bg-gradient-to-r from-[#1B4F8A] via-[#2563EB] to-[#1B4F8A]" />

      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#1B4F8A] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#1C1917]">Book a site visit</p>
            <p className="text-[11px] text-[#78716C]">{project.projectName} · {project.microMarket}</p>
          </div>
        </div>

        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A8A29E] mb-2">Pick a slot</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {slots.map((slot, i) => (
            <motion.button
              key={i}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelected(i)}
              className="text-left rounded-xl px-3 py-2.5 transition-all"
              style={{
                background: selected === i ? '#EFF6FF' : '#F4F3F0',
                border: `1px solid ${selected === i ? '#1B4F8A' : '#E7E5E4'}`,
              }}
            >
              <p className="text-[11px] font-semibold" style={{ color: selected === i ? '#1B4F8A' : '#1C1917' }}>{slot.label}</p>
              <p className="text-[10px]" style={{ color: '#78716C' }}>{slot.time}</p>
            </motion.button>
          ))}
        </div>

        <div className="rounded-xl px-3 py-2.5 mb-4" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <div className="flex items-center gap-2">
            <span className="text-[12px]">🔐</span>
            <div>
              <p className="text-[10px] font-semibold text-[#0F6E56]">OTP-protected visit</p>
              <p className="text-[10px] text-[#52525B]">Your commission is protected. Token valid 90 days.</p>
            </div>
          </div>
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          disabled={selected === null}
          onClick={() => {
            if (selected === null) return
            window.dispatchEvent(new CustomEvent('book-visit', { detail: { projectId: project.id } }))
          }}
          className="w-full py-3 rounded-xl text-[13px] font-semibold text-white transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #1B4F8A, #2563EB)' }}
        >
          {selected === null ? 'Select a slot first' : `Confirm visit — ${slots[selected].label}`}
        </motion.button>
      </div>
    </motion.div>
  )
}
