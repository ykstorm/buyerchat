'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function EditBuilderPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    builderName: '', brandName: '',
    deliveryScore: 0, reraScore: 0, qualityScore: 0,
    financialScore: 0, responsivenessScore: 0,
    concern: '', status: 'Active'
  })
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))
  const trust = form.deliveryScore + form.reraScore + form.qualityScore + form.financialScore + form.responsivenessScore
  const grade = trust >= 85 ? 'A' : trust >= 70 ? 'B' : trust >= 55 ? 'C' : trust >= 40 ? 'D' : 'F'

  useEffect(() => {
    fetch(`/api/admin/builders/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data) setForm({
          builderName: data.builderName ?? '',
          brandName: data.brandName ?? '',
          deliveryScore: data.deliveryScore ?? 0,
          reraScore: data.reraScore ?? 0,
          qualityScore: data.qualityScore ?? 0,
          financialScore: data.financialScore ?? 0,
          responsivenessScore: data.responsivenessScore ?? 0,
          concern: data.concern ?? '',
          status: data.status ?? 'Active'
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/builders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, totalTrustScore: trust, grade })
      })
      if (res.ok) router.push('/admin/builders')
    } catch {}
    setSaving(false)
  }

  const ScoreField = ({ label, field, max }: { label: string; field: string; max: number }) => (
    <div>
      <div className="flex justify-between mb-1">
        <label className="text-[11px] text-[#52525B]">{label}</label>
        <span className="text-[11px] font-medium text-[#1B3A6B]">{(form as any)[field]}/{max}</span>
      </div>
      <input type="range" min={0} max={max} value={(form as any)[field]}
        onChange={e => set(field, Number(e.target.value))}
        className="w-full accent-[#1B3A6B]" />
    </div>
  )

  if (loading) return (
    <div className="min-h-screen bg-[#EFEFED] flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-[#E0DFDD] border-t-[#1B3A6B] rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#EFEFED] p-6">
      <div className="max-w-xl mx-auto">
        <Link href="/admin/builders" className="text-[12px] text-[#52525B] hover:text-[#1B3A6B] mb-4 inline-block">← Back to Builders</Link>
        <div className="bg-white rounded-xl p-6" style={{ border: '0.5px solid #E0DFDD' }}>
          <h1 className="text-[16px] font-semibold text-[#1B3A6B] mb-5">Edit Builder</h1>
          <div className="space-y-4">
            <div>
              <label className="text-[11px] text-[#52525B] block mb-1">Builder Name</label>
              <input value={form.builderName} onChange={e => set('builderName', e.target.value)}
                className="w-full border border-[#E0DFDD] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#1B3A6B]" />
            </div>
            <div>
              <label className="text-[11px] text-[#52525B] block mb-1">Brand Name</label>
              <input value={form.brandName} onChange={e => set('brandName', e.target.value)}
                className="w-full border border-[#E0DFDD] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#1B3A6B]" />
            </div>
            <div className="bg-[#F8F8F7] rounded-lg p-4 space-y-3">
              <p className="text-[11px] font-medium text-[#1B3A6B] mb-2">Trust Scores</p>
              <ScoreField label="Delivery Score" field="deliveryScore" max={30} />
              <ScoreField label="RERA Score" field="reraScore" max={20} />
              <ScoreField label="Quality Score" field="qualityScore" max={20} />
              <ScoreField label="Financial Score" field="financialScore" max={15} />
              <ScoreField label="Responsiveness Score" field="responsivenessScore" max={15} />
              <div className="flex items-center justify-between pt-2 border-t border-[#E0DFDD]">
                <span className="text-[12px] text-[#52525B]">Trust Score</span>
                <span className="text-[16px] font-bold text-[#1B3A6B]">{trust}/100 — Grade {grade}</span>
              </div>
            </div>
            <div>
              <label className="text-[11px] text-[#52525B] block mb-1">Notes / Concern</label>
              <textarea value={form.concern} onChange={e => set('concern', e.target.value)} rows={3}
                className="w-full border border-[#E0DFDD] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#1B3A6B] resize-none" />
            </div>
            <button onClick={handleSubmit} disabled={saving}
              className="w-full bg-[#1B3A6B] text-white rounded-lg py-2.5 text-[13px] font-medium disabled:opacity-40">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
