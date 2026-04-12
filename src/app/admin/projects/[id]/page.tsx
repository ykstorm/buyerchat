'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface ProjectForm {
  projectName: string
  builderName: string
  microMarket: string
  constructionStatus: string
  minPrice: number
  maxPrice: number
  pricePerSqft: number
  pricePerSqftType: string
  loadingFactor: number
  charges: { name: string; rate: number; type: string; amount: number }[]
  allInPrice: number
  availableUnits: number
  possessionDate: string
  reraNumber: string
  unitTypes: string
  amenities: string
  latitude: number
  longitude: number
  locationScore: number
  amenitiesScore: number
  infrastructureScore: number
  demandScore: number
  isActive: boolean
  // Trust scores
  deliveryScore: number
  reraScore: number
  qualityScore: number
  financialScore: number
  responsivenessScore: number
  // SOP fields
  sopLocation: number
  sopPlanning: number
  sopAmenities: number
  sopGrowth: number
  // AI output
  bestFor: string
  mainConcern: string
  analystNotes: string
  // Decision fields
  totalTrustScore: number
  decisionTag: string
  honestConcern: string
  analystNote: string
  possessionFlag: string
  configurations: string
  bankApprovals: string
  carpetSqftMin: number
  sbaSqftMin: number
}

const DEFAULT: ProjectForm = {
  projectName: '', builderName: '', microMarket: 'Shela',
  constructionStatus: 'Under Construction',
  minPrice: 0, maxPrice: 0, pricePerSqft: 0, pricePerSqftType: 'SBU', loadingFactor: 1.37, charges: [], allInPrice: 0, availableUnits: 0,
  possessionDate: '', reraNumber: '', unitTypes: '', amenities: '',
  latitude: 23.0225, longitude: 72.5714,
  locationScore: 50, amenitiesScore: 50, infrastructureScore: 50, demandScore: 50,
  isActive: true,
  deliveryScore: 0, reraScore: 0, qualityScore: 0, financialScore: 0, responsivenessScore: 0,
  sopLocation: 5, sopPlanning: 5, sopAmenities: 5, sopGrowth: 5,
  bestFor: '', mainConcern: '', analystNotes: '',
  totalTrustScore: 0, decisionTag: '',
  honestConcern: '', analystNote: '', possessionFlag: 'amber',
  configurations: '', bankApprovals: '',
  carpetSqftMin: 0, sbaSqftMin: 0,
}

function trustTotal(f: ProjectForm) {
  return f.deliveryScore + f.reraScore + f.qualityScore + f.financialScore + f.responsivenessScore
}

function trustGrade(total: number): string {
  if (total >= 85) return 'A'
  if (total >= 70) return 'B'
  if (total >= 55) return 'C'
  if (total >= 40) return 'D'
  return 'F'
}

function trustFlag(total: number): { label: string; color: string } {
  if (total >= 80) return { label: 'GREEN', color: '#0F6E56' }
  if (total >= 60) return { label: 'AMBER', color: '#BA7517' }
  return { label: 'RED', color: '#A32D2D' }
}

function allInPrice(f: ProjectForm): number {
  if (!f.pricePerSqft || !f.minPrice) return 0
  const gst = f.minPrice * 0.05
  const stamp = f.minPrice * 0.065
  const reg = f.minPrice * 0.01
  return Math.round((f.minPrice + gst + stamp + reg) / 100000) * 100000
}

