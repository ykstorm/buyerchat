'use client'
// src/components/admin/FollowUpCard.tsx

import { useState } from 'react'
import { getUrgency, formatTimeAgo, formatLakh, getPersonaLabel, getStageLabel, daysBetween } from '@/lib/admin-utils'

export default function FollowUpCard({ session }: { session: any }) {
  const [draft, setDraft] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const urgency = getUrgency(session.lastMessageAt)

  const dotColor = urgency.color === 'red' ? '#A32D2D' : urgency.color === 'amber' ? '#BA7517' : '#0F6E56'

  const generateDraft = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      })
      const data = await res.json()
      setDraft(data.draft ?? 'Could not generate draft.')
    } catch {
      setDraft('Failed to generate. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const openWhatsApp = () => {
    if (!draft) return
    const url = `https://wa.me/?text=${encodeURIComponent(draft)}`
    window.open(url, '_blank')
  }

  return (
    <div className="bg-white border border-black/[0.08] rounded-xl p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex items-center gap-2 mt-0.5">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
          <span className="text-[11px] font-semibold" style={{ color: dotColor }}>{urgency.label.toUpperCase()}</span>
        </div>
        <div className="flex-1">
          <p className="text-[13px] font-medium text-[#1A1A2E]">
            {getPersonaLabel(session.buyerPersona)} · {session.buyerConfig ?? '—'} · {session.buyerBudget ? `₹${formatLakh(session.buyerBudget)}` : 'Budget unknown'}
          </p>
          <p className="text-[11px] text-[#52525B]">
            Stage: {getStageLabel(session.buyerStage)} · Last active: {formatTimeAgo(session.lastMessageAt)}
          </p>
        </div>
      </div>

      {!draft ? null : (
        <div className="mt-2">
          <p className="text-[11px] text-[#52525B] mb-1">AI draft — review before sending:</p>
          {editing ? (
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={3}
              className="w-full bg-[#F8FAFC] border border-[#E4E4E7] rounded-lg px-3 py-2 text-[12px] text-[#1A1A2E] resize-none focus:outline-none focus:border-[#185FA5]"
            />
          ) : (
            <div className="bg-[#F8FAFC] border border-[#E4E4E7] rounded-lg px-3 py-2 text-[12px] text-[#1A1A2E]">
              {draft}
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            <button type="button" onClick={openWhatsApp}
              className="bg-[#0F6E56] text-white text-[11px] font-medium px-3 py-1.5 rounded-lg hover:bg-[#085041] transition-colors">
              ✓ Approve & Open WhatsApp
            </button>
            <button type="button" onClick={() => setEditing(!editing)}
              className="bg-[#E6F1FB] text-[#0C447C] text-[11px] font-medium px-3 py-1.5 rounded-lg hover:bg-[#B5D4F4] transition-colors">
              {editing ? 'Done editing' : 'Edit draft'}
            </button>
            <button type="button" onClick={generateDraft} disabled={loading}
              className="text-[11px] text-[#52525B] hover:text-[#1A1A2E] disabled:opacity-50">
              ↻ Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
