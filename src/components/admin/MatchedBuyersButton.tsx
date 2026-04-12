'use client'
import { useState } from 'react'

interface MatchedBuyer {
  id: string
  budget: number | null
  config: string | null
  stage: string
  daysSilent: number
}

export default function MatchedBuyersButton({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ matchedBuyers: number; buyers: MatchedBuyer[] } | null>(null)
  const [open, setOpen] = useState(false)

  const fetch_ = async () => {
    if (result) { setOpen(!open); return }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/match-buyers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      })
      const data = await res.json()
      setResult(data)
      setOpen(true)
    } catch {}
    setLoading(false)
  }

  return (
    <div>
      <button type="button" onClick={fetch_} disabled={loading}
        className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors"
        style={{ background: 'rgba(167,139,250,0.1)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.2)' }}>
        {loading ? 'Matching…' : result ? `${result.matchedBuyers} matched buyers` : '✦ Find matched buyers'}
      </button>
      {open && result && result.buyers.length > 0 && (
        <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(167,139,250,0.15)' }}>
          {result.buyers.slice(0, 5).map(b => (
            <a key={b.id} href={`/admin/buyers/${b.id}`}
              className="flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span className="text-[11px] text-white">
                {b.config ?? 'Unknown'} · {b.budget ? `₹${Math.round(b.budget/100000)}L` : '—'}
              </span>
              <span className="text-[10px]" style={{ color: '#6B7280' }}>{b.daysSilent}d silent</span>
            </a>
          ))}
          {result.buyers.length > 5 && (
            <p className="text-[10px] px-3 py-2" style={{ color: '#6B7280' }}>+{result.buyers.length - 5} more buyers</p>
          )}
        </div>
      )}
    </div>
  )
}
