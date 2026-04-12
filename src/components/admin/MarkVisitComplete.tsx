'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MarkVisitComplete({ visitId }: { visitId: string }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  const mark = async () => {
    if (!confirm('Mark this visit as completed?')) return
    setLoading(true)
    try {
      await fetch(`/api/admin/visits/${visitId}/complete`, { method: 'POST' })
      setDone(true)
      router.refresh()
    } catch {}
    setLoading(false)
  }

  if (done) return <span className="text-[11px] font-semibold" style={{ color: '#34D399' }}>✓ Completed</span>

  return (
    <button type="button" onClick={mark} disabled={loading}
      className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors"
      style={{ background: 'rgba(52,211,153,0.1)', color: '#34D399', border: '1px solid rgba(52,211,153,0.2)' }}>
      {loading ? 'Saving…' : 'Mark Complete'}
    </button>
  )
}
