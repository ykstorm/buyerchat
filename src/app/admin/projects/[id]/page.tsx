'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import PdfStreamProgress from '@/components/admin/PdfStreamProgress'
import RERAManualEntry, { type RERAManualPayload } from '@/components/admin/RERAManualEntry'
import RERAVerifyPill from '@/components/admin/RERAVerifyPill'

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
  // Provenance for the two buyer-facing free-text fields. Read-only on the
  // form — the API stamps these whenever an operator save lands. Backfilled
  // rows show 'unknown' and surface the orange badge until reviewed.
  honestConcernSource: string | null
  honestConcernAuthor: string | null
  honestConcernVerifiedAt: string | null
  analystNoteSource: string | null
  analystNoteAuthor: string | null
  analystNoteVerifiedAt: string | null
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
  honestConcernSource: null, honestConcernAuthor: null, honestConcernVerifiedAt: null,
  analystNoteSource: null, analystNoteAuthor: null, analystNoteVerifiedAt: null,
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
  const chargesTotal = (f.charges ?? []).reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0)
  const base = Number(f.minPrice) + chargesTotal
  const gst = base * 0.05
  const stamp = Number(f.minPrice) * 0.065
  const reg = Number(f.minPrice) * 0.01
  return Math.round(base + gst + stamp + reg)
}

