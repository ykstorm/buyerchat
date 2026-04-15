'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface BuilderFormData {
  brandName: string
  builderName: string
  contactName: string
  zone: string
  deliveryScore: number
  reraScore: number
  qualityScore: number
  financialScore: number
  responsivenessScore: number
  totalTrustScore: number
  grade: string
  notes: string
  status: string
}

const DEFAULT: BuilderFormData = {
  brandName: '',
  builderName: '',
  contactName: '',
  zone: '',
  deliveryScore: 0,
  reraScore: 0,
  qualityScore: 0,
  financialScore: 0,
  responsivenessScore: 0,
  totalTrustScore: 0,
  grade: 'F',
  notes: '',
  status: '',
}

function gradeFromTotal(total: number): string {
  if (total >= 85) return 'A'
  if (total >= 70) return 'B'
  if (total >= 55) return 'C'
  if (total >= 40) return 'D'
  return 'F'
}

function gradeColor(grade: string): string {
  if (grade === 'A') return '#0F6E56'
  if (grade === 'B') return '#185FA5'
  if (grade === 'C') return '#BA7517'
  if (grade === 'D') return '#C2410C'
  return '#A32D2D'
}

function ScoreSlider({ label, value, max, onChange, hint }: {
  label: string; value: number; max: number; onChange: (v: number) => void; hint?: string
}) {
  const pct = (value / max) * 100
  const color = pct >= 70 ? '#0F6E56' : pct >= 50 ? '#BA7517' : '#A32D2D'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[12px] font-medium text-[#374151]">{label}</label>
        <div className="flex items-center gap-1">
          <input
            type="number" min={0} max={max} value={value}
            onChange={e => onChange(Math.min(max, Math.max(0, Number(e.target.value))))}
            className="w-12 text-right border border-[#E0DFDD] rounded px-1 py-0.5 text-[12px] font-mono focus:outline-none focus:border-[#1B3A6B]"
          />
          <span className="text-[11px] text-[#6B7280]">/{max}</span>
        </div>
      </div>
      {hint && <p className="text-[10px] text-[#9CA3AF] mb-1">{hint}</p>}
      <input
        type="range" min={0} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: color }}
      />
      <div className="h-1 bg-[#E5E7EB] rounded-full mt-1 relative">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export default function BuilderForm() {
  const router = useRouter()
  const [form, setForm] = useState<BuilderFormData>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof BuilderFormData, value: any) =>
    setForm(p => ({ ...p, [field]: value }))

  useEffect(() => {
    const total = (form.deliveryScore || 0) + (form.reraScore || 0) +
      (form.qualityScore || 0) + (form.financialScore || 0) +
      (form.responsivenessScore || 0)
    setForm(p => ({ ...p, totalTrustScore: total, grade: gradeFromTotal(total) }))
  }, [form.deliveryScore, form.reraScore, form.qualityScore, form.financialScore, form.responsivenessScore])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.brandName.trim()) { setError('Builder brand name is required.'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/admin/builders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: form.brandName,
          builderName: form.brandName, // builderName mirrors brandName as the unique key
          contactName: form.contactName,
          zone: form.zone,
          deliveryScore: form.deliveryScore,
          reraScore: form.reraScore,
          qualityScore: form.qualityScore,
          financialScore: form.financialScore,
          responsivenessScore: form.responsivenessScore,
          totalTrustScore: form.totalTrustScore,
          grade: form.grade,
          notes: form.notes,
          status: form.status,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Save failed')
      }
      router.push('/admin/builders')
    } catch (err: any) {
      setError(err?.message || 'Save failed. Check all fields.')
    } finally {
      setSaving(false)
    }
  }

  const gc = gradeColor(form.grade)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-[#FCEBEB] border border-[#F5C6C6] text-[#791F1F] text-[12px] px-4 py-3 rounded-xl">{error}</div>
      )}

      {/* Basic info */}
      <div className="bg-white border border-[#E0DFDD] rounded-xl p-5 space-y-4">
        <p className="text-[12px] font-semibold text-[#1B3A6B] uppercase tracking-wider">Builder Info</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-[12px] font-medium text-[#374151] mb-1">Builder Brand Name <span className="text-red-500">*</span></label>
            <input
              value={form.brandName} onChange={e => set('brandName', e.target.value)}
              placeholder="e.g. Venus Group"
              className="w-full border border-[#E0DFDD] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#1B3A6B]"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-1">Legal Entity Name</label>
            <input
              value={form.builderName} onChange={e => set('builderName', e.target.value)}
              placeholder="e.g. Venus Infrastructure Pvt Ltd"
              className="w-full border border-[#E0DFDD] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#1B3A6B]"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-1">Contact Name</label>
            <input
              value={form.contactName} onChange={e => set('contactName', e.target.value)}
              placeholder="e.g. Rahul Shah"
              className="w-full border border-[#E0DFDD] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#1B3A6B]"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-1">Area / Zone</label>
            <input
              value={form.zone} onChange={e => set('zone', e.target.value)}
              placeholder="e.g. Shela, South Bopal"
              className="w-full border border-[#E0DFDD] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#1B3A6B]"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-1">Status</label>
            <input
              value={form.status} onChange={e => set('status', e.target.value)}
              placeholder="e.g. Active, Watch, Blacklisted"
              className="w-full border border-[#E0DFDD] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#1B3A6B]"
            />
          </div>
        </div>
      </div>

      {/* Trust scores */}
      <div className="bg-white border border-[#E0DFDD] rounded-xl p-5 space-y-5">
        <p className="text-[12px] font-semibold text-[#1B3A6B] uppercase tracking-wider">Trust Scores</p>
        <ScoreSlider label="Delivery Record (0–30)" value={form.deliveryScore} max={30} onChange={v => set('deliveryScore', v)}
          hint="Builder track record, past projects, delays" />
        <ScoreSlider label="RERA Compliance (0–20)" value={form.reraScore} max={20} onChange={v => set('reraScore', v)}
          hint="Status, complaints, escrow, possession date adherence" />
        <ScoreSlider label="Construction Quality (0–20)" value={form.qualityScore} max={20} onChange={v => set('qualityScore', v)}
          hint="Build quality, carpet efficiency, material specs" />
        <ScoreSlider label="Financial Strength (0–15)" value={form.financialScore} max={15} onChange={v => set('financialScore', v)}
          hint="Price transparency, bank approvals, financial health" />
        <ScoreSlider label="Responsiveness (0–15)" value={form.responsivenessScore} max={15} onChange={v => set('responsivenessScore', v)}
          hint="Builder behaviour, communication, support quality" />

        {/* Auto-calculated summary */}
        <div className="flex items-center justify-between pt-3 border-t border-[#F4F4F5]">
          <div>
            <p className="text-[11px] text-[#6B7280] mb-0.5">Total Trust Score</p>
            <p className="text-[24px] font-bold text-[#1B3A6B] leading-none">{form.totalTrustScore}<span className="text-[14px] font-normal text-[#9CA3AF]">/100</span></p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-[#6B7280] mb-0.5">Trust Grade</p>
            <p className="text-[32px] font-bold leading-none" style={{ color: gc }}>{form.grade}</p>
          </div>
          <div className="h-14 w-14 rounded-full border-4 flex items-center justify-center" style={{ borderColor: gc }}>
            <span className="text-[11px] font-semibold" style={{ color: gc }}>{form.totalTrustScore}%</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white border border-[#E0DFDD] rounded-xl p-5">
        <p className="text-[12px] font-semibold text-[#1B3A6B] uppercase tracking-wider mb-3">Concern / Notes</p>
        <textarea
          value={form.notes} onChange={e => set('notes', e.target.value)} rows={4}
          placeholder="Internal notes, concerns, red flags — not shown to buyers"
          className="w-full border border-[#E0DFDD] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#1B3A6B] resize-none"
        />
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pb-8">
        <button
          type="submit" disabled={saving}
          className="flex-1 bg-[#1B3A6B] text-white text-[13px] font-semibold py-3 rounded-xl hover:bg-[#162e55] disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Builder'}
        </button>
        <Link href="/admin/builders"
          className="px-5 py-3 border border-[#E0DFDD] rounded-xl text-[13px] text-[#52525B] hover:bg-white transition-colors">
          Cancel
        </Link>
      </div>
    </form>
  )
}
