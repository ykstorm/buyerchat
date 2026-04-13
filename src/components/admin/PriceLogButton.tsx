'use client'

import { useState } from 'react'

const CHANGE_TYPES = [
  { value: 'increase', label: '↑ Increase' },
  { value: 'decrease', label: '↓ Decrease' },
  { value: 'launch',   label: '+ Launch price' },
  { value: 'offer',    label: '% Offer / discount' },
]

interface Props {
  projectId: string
  projectName: string
}

export default function PriceLogButton({ projectId, projectName }: Props) {
  const [open, setOpen]           = useState(false)
  const [newPrice, setNewPrice]   = useState('')
  const [changeType, setChangeType] = useState('increase')
  const [result, setResult]       = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)

  const toggle = () => {
    setOpen(v => !v)
    setResult(null)
    setNewPrice('')
  }

  const handleSubmit = async () => {
    const price = parseFloat(newPrice)
    if (!price || price <= 0) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/price-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, newPrice: price, changeType }),
      })
      const data = await res.json() as { success?: boolean; affectedBuyers?: number; error?: string }
      if (res.ok) {
        const n = data.affectedBuyers ?? 0
        setResult(`Logged. ${n} buyer${n !== 1 ? 's' : ''} affected.`)
        setNewPrice('')
        setTimeout(() => { setOpen(false); setResult(null) }, 2200)
      } else {
        setResult('Error: ' + (data.error ?? 'Failed'))
      }
    } catch {
      setResult('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={toggle}
        className="text-[11px] text-[#185FA5] border border-[#185FA5]/30 px-2 py-1 rounded-lg hover:bg-[#EEF5FD] transition-colors whitespace-nowrap"
      >
        + Log
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-20 bg-white border border-black/[0.08] rounded-xl shadow-lg p-3 w-[210px]">
          <p className="text-[11px] font-medium text-[#1A1A2E] mb-2 truncate" title={projectName}>
            {projectName}
          </p>

          <div className="mb-2">
            <label className="text-[10px] text-[#52525B] block mb-1">Change type</label>
            <select
              value={changeType}
              onChange={e => setChangeType(e.target.value)}
              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[16px] md:text-[13px] focus:outline-none focus:border-[#185FA5] bg-white"
            >
              {CHANGE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="text-[10px] text-[#52525B] block mb-1">New price / sqft (₹)</label>
            <input
              type="number"
              value={newPrice}
              onChange={e => setNewPrice(e.target.value)}
              placeholder="e.g. 8500"
              min={1}
              className="w-full border border-black/10 rounded-lg px-2 py-1.5 text-[16px] md:text-[13px] focus:outline-none focus:border-[#185FA5]"
            />
          </div>

          {result ? (
            <p
              className="text-[11px] font-medium text-center py-1"
              style={{ color: result.startsWith('Error') ? '#A32D2D' : '#0F6E56' }}
            >
              {result}
            </p>
          ) : (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !newPrice}
                className="flex-1 bg-[#185FA5] text-white text-[11px] font-medium py-1.5 rounded-lg disabled:opacity-50 transition-opacity"
              >
                {loading ? '…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-2.5 text-[11px] text-[#52525B] border border-black/10 rounded-lg hover:bg-[#F4F4F5] transition-colors"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
