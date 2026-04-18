'use client'
import { useState } from 'react'

export default function DraftMessageButton({ sessionId }: { sessionId: string }) {
  const [draft, setDraft] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const generate = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    e?.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/admin/draft-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      })
      const data = await res.json()
      setDraft(data.draft)
    } catch {}
    setLoading(false)
  }

  const copy = () => {
    if (!draft) return
    navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      {!draft ? null : (
        <div className="mt-2">
          <div className="rounded-xl p-3 text-[12px] leading-relaxed" style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)', color: '#D1D5DB' }}>
            {draft}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={copy}
              className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: copied ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)', color: copied ? '#34D399' : '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="text-[11px] px-3 py-1.5 rounded-lg"
              style={{ color: '#6B7280' }}
            >
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