function formatIndianCurrency(n: number): string {
  if (!n || n <= 0) return '—'
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`
  return `₹${n.toLocaleString('en-IN')}`
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
  const [reraNotice, setReraNotice] = useState<string | null>(null)
  // Sprint 11.14 (2026-05-05) — Mama Page 2 §5.1 paste-and-extract for
  // RERA. Cloudflare blocks non-Indian IPs + portal HTML drift makes
  // Puppeteer unreliable; paste-text → /api/extract source='rera' is
  // the spec'd permanent path. Puppeteer button kept as soft fallback.
  const [reraPasteText, setReraPasteText] = useState('')
  const [reraPasteExtracting, setReraPasteExtracting] = useState(false)
  const [reraPasteError, setReraPasteError] = useState<string | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  // Sprint 11.13 (2026-05-05) — Mama Page 2 §11.1 paste-text mode.
  // Default to 'text' per compact: faster + cheaper for the common case
  // (Mama Ctrl+A from PDF reader → paste). 'pdf' tab keeps existing
  // streaming flow via PdfStreamProgress + /api/pdf-extract.
  const [extractMode, setExtractMode] = useState<'text' | 'pdf'>('text')
  const [pasteText, setPasteText] = useState('')
  const [pasteExtracting, setPasteExtracting] = useState(false)
  const [pasteError, setPasteError] = useState<string | null>(null)

  useEffect(() => {
    if (!isNew && !id) {
      // Defensive: useParams() can briefly return null on first render —
      // skip the fetch instead of hitting `/api/admin/projects/undefined`.
      console.error('[ProjectEditPage] missing id, skipping fetch')
      return
    }
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
            honestConcernSource: data.honestConcernSource ?? null,
            honestConcernAuthor: data.honestConcernAuthor ?? null,
            honestConcernVerifiedAt: data.honestConcernVerifiedAt ?? null,
            analystNoteSource: data.analystNoteSource ?? null,
            analystNoteAuthor: data.analystNoteAuthor ?? null,
            analystNoteVerifiedAt: data.analystNoteVerifiedAt ?? null,
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
    if (!isNew && !id) {
      setError('Missing project id — refresh the page.')
      return
    }
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
      if (!res.ok) {
        let serverMsg = `Save failed (${res.status})`
        try {
          const errData = await res.json()
          if (typeof errData?.error === 'string') {
            serverMsg = errData.error
          } else if (errData?.error?.fieldErrors) {
            const fields = Object.entries(errData.error.fieldErrors)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
              .join(' · ')
            serverMsg = fields || serverMsg
          } else if (errData?.error) {
            serverMsg = JSON.stringify(errData.error)
          }
        } catch { /* response not JSON */ }
        setError(serverMsg)
        return
      }
      router.push('/admin/projects')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id) {
      console.error('[ProjectEditPage] missing id, cannot delete')
      return
    }
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
          {!isNew && (
            <a href={`/admin/projects/${id}/pricing`}
              aria-label="Open full pricing Step 3 editor"
              className="text-[12px] text-[#60A5FA] border border-[#60A5FA]/30 px-3 py-1.5 rounded-lg hover:bg-[#60A5FA]/10 transition-colors">
              Full pricing editor →
            </a>
          )}
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
                  onClick={async () => {
                    setReraFetching(true)
                    setReraNotice(null)
                    try {
                      const res = await fetch('/api/rera-fetch', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reraNumber: form.reraNumber })
                      })
                      const json = await res.json()
                      // Graceful soft-failure for geo-blocked RERA portal —
                      // backend returns 200 with code RERA_GEO_BLOCKED.
                      if (json?.code === 'RERA_GEO_BLOCKED') {
                        setReraNotice(
                          `${json.reason ?? 'RERA portal unavailable'}. ${json.suggestion ?? ''}`,
                        )
                        return
                      }
                      if (!res.ok) { alert(json.error || 'Fetch failed'); return }
                      const d = json.data ?? json
                      if (d.projectName) set('projectName', d.projectName)
                      if (d.builderName) set('builderName', d.builderName)
                      if (d.possessionDate) {
                        try { set('possessionDate', new Date(d.possessionDate).toISOString().split('T')[0]) } catch {}
                      }
                      if (d.reraStatus) set('constructionStatus', d.reraStatus.toLowerCase().includes('complete') ? 'Ready to Move' : 'Under Construction')
                      if (d.totalUnits) set('availableUnits', typeof d.totalUnits === 'number' ? d.totalUnits : parseInt(String(d.totalUnits).replace(/\D/g, '')) || 0)
                    } catch (e: any) { alert('RERA fetch failed: ' + e.message) }
                    finally { setReraFetching(false) }
                  }}
                  className="bg-[#185FA5] text-white text-[11px] font-medium px-4 py-2 rounded-lg hover:bg-[#0C447C] disabled:opacity-50 transition-colors">
                  {reraFetching ? 'Fetching…' : 'Fetch from portal'}
                </button>
              </div>
              <div className="bg-white/10 border border-white/10 rounded-lg p-3 text-[11px] text-[#9CA3AF]">
                <p className="font-medium text-white mb-1">Puppeteer RERA auto-scrape</p>
                <p>Enter RERA number above and click Fetch. System will scrape gujrera.gujarat.gov.in and auto-fill: project name, legal entity, status, possession date, complaints, escrow bank.</p>
              </div>
              {reraNotice && (
                <div role="status"
                  className="mt-3 rounded-lg p-3 text-[11px]"
                  style={{
                    background: 'rgba(186, 117, 23, 0.10)',
                    border: '1px solid rgba(186, 117, 23, 0.30)',
                    color: '#F5C76E',
                  }}>
                  <p className="font-medium mb-0.5">RERA portal unavailable</p>
                  <p>{reraNotice}</p>
                </div>
              )}

              {/* Sprint 11.14 (2026-05-05) — RERA paste-and-extract surface.
                  Mama Page 2 §5.1 spec'd this as permanent answer (not
                  fallback). Open GujRERA portal → Ctrl+A → paste here →
                  AI extracts 12 RERA-specific fields via /api/extract
                  source='rera'. */}
              <div className="mt-3 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-[12px] font-semibold text-white mb-1">📋 Paste from RERA portal</p>
                <p className="text-[11px] mb-3" style={{ color: '#6B7280' }}>
                  Open <span className="font-mono">gujrera.gujarat.gov.in</span> in a new tab, find your project, select all visible text (Ctrl+A, Ctrl+C), then paste below. AI extracts in 5–8 seconds. Bypasses Cloudflare geo-block.
                </p>
                <textarea
                  value={reraPasteText}
                  onChange={(e) => setReraPasteText(e.target.value)}
                  rows={10}
                  placeholder="Paste GujRERA portal text here…"
                  className="w-full rounded-lg px-3 py-2 text-[12px] text-white outline-none resize-y mb-3"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', minHeight: 200 }}
                />
                <div className="flex items-center gap-3">
                  <button type="button"
                    disabled={reraPasteExtracting || reraPasteText.trim().length < 50}
                    onClick={async () => {
                      setReraPasteError(null)
                      setReraPasteExtracting(true)
                      try {
                        const res = await fetch('/api/extract', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ mode: 'text', text: reraPasteText, source: 'rera' }),
                        })
                        const json = await res.json()
                        if (!res.ok || !json.ok) {
                          setReraPasteError(json.error ?? `Extract failed (${res.status})`)
                          return
                        }
                        // Map RERA-specific fields onto form. PROMPT_RERA emits 12
                        // fields; map the ones the form has slots for. Unknown
                        // fields stay in json.data for future schema migration
                        // (Admin-2.1) where project_rera_source column will
                        // persist raw paste text + full extracted payload.
                        const d = json.data as Record<string, unknown>
                        if (typeof d.reraNumber === 'string' && d.reraNumber) set('reraNumber', d.reraNumber)
                        if (typeof d.projectNameOfficial === 'string' && d.projectNameOfficial) set('projectName', d.projectNameOfficial)
                        if (typeof d.builderLegalEntity === 'string' && d.builderLegalEntity) set('builderName', d.builderLegalEntity)
                        if (typeof d.possessionDate === 'string' && d.possessionDate) {
                          try { set('possessionDate', new Date(d.possessionDate).toISOString().split('T')[0]) } catch {}
                        }
                        if (typeof d.status === 'string') {
                          set('constructionStatus', d.status.toLowerCase().includes('complete') ? 'Ready to Move' : 'Under Construction')
                        }
                        if (typeof d.totalUnitsPlanned === 'number') set('availableUnits', d.totalUnitsPlanned)
                        else if (typeof d.totalUnitsPlanned === 'string') {
                          const n = parseInt(d.totalUnitsPlanned.replace(/\D/g, '')) || 0
                          if (n > 0) set('availableUnits', n)
                        }
                      } catch (err) {
                        setReraPasteError(err instanceof Error ? err.message : 'Extract failed')
                      } finally {
                        setReraPasteExtracting(false)
                      }
                    }}
                    className="px-4 py-2 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50"
                    style={{ background: '#185FA5', color: 'white' }}>
                    {reraPasteExtracting ? 'Extracting…' : 'Extract →'}
                  </button>
                  <span className="text-[11px]" style={{ color: '#6B7280' }}>
                    {reraPasteText.trim().length < 50
                      ? `Paste at least 50 characters (currently ${reraPasteText.trim().length})`
                      : `${reraPasteText.length} characters ready`}
                  </span>
                </div>
                {reraPasteError && (
                  <p className="mt-3 text-[11px]" style={{ color: '#F87171' }}>
                    RERA text format mismatch — {reraPasteError}. Aap manually fields fill kar sakte hain (niche &quot;Manual entry&quot; expand karein).
                  </p>
                )}
              </div>

              {!isNew && id && form.reraNumber && (
                <RERAVerifyPill projectId={id} reraNumber={form.reraNumber} />
              )}
              <RERAManualEntry
                projectId={!isNew && id ? id : undefined}
                onApply={(d: RERAManualPayload) => {
                  set('reraNumber', d.reraNumber)
                  if (d.status) {
                    set('constructionStatus',
                      d.status.toLowerCase() === 'active' ? 'Under Construction' : 'Ready to Move')
                  }
                  if (d.expiryDate) set('possessionDate', d.expiryDate)
                  if (d.totalUnits > 0) set('availableUnits', d.totalUnits)
                  if (d.unitAllocation) {
                    const types = d.unitAllocation
                      .split(',')
                      .map((s) => s.split(':')[0]?.trim())
                      .filter(Boolean)
                      .join(', ')
                    if (types) set('unitTypes', types)
                  }
                }}
              />
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

          {/* Step 2: Brochure AI Extract — Sprint 11.13 (2026-05-05) tab toggle.
              Two modes: paste-text (default, faster + cheaper, no Vercel
              4.5MB body cap) and PDF upload (existing streaming flow via
              /api/pdf-extract preserved). New unified /api/extract route
              backs the text mode; PDF tab still uses streaming SSE for
              progress UX continuity. */}
          {step === 2 && (
            <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[12px] font-medium text-white mb-1">Step 2 — Brochure AI Extract</p>
              <p className="text-[11px] text-[#9CA3AF] mb-3">Paste text from any PDF reader OR upload PDF — Claude fills carpet areas, amenities, floors automatically</p>

              {/* Tab toggle */}
              <div className="flex gap-1 mb-4 p-1 rounded-lg w-fit" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <button type="button" onClick={() => setExtractMode('text')}
                  className="px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors"
                  style={{
                    background: extractMode === 'text' ? '#185FA5' : 'transparent',
                    color: extractMode === 'text' ? 'white' : '#9CA3AF',
                  }}>
                  Paste text
                </button>
                <button type="button" onClick={() => setExtractMode('pdf')}
                  className="px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors"
                  style={{
                    background: extractMode === 'pdf' ? '#185FA5' : 'transparent',
                    color: extractMode === 'pdf' ? 'white' : '#9CA3AF',
                  }}>
                  Upload PDF
                </button>
              </div>

              {extractMode === 'text' ? (
                <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-[12px] font-semibold text-white mb-1">📋 Paste brochure text</p>
                  <p className="text-[11px] mb-3" style={{ color: '#6B7280' }}>
                    Open the PDF in any reader, select all (Ctrl+A), copy, then paste here. AI extracts in 5–8 seconds. Bypasses 10 MB upload cap entirely.
                  </p>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    rows={10}
                    placeholder="Paste brochure text here…"
                    className="w-full rounded-lg px-3 py-2 text-[12px] text-white outline-none resize-y mb-3"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', minHeight: 200 }}
                  />
                  <div className="flex items-center gap-3">
                    <button type="button"
                      disabled={pasteExtracting || pasteText.trim().length < 50}
                      onClick={async () => {
                        setPasteError(null)
                        setPasteExtracting(true)
                        try {
                          const res = await fetch('/api/extract', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ mode: 'text', text: pasteText, source: 'brochure' }),
                          })
                          const json = await res.json()
                          if (!res.ok || !json.ok) {
                            setPasteError(json.error ?? `Extract failed (${res.status})`)
                            return
                          }
                          // Map common extracted fields onto form. Mirrors PDF
                          // onComplete shape but with the new schema field names
                          // (configurations[].carpetSqft etc per PROMPT_BROCHURE).
                          const d = json.data as Record<string, unknown>
                          if (typeof d.amenities === 'object' && Array.isArray(d.amenities)) {
                            set('amenities', (d.amenities as string[]).join(', '))
                          } else if (typeof d.amenities === 'string') {
                            set('amenities', d.amenities)
                          }
                          if (Array.isArray(d.configurations)) {
                            const threeBhk = (d.configurations as Array<{ bhk?: number; carpetSqft?: number; sbaSqft?: number }>)
                              .find(c => c.bhk === 3)
                            if (threeBhk?.carpetSqft) set('carpetSqftMin', threeBhk.carpetSqft)
                            if (threeBhk?.sbaSqft) set('sbaSqftMin', threeBhk.sbaSqft)
                          }
                          if (typeof d.builder === 'string' && d.builder) set('builder', d.builder)
                        } catch (err) {
                          setPasteError(err instanceof Error ? err.message : 'Extract failed')
                        } finally {
                          setPasteExtracting(false)
                        }
                      }}
                      className="px-4 py-2 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50"
                      style={{ background: '#185FA5', color: 'white' }}>
                      {pasteExtracting ? 'Extracting…' : 'Extract →'}
                    </button>
                    <span className="text-[11px]" style={{ color: '#6B7280' }}>
                      {pasteText.trim().length < 50
                        ? `Paste at least 50 characters (currently ${pasteText.trim().length})`
                        : `${pasteText.length} characters ready`}
                    </span>
                  </div>
                  {pasteError && (
                    <p className="mt-3 text-[11px]" style={{ color: '#F87171' }}>
                      {pasteError} —{' '}
                      <button type="button" onClick={() => setExtractMode('pdf')}
                        className="underline hover:text-white">
                        switch to PDF upload
                      </button>
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-[12px] font-semibold text-white mb-1">📄 Auto-fill from PDF</p>
                  <p className="text-[11px] mb-3" style={{ color: '#6B7280' }}>Upload RERA brochure — carpet areas, amenities, floors auto-filled. Max 10 MB.</p>
                  <div className="flex gap-2 items-center">
                    <input type="file" accept=".pdf" id="pdf-upload" className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setError(null)
                        setPdfFile(file)
                      }}
                    />
                    <label htmlFor="pdf-upload" className="cursor-pointer px-4 py-2 rounded-lg text-[12px] font-medium transition-colors"
                      style={{ background: 'rgba(96,165,250,0.1)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.2)' }}>
                      {pdfFile ? 'Replace PDF →' : 'Choose PDF →'}
                    </label>
                    <span className="text-[11px]" style={{ color: '#4B5563' }}>Carpet, SBU, amenities, floors auto-filled</span>
                  </div>
                  <PdfStreamProgress
                    file={pdfFile}
                    onComplete={(data) => {
                      if (data.carpet_3bhk) set('carpetSqftMin', data.carpet_3bhk)
                      if (data.sbu_3bhk) set('sbaSqftMin', data.sbu_3bhk)
                      if (data.loading_factor) set('loadingFactor', data.loading_factor)
                      if (data.total_floors) set('availableUnits', data.total_floors * 4)
                      if (data.amenities)
                        set('amenities', data.amenities.split(',').map((a: string) => a.trim()).join(', '))
                      if (data.configurations) set('configurations', data.configurations)
                      if (data.possession_date) {
                        try { set('possessionDate', new Date(data.possession_date).toISOString().split('T')[0]) } catch {}
                      }
                    }}
                    onError={(msg) => setError(msg)}
                    onSwitchToManual={() => setPdfFile(null)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Pricing — read-only + canonical link.
              P2-MOBILE-PRICING (2026-04-28): the prior inline form had
              editable inputs for pricePerSqft / minPrice / maxPrice /
              loadingFactor / charges, but the API rejects all of these
              with PRICING_LOCKED — the canonical surface is
              /admin/projects/[id]/pricing (BHK Configurations table).
              Step 3 here is now a read-only snapshot of the persisted
              values plus a prominent "Manage pricing →" link to that
              page. Location (lat/lng) stays editable since it isn't a
              pricing field. See pricing-lockdown.ts. */}
          {step === 3 && (
              <div className="space-y-4">
                {/* Lockdown notice + canonical link */}
                <div className="rounded-xl p-5" style={{ background: 'rgba(186,117,23,0.08)', border: '1px solid rgba(186,117,23,0.30)' }}>
                  <p className="text-[13px] font-semibold mb-2" style={{ color: '#F5C76E' }}>
                    Pricing managed on the dedicated pricing page
                  </p>
                  <p className="text-[12px] mb-4" style={{ color: '#E5C896', lineHeight: 1.55 }}>
                    Pricing fields here are read-only. Per-BHK all-in cost,
                    package charges, and rate updates ke liye dedicated
                    pricing editor use karein — yahan kuch likhne ka
                    matlab nahi.
                  </p>
                  <a href={`/admin/projects/${id}/pricing`}
                    className="inline-flex items-center gap-2 text-[12px] font-medium px-4 py-2 rounded-lg transition-colors"
                    style={{ background: '#185FA5', color: 'white' }}>
                    Manage pricing →
                  </a>
                </div>

                {/* Read-only snapshot of persisted pricing */}
                <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#4B5563' }}>Persisted pricing (read-only)</p>
                  <div className="grid grid-cols-2 gap-3 text-[12px]">
                    {[
                      ['Rate (₹/sqft)', form.pricePerSqft ? `₹${Number(form.pricePerSqft).toLocaleString('en-IN')}` : '—'],
                      ['Type', form.pricePerSqftType || '—'],
                      ['Min Price (₹)', form.minPrice ? `₹${Number(form.minPrice).toLocaleString('en-IN')}` : '—'],
                      ['Max Price (₹)', form.maxPrice ? `₹${Number(form.maxPrice).toLocaleString('en-IN')}` : '—'],
                      ['Loading Factor', form.loadingFactor || '—'],
                      ['Package charges', form.charges?.length ? `${form.charges.length} row${form.charges.length === 1 ? '' : 's'}` : 'None'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-3 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span className="text-[11px]" style={{ color: '#6B7280' }}>{label}</span>
                        <span className="font-mono text-right" style={{ color: '#D1D5DB' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                  {allIn > 0 && (
                    <div className="mt-3 pt-3 flex justify-between" style={{ borderTop: '1px solid rgba(52,211,153,0.2)' }}>
                      <span className="text-[11px] font-semibold" style={{ color: '#34D399' }}>All-in estimate</span>
                      <span className="font-mono font-bold text-[12px]" style={{ color: '#34D399' }}>{formatIndianCurrency(allIn)}</span>
                    </div>
                  )}
                </div>

                {/* Location — still editable, not a pricing field */}
                <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#4B5563' }}>Location (Map coordinates)</p>
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
                    {formatIndianCurrency(allIn)}
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