function ScoreInput({ label, value, max, onChange, hint, type, options }: {
  label: string; value: number | string; max?: number; onChange: (v: any) => void; hint?: string
  type?: 'number' | 'textarea' | 'select'; options?: string[]
}) {
  if (type === 'textarea') {
    return (
      <div>
        <label className="block text-[11px] text-[#9CA3AF] mb-1">{label}</label>
        {hint && <p className="text-[10px] text-[#6B7280] mb-1">{hint}</p>}
        <textarea value={value as string} onChange={e => onChange(e.target.value)} rows={3}
          className="w-full rounded-lg px-3 py-2 text-[12px] text-white outline-none resize-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
      </div>
    )
  }
  if (type === 'select' && options) {
    return (
      <div>
        <label className="block text-[11px] text-[#9CA3AF] mb-1">{label}</label>
        {hint && <p className="text-[10px] text-[#6B7280] mb-1">{hint}</p>}
        <select value={value as string} onChange={e => onChange(e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-[12px] text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      </div>
    )
  }
  const numVal = value as number
  const pct = max ? (numVal / max) * 100 : 0
  const color = pct >= 70 ? '#0F6E56' : pct >= 50 ? '#BA7517' : '#A32D2D'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] text-[#9CA3AF]">{label}</label>
        <div className="flex items-center gap-1">
          <input type="number" min={0} max={max} value={numVal}
            onChange={e => onChange(Math.min(max ?? 100, Math.max(0, Number(e.target.value))))}
            className="w-12 text-right rounded px-1 py-0.5 text-[12px] font-mono text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
          <span className="text-[11px] text-[#9CA3AF]">/{max}</span>
        </div>
      </div>
      {hint && <p className="text-[10px] text-[#6B7280] mb-1">{hint}</p>}
      <div className="h-1.5 bg-[#E4E4E7] rounded-full">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export default function ProjectEditPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const isNew = id === 'new'

  const [form, setForm] = useState<ProjectForm>(DEFAULT)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const [reraFetching, setReraFetching] = useState(false)

  useEffect(() => {
    if (!isNew) {
      fetch(`/api/admin/projects/${id}`)
        .then(r => r.json())
        .then(data => {
          setForm({
            projectName: data.projectName ?? '',
            builderName: data.builderName ?? '',
            microMarket: data.microMarket ?? 'Shela',
            constructionStatus: data.constructionStatus ?? 'Under Construction',
            minPrice: data.minPrice ?? 0,
            maxPrice: data.maxPrice ?? 0,
            pricePerSqft: data.pricePerSqft ?? 0,
            pricePerSqftType: data.pricePerSqftType ?? 'SBU',
            loadingFactor: data.loadingFactor ?? 1.37,
            charges: (data.charges as any[]) ?? [],
            allInPrice: data.allInPrice ?? 0,
            availableUnits: data.availableUnits ?? 0,
            possessionDate: data.possessionDate ? data.possessionDate.split('T')[0] : '',
            reraNumber: data.reraNumber ?? '',
            unitTypes: Array.isArray(data.unitTypes) ? data.unitTypes.join(', ') : '',
            amenities: Array.isArray(data.amenities) ? data.amenities.join(', ') : '',
            latitude: data.latitude ?? 23.0225,
            longitude: data.longitude ?? 72.5714,
            locationScore: data.locationScore ?? 50,
            amenitiesScore: data.amenitiesScore ?? 50,
            infrastructureScore: data.infrastructureScore ?? 50,
            demandScore: data.demandScore ?? 50,
            isActive: data.isActive ?? true,
            deliveryScore: data.builder?.deliveryScore ?? 0,
            reraScore: data.builder?.reraScore ?? 0,
            qualityScore: data.builder?.qualityScore ?? 0,
            financialScore: data.builder?.financialScore ?? 0,
            responsivenessScore: data.builder?.responsivenessScore ?? 0,
            sopLocation: 5, sopPlanning: 5, sopAmenities: 5, sopGrowth: 5,
            bestFor: '', mainConcern: '', analystNotes: '',
            totalTrustScore: data.totalTrustScore ?? 0,
            decisionTag: data.decisionTag ?? '',
            honestConcern: data.honestConcern ?? '',
            analystNote: data.analystNote ?? '',
            possessionFlag: data.possessionFlag ?? 'amber',
            configurations: data.configurations ?? '',
            bankApprovals: data.bankApprovals ?? '',
            carpetSqftMin: data.carpetSqftMin ?? 0,
            sbaSqftMin: data.sbaSqftMin ?? 0,
          })
          setLoading(false)
        })
        .catch(() => { setLoading(false); setError('Failed to load.') })
    }
  }, [id, isNew])

  useEffect(() => {
    const total = (form.deliveryScore || 0) + (form.reraScore || 0) +
                  (form.qualityScore || 0) + (form.financialScore || 0) +
                  (form.responsivenessScore || 0)
    const tag = total >= 80 ? 'Strong Buy' :
                total >= 65 ? 'Buy w/ Cond' :
                total >= 50 ? 'Wait' : 'Avoid'
    setForm(p => ({ ...p, totalTrustScore: total, decisionTag: tag }))
  }, [form.deliveryScore, form.reraScore, form.qualityScore, form.financialScore, form.responsivenessScore])

  const set = (field: keyof ProjectForm, value: any) =>
    setForm(p => ({ ...p, [field]: value }))

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      const payload = {
        ...form,
        minPrice: Number(form.minPrice),
        maxPrice: Number(form.maxPrice),
        pricePerSqft: Number(form.pricePerSqft),
        availableUnits: Number(form.availableUnits),
        possessionDate: new Date(form.possessionDate).toISOString(),
        unitTypes: form.unitTypes.split(',').map(s => s.trim()).filter(Boolean),
        amenities: form.amenities.split(',').map(s => s.trim()).filter(Boolean),
        locationScore: Number(form.locationScore),
        amenitiesScore: Number(form.amenitiesScore),
        infrastructureScore: Number(form.infrastructureScore),
        demandScore: Number(form.demandScore),
      }
      const url = isNew ? '/api/admin/projects' : `/api/admin/projects/${id}`
      const method = isNew ? 'POST' : 'PUT'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Save failed')
      router.push('/admin/projects')
    } catch {
      setError('Save failed. Check all required fields.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this project? This cannot be undone.')) return
    await fetch(`/api/admin/projects/${id}`, { method: 'DELETE' })
    router.push('/admin/projects')
  }

  const total = trustTotal(form)
  const grade = trustGrade(total)
  const flag = trustFlag(total)
  const allIn = allInPrice(form)

  const STEPS = ['RERA fetch', 'Brochure', 'Pricing', 'Trust scores', 'SOP fields', 'Review & save']

  if (loading) return <div className="text-[13px] text-[#9CA3AF] p-6">Loading…</div>

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[14px] font-medium text-white">
            Projects / {isNew ? 'Add New Project' : `Edit — ${form.projectName || 'Project'}`}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => router.back()}
            className="text-[12px] text-[#9CA3AF] border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="text-[12px] bg-[#185FA5] text-white px-4 py-1.5 rounded-lg hover:bg-[#0C447C] disabled:opacity-50 transition-colors font-medium">
            {saving ? 'Saving…' : isNew ? 'Save to PM' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <button key={s} type="button" onClick={() => setStep(i + 1)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
              step === i + 1 ? 'bg-[#185FA5] text-white' : 'bg-[#111827] border border-white/[0.08] text-[#9CA3AF] hover:border-[#60A5FA]/30'
            }`}>
            <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${
              step === i + 1 ? 'bg-white/20' : 'bg-white/10'
            }`}>{i + 1}</span>
            {s}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-[#FCEBEB] text-[#791F1F] text-[12px] p-3 rounded-lg mb-4">{error}</div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {/* Main form */}
        <div className="col-span-2 space-y-4">

          {/* Step 1: RERA */}
          {step === 1 && (
            <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[12px] font-medium text-white mb-1">Step 1 — RERA Data</p>
              <p className="text-[11px] text-[#9CA3AF] mb-4">Auto-fetch from gujrera.gujarat.gov.in — enter RERA number and click fetch</p>
              <div className="flex gap-2 mb-4">
                <input value={form.reraNumber} onChange={e => set('reraNumber', e.target.value)}
                  placeholder="PR/GJ/AHMEDABAD/..."
                  className="flex-1 rounded-lg px-3 py-2 text-[12px] font-mono text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                <button type="button" disabled={reraFetching || !form.reraNumber}
                  className="bg-[#185FA5] text-white text-[11px] font-medium px-4 py-2 rounded-lg hover:bg-[#0C447C] disabled:opacity-50 transition-colors">
                  {reraFetching ? 'Fetching…' : 'Fetch from portal'}
                </button>
              </div>
              <div className="bg-white/10 border border-white/10 rounded-lg p-3 text-[11px] text-[#9CA3AF]">
                <p className="font-medium text-white mb-1">Puppeteer RERA auto-scrape</p>
                <p>Enter RERA number above and click Fetch. System will scrape gujrera.gujarat.gov.in and auto-fill: project name, legal entity, status, possession date, complaints, escrow bank.</p>
                <p className="mt-1 text-[#185FA5]">Note: Auto-fetch is Day 31+ feature. Enter manually for now.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div>
                  <label className="block text-[11px] text-[#9CA3AF] mb-1">Project name *</label>
                  <input value={form.projectName} onChange={e => set('projectName', e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-[12px] text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                <div>
                  <label className="block text-[11px] text-[#9CA3AF] mb-1">Builder brand name *</label>
                  <input value={form.builderName} onChange={e => set('builderName', e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-[12px] text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                <div>
                  <label className="block text-[11px] text-[#9CA3AF] mb-1">Area</label>
                  <select value={form.microMarket} onChange={e => set('microMarket', e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-[12px] text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <option>Shela</option>
                    <option>South Bopal</option>
                    <option>Bopal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[#9CA3AF] mb-1">Possession date</label>
                  <input type="date" value={form.possessionDate} onChange={e => set('possessionDate', e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-[12px] text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                <div>
                  <label className="block text-[11px] text-[#9CA3AF] mb-1">Construction status</label>
                  <select value={form.constructionStatus} onChange={e => set('constructionStatus', e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-[12px] text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <option>Under Construction</option>
                    <option>Ready to Move</option>
                    <option>New Launch</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[#9CA3AF] mb-1">Available units</label>
                  <input type="number" value={form.availableUnits} onChange={e => set('availableUnits', e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-[12px] font-mono text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-[11px] text-[#9CA3AF] mb-1">Unit types (comma-separated e.g. 2BHK, 3BHK)</label>
                <input value={form.unitTypes} onChange={e => set('unitTypes', e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-[12px] text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <div className="mt-3">
                <label className="block text-[11px] text-[#9CA3AF] mb-1">Amenities (comma-separated)</label>
                <textarea value={form.amenities} onChange={e => set('amenities', e.target.value)} rows={2}
                  className="w-full rounded-lg px-3 py-2 text-[12px] text-white outline-none resize-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
            </div>
          )}

          {/* Step 2: Brochure — placeholder */}
          {step === 2 && (
            <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[12px] font-medium text-white mb-1">Step 2 — Brochure AI Extract</p>
              <p className="text-[11px] text-[#9CA3AF] mb-4">Upload PDF → Claude API reads and fills 40+ fields automatically</p>
              <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center">
                <p className="text-[13px] text-[#9CA3AF] mb-1">Click to upload brochure PDF</p>
                <p className="text-[11px] text-[#6B7280]">Claude API will extract configs, areas, specs, amenities automatically</p>
                <p className="text-[11px] text-[#185FA5] mt-2">Note: Brochure AI extract is Day 31+ feature. Enter amenities manually in Step 1 for now.</p>
              </div>
            </div>
          )}

          {/* Step 3: Pricing */}
          {step === 3 && (
              <div className="space-y-4">
                {/* Warning */}
                <div className="rounded-xl px-3 py-2.5" style={{ background: '#FEF3C7', border: '1px solid #D97706' }}>
                  <p className="text-[11px] font-semibold text-[#92400E]">⚠ Always call builder for current price</p>
                  <p className="text-[11px] text-[#92400E]">Never use 99acres or MagicBricks — portal prices lag 2-4 months.</p>
                </div>

                {/* Base Price */}
                <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#4B5563' }}>Base Price</p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#4B5563' }}>Rate (₹/sqft) *</label>
                      <input type="number" value={form.pricePerSqft} onChange={e => set('pricePerSqft', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-[12px] font-mono text-white outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#4B5563' }}>Type</label>
                      <div className="flex gap-2">
                        {['SBU', 'CARPET'].map(t => (
                          <button key={t} type="button" onClick={() => set('pricePerSqftType', t)}
                            className="flex-1 py-2 rounded-lg text-[11px] font-semibold transition-colors"
                            style={{ background: form.pricePerSqftType === t ? '#1B4F8A' : 'rgba(255,255,255,0.05)', color: form.pricePerSqftType === t ? 'white' : '#6B7280', border: `1px solid ${form.pricePerSqftType === t ? '#1B4F8A' : 'rgba(255,255,255,0.08)'}` }}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#4B5563' }}>Min Price (₹)</label>
                      <input type="number" value={form.minPrice} onChange={e => set('minPrice', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-[12px] font-mono text-white outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#4B5563' }}>Max Price (₹)</label>
                      <input type="number" value={form.maxPrice} onChange={e => set('maxPrice', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-[12px] font-mono text-white outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#4B5563' }}>Loading Factor</label>
                      <input type="number" step="0.01" value={form.loadingFactor} onChange={e => set('loadingFactor', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-[12px] font-mono text-white outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    </div>
                  </div>
                  {form.pricePerSqft > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)' }}>
                        <p style={{ color: '#6B7280' }}>SBU Rate</p>
                        <p className="font-mono font-semibold text-white">₹{form.pricePerSqftType === 'SBU' ? form.pricePerSqft.toLocaleString('en-IN') : Math.round(form.pricePerSqft / form.loadingFactor).toLocaleString('en-IN')}/sqft</p>
                      </div>
                      <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)' }}>
                        <p style={{ color: '#6B7280' }}>Carpet Rate</p>
                        <p className="font-mono font-semibold text-white">₹{form.pricePerSqftType === 'CARPET' ? form.pricePerSqft.toLocaleString('en-IN') : Math.round(form.pricePerSqft * form.loadingFactor).toLocaleString('en-IN')}/sqft</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Package Charges */}
                <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#4B5563' }}>Package Charges</p>
                    <button type="button"
                      onClick={() => set('charges', [...form.charges, { name: '', rate: 0, type: 'SBU', amount: 0 }])}
                      className="text-[10px] px-2 py-1 rounded-lg" style={{ background: 'rgba(96,165,250,0.1)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.2)' }}>
                      + Add row
                    </button>
                  </div>
                  {form.charges.length === 0 && (
                    <p className="text-[11px] text-center py-3" style={{ color: '#4B5563' }}>No charges added. Click + Add row.</p>
                  )}
                  <div className="space-y-2">
                    {form.charges.map((charge, i) => (
                      <div key={i} className="grid gap-2" style={{ gridTemplateColumns: '1fr 80px 90px 70px 24px' }}>
                        <input placeholder="Charge name" value={charge.name}
                          onChange={e => { const c = [...form.charges]; c[i] = { ...c[i], name: e.target.value }; set('charges', c) }}
                          className="px-2 py-1.5 rounded-lg text-[11px] text-white outline-none"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                        <input type="number" placeholder="Rate" value={charge.rate}
                          onChange={e => { const c = [...form.charges]; c[i] = { ...c[i], rate: Number(e.target.value), amount: charge.type === 'FIXED' ? Number(e.target.value) : 0 }; set('charges', c) }}
                          className="px-2 py-1.5 rounded-lg text-[11px] font-mono text-white outline-none"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                        <select value={charge.type}
                          onChange={e => { const c = [...form.charges]; c[i] = { ...c[i], type: e.target.value }; set('charges', c) }}
                          className="px-2 py-1.5 rounded-lg text-[11px] text-white outline-none"
                          style={{ background: '#1F2937', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <option value="SBU">₹/sqft SBU</option>
                          <option value="CARPET">₹/sqft Carpet</option>
                          <option value="FIXED">Fixed ₹</option>
                        </select>
                        <span className="text-[10px] font-mono flex items-center" style={{ color: '#34D399' }}>
                          ₹{charge.type === 'FIXED' ? (charge.rate/100000).toFixed(1) : '—'}L
                        </span>
                        <button type="button" onClick={() => { const c = [...form.charges]; c.splice(i, 1); set('charges', c) }}
                          className="text-[#F87171] text-[14px] flex items-center justify-center">×</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#4B5563' }}>Location</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: '#4B5563' }}>Latitude</label>
                      <input type="number" step="0.0001" value={form.latitude} onChange={e => set('latitude', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-[12px] font-mono text-white outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: '#4B5563' }}>Longitude</label>
                      <input type="number" step="0.0001" value={form.longitude} onChange={e => set('longitude', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-[12px] font-mono text-white outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    </div>
                  </div>
                </div>

                {/* ALL-IN summary */}
                {form.minPrice > 0 && (
                  <div className="rounded-xl p-4" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)' }}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#34D399' }}>ALL-IN Estimate</p>
                    <div className="space-y-1.5 text-[11px]">
                      {[
                        { label: 'Base price', value: form.minPrice },
                        { label: '+ GST 5%', value: Math.round(form.minPrice * 0.05) },
                        { label: '+ Stamp duty 6.5%', value: Math.round(form.minPrice * 0.065) },
                        { label: '+ Registration 1%', value: Math.round(form.minPrice * 0.01) },
                      ].map(row => (
                        <div key={row.label} className="flex justify-between">
                          <span style={{ color: '#6B7280' }}>{row.label}</span>
                          <span className="font-mono" style={{ color: '#D1D5DB' }}>₹{row.value.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 mt-1" style={{ borderTop: '1px solid rgba(52,211,153,0.2)' }}>
                        <span className="font-semibold" style={{ color: '#34D399' }}>ALL-IN Total</span>
                        <span className="font-mono font-bold" style={{ color: '#34D399' }}>₹{allIn.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
          )}

          {/* Step 4: Trust scores */}
          {step === 4 && (
            <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[12px] font-medium text-white mb-1">Step 4 — 5 Trust Scores</p>
              <p className="text-[11px] text-[#9CA3AF] mb-4">Your assessment — refer Scoring Anchors sheet for calibration. Score based on evidence, not gut feel.</p>
              <div className="space-y-4">
                <ScoreInput label="Delivery record (0–30)" value={form.deliveryScore} max={30}
                  onChange={v => set('deliveryScore', v)}
                  hint="Builder track record, past projects, delays" />
                <ScoreInput label="RERA compliance (0–20)" value={form.reraScore} max={20}
                  onChange={v => set('reraScore', v)}
                  hint="Status, complaints, escrow, possession date" />
                <ScoreInput label="Construction quality (0–20)" value={form.qualityScore} max={20}
                  onChange={v => set('qualityScore', v)}
                  hint="Construction quality, carpet efficiency, specs" />
                <ScoreInput label="Financial strength (0–15)" value={form.financialScore} max={15}
                  onChange={v => set('financialScore', v)}
                  hint="Price vs micro-zone, transparency, bank approvals" />
                <ScoreInput label="Responsiveness (0–15)" value={form.responsivenessScore} max={15}
                  onChange={v => set('responsivenessScore', v)}
                  hint="Builder behaviour, transparency, support quality" />
              </div>
            </div>
          )}

          {/* Step 5: SOP fields */}
          {step === 5 && (
            <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[12px] font-medium text-white mb-1">Step 5 — 4 SOP Manual Fields</p>
              <p className="text-[11px] text-[#9CA3AF] mb-4">Only these 4 need your judgment — everything else is auto. Rate 1–10. Requires your physical observation.</p>
              <div className="space-y-4">
                <ScoreInput label="Location (1–10)" value={form.sopLocation} max={10}
                  onChange={v => set('sopLocation', v)}
                  hint="Commute ease, approach road, schools, hospitals — field observation" />
                <ScoreInput label="Planning (1–10)" value={form.sopPlanning} max={10}
                  onChange={v => set('sopPlanning', v)}
                  hint="Carpet efficiency feel, room proportions, natural light, layout logic" />
                <ScoreInput label="Amenities (1–10)" value={form.sopAmenities} max={10}
                  onChange={v => set('sopAmenities', v)}
                  hint="Confirmed vs planned. Quality of what is visible and usable now." />
                <ScoreInput label="Growth (1–10)" value={form.sopGrowth} max={10}
                  onChange={v => set('sopGrowth', v)}
                  hint="Only confirmed infrastructure — no speculation. Verified only." />
              </div>
              <div className="grid grid-cols-1 gap-3 mt-4">
                <div>
                  <label className="block text-[11px] text-[#9CA3AF] mb-1">Best for (1 line)</label>
                  <input value={form.bestFor} onChange={e => set('bestFor', e.target.value)}
                    placeholder="e.g. Families with school-going kids wanting Shela lifestyle"
                    className="w-full rounded-lg px-3 py-2 text-[12px] text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                <div>
                  <label className="block text-[11px] text-[#9CA3AF] mb-1">Main concern (MANDATORY)</label>
                  <input value={form.mainConcern} onChange={e => set('mainConcern', e.target.value)}
                    placeholder="e.g. First project by this builder — no delivery track record"
                    className="w-full rounded-lg px-3 py-2 text-[12px] text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                <div>
                  <label className="block text-[11px] text-[#9CA3AF] mb-1">Analyst notes</label>
                  <textarea value={form.analystNotes} onChange={e => set('analystNotes', e.target.value)} rows={3}
                    className="w-full rounded-lg px-3 py-2 text-[12px] text-white outline-none resize-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                <ScoreInput label="Honest Concern (what buyers must know)" value={form.honestConcern} onChange={v => set('honestConcern', v)} type="textarea" />
                <ScoreInput label="Analyst Note (insider intel)" value={form.analystNote} onChange={v => set('analystNote', v)} type="textarea" />
                <ScoreInput label="Possession Flag" value={form.possessionFlag} onChange={v => set('possessionFlag', v)} type="select" options={['green','amber','red']} />
                <ScoreInput label="Configurations" value={form.configurations} onChange={v => set('configurations', v)} type="textarea" />
                <ScoreInput label="Bank Approvals" value={form.bankApprovals} onChange={v => set('bankApprovals', v)} type="textarea" />
                <div className="text-[12px] text-white font-medium pt-1">Decision Tag (auto): {form.decisionTag || '—'}</div>
              </div>
              {/* Decision Engine scores */}
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <p className="text-[11px] font-medium text-[#9CA3AF] mb-3">Decision Engine scores (0–100)</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Location score', field: 'locationScore' as keyof ProjectForm },
                    { label: 'Amenities score', field: 'amenitiesScore' as keyof ProjectForm },
                    { label: 'Infrastructure score', field: 'infrastructureScore' as keyof ProjectForm },
                    { label: 'Demand score', field: 'demandScore' as keyof ProjectForm },
                  ].map(({ label, field }) => (
                    <div key={field}>
                      <label className="block text-[11px] text-[#9CA3AF] mb-1">{label} /100</label>
                      <input type="number" min={0} max={100} value={form[field] as number}
                        onChange={e => set(field, Number(e.target.value))}
                        className="w-full rounded-lg px-3 py-2 text-[12px] font-mono text-white outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Review */}
          {step === 6 && (
            <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[12px] font-medium text-white mb-4">Step 6 — Review & Save</p>
              <div className="space-y-3">
                {[
                  ['Project name', form.projectName || '—'],
                  ['Builder', form.builderName || '—'],
                  ['Area', form.microMarket],
                  ['RERA number', form.reraNumber || '—'],
                  ['Price/sqft', form.pricePerSqft ? `₹${Number(form.pricePerSqft).toLocaleString('en-IN')}` : '—'],
                  ['Price range', form.minPrice ? `₹${Math.round(form.minPrice/100000)}L – ₹${Math.round(form.maxPrice/100000)}L` : '—'],
                  ['Possession', form.possessionDate || '—'],
                  ['Trust total', `${total}/100 — Grade ${grade} — ${flag.label}`],
                  ['Best for', form.bestFor || '—'],
                  ['Main concern', form.mainConcern || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between py-1.5 border-b border-white/[0.06] last:border-0">
                    <span className="text-[11px] text-[#9CA3AF] w-32 shrink-0">{label}</span>
                    <span className="text-[12px] text-white text-right">{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input type="checkbox" id="isActive" checked={form.isActive}
                  onChange={e => set('isActive', e.target.checked)} className="w-4 h-4" />
                <label htmlFor="isActive" className="text-[12px] text-white">
                  Active — visible to buyers on frontend
                </label>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <button type="button" onClick={handleSave} disabled={saving}
                  className="flex-1 bg-[#185FA5] text-white text-[12px] font-semibold py-2.5 rounded-lg hover:bg-[#0C447C] disabled:opacity-50 transition-colors">
                  {saving ? 'Saving…' : isNew ? '✓ Save to Project Master' : '✓ Save changes'}
                </button>
                {!isNew && (
                  <button type="button" onClick={handleDelete}
                    className="bg-[#FCEBEB] text-[#791F1F] text-[12px] px-4 py-2.5 rounded-lg hover:bg-[#F9D9D9] transition-colors">
                    Delete
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}
              className="text-[12px] text-[#9CA3AF] border border-black/10 px-4 py-2 rounded-lg disabled:opacity-30 hover:bg-white/5 transition-colors">
              ← Back
            </button>
            {step < 6 && (
              <button type="button" onClick={() => setStep(s => Math.min(6, s + 1))}
                className="text-[12px] bg-[#185FA5] text-white px-4 py-2 rounded-lg hover:bg-[#0C447C] transition-colors">
                Next →
              </button>
            )}
          </div>
        </div>

        {/* Live preview sidebar */}
        <div className="space-y-3">
          <div className="rounded-xl p-4 sticky top-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider mb-3">Live preview</p>
            <div className="space-y-2">
              {[
                { label: 'Project', value: form.projectName || '—' },
                { label: 'Builder', value: form.builderName || '—' },
                { label: 'Area', value: form.microMarket },
                { label: 'Price/sqft', value: form.pricePerSqft ? `₹${Number(form.pricePerSqft).toLocaleString('en-IN')}` : '—' },
                { label: 'Possession', value: form.possessionDate ? new Date(form.possessionDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—' },
              ].map(item => (
                <div key={item.label} className="flex justify-between">
                  <span className="text-[10px] text-[#9CA3AF]">{item.label}</span>
                  <span className="text-[11px] font-medium text-white">{item.value}</span>
                </div>
              ))}
            </div>

            {total > 0 && (
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-[#9CA3AF]">Trust score</span>
                  <span className="font-mono text-[14px] font-bold" style={{ color: flag.color }}>{total}/100</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#9CA3AF]">Grade</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full`}
                    style={{ backgroundColor: flag.color + '18', color: flag.color }}>
                    Grade {grade}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-[#9CA3AF]">Risk flag</span>
                  <span className="text-[11px] font-semibold" style={{ color: flag.color }}>{flag.label}</span>
                </div>
              </div>
            )}

            {allIn > 0 && (
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#9CA3AF]">All-in ₹</span>
                  <span className="font-mono text-[12px] font-semibold text-[#185FA5]">
                    ~₹{Math.round(allIn / 100000)}L
                  </span>
                </div>
              </div>
            )}

            {form.bestFor && (
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <p className="text-[10px] text-[#9CA3AF] mb-1">Best for</p>
                <p className="text-[11px] text-white leading-relaxed">{form.bestFor}</p>
              </div>
            )}
            {form.mainConcern && (
              <div className="mt-2">
                <p className="text-[10px] text-[#A32D2D] mb-1">Main concern</p>
                <p className="text-[11px] text-[#791F1F] leading-relaxed">{form.mainConcern}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
