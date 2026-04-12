'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function ScoreField({ label, max, value, onChange }: { label: string; max: number; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <label className="text-[11px] text-[#9CA3AF]">{label}</label>
        <span className="text-[11px] font-medium text-white">{value}/{max}</span>
      </div>
      <input type="range" min={0} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#1B3A6B]" />
    </div>
  )
}

export default function NewBuilderPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    builderName: '', brandName: '',
    deliveryScore: 0, reraScore: 0, qualityScore: 0,
    financialScore: 0, responsivenessScore: 0,
    concern: '', status: 'Active'
  })
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))
  const trust = form.deliveryScore + form.reraScore + form.qualityScore + form.financialScore + form.responsivenessScore
  const grade = trust >= 85 ? 'A' : trust >= 70 ? 'B' : trust >= 55 ? 'C' : trust >= 40 ? 'D' : 'F'

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/builders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          builderName: form.builderName,
          brandName: form.brandName || form.builderName,
          deliveryScore: form.deliveryScore,
          reraScore: form.reraScore,
          qualityScore: form.qualityScore,
          financialScore: form.financialScore,
          responsivenessScore: form.responsivenessScore,
          concern: form.concern,
          status: form.status,
        })
      })
      if (res.ok) router.push('/admin/builders')
    } catch {}
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] p-6">
      <div className="max-w-xl mx-auto">
        <Link href="/admin/builders" className="text-[12px] text-[#9CA3AF] hover:text-white mb-4 inline-block">← Back to Builders</Link>
        <div className="rounded-xl p-6" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h1 className="text-[16px] font-semibold text-white mb-5">Add New Builder</h1>
          <div className="space-y-4">
            <div>
              <label className="text-[11px] text-[#9CA3AF] block mb-1">Builder Name (unique ID) *</label>
              <input value={form.builderName} onChange={e => set('builderName', e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-[13px] text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}" placeholder="e.g. venus-group" />
            </div>
            <div>
              <label className="text-[11px] text-[#9CA3AF] block mb-1">Brand Name (what buyers see)</label>
              <input value={form.brandName} onChange={e => set('brandName', e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-[13px] text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}" placeholder="e.g. Venus Group" />
            </div>
            <div className="bg-white/[0.03] rounded-lg p-4 space-y-3">
              <p className="text-[11px] font-medium text-white mb-2">Trust Scores</p>
              <ScoreField label="Delivery Score" max={30} value={form.deliveryScore} onChange={v => set('deliveryScore', v)} />
              <ScoreField label="RERA Score" max={20} value={form.reraScore} onChange={v => set('reraScore', v)} />
              <ScoreField label="Quality Score" max={20} value={form.qualityScore} onChange={v => set('qualityScore', v)} />
              <ScoreField label="Financial Score" max={15} value={form.financialScore} onChange={v => set('financialScore', v)} />
              <ScoreField label="Responsiveness Score" max={15} value={form.responsivenessScore} onChange={v => set('responsivenessScore', v)} />
              <div className="flex items-center justify-between pt-2 border-t border-[#E0DFDD]">
                <span className="text-[12px] text-[#9CA3AF]">Trust Score</span>
                <span className="text-[16px] font-bold text-white">{trust}/100 — Grade {grade}</span>
              </div>
            </div>
            <div>
              <label className="text-[11px] text-[#9CA3AF] block mb-1">Notes / Concern</label>
              <textarea value={form.concern} onChange={e => set('concern', e.target.value)} rows={3}
                className="w-full border border-[#E0DFDD] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#1B3A6B] resize-none" />
            </div>
            <button onClick={handleSubmit} disabled={!form.builderName || saving}
              className="w-full bg-[#1B3A6B] text-white rounded-lg py-2.5 text-[13px] font-medium disabled:opacity-40">
              {saving ? 'Saving...' : 'Add Builder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
