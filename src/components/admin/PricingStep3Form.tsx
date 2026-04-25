'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import LiveCostBreakup from './LiveCostBreakup'
import {
  calculateAllInForBhk,
  calculateBreakdown,
  num,
  type Breakdown,
  type PricingInput,
} from '@/lib/pricing/calculator'

// Per-BHK row carried in form state. `sbaSqft` / `carpetSqft` are kept
// as strings so partially-typed inputs ("14") don't snap to 0 on every
// keystroke — `num()` converts at the calculator boundary.
export interface BhkConfigFormRow {
  type: string
  sbaSqft: string
  carpetSqft: string
}

// Shape that matches the Prisma row + area field that lives only in the form
export interface PricingFormValues {
  propertyType: 'flat' | 'villa'
  areaSqftOrSqyd: number

  basicRatePerSqft: number | null
  plcRatePerSqft: number | null
  floorRisePerSqft: number | null
  floorRiseFrom: number | null
  unitFloorNo: number | null

  landRatePerSqyd: number | null
  consRatePerSqyd: number | null
  plcRatePerSqyd: number | null

  audaGebAecCharge: number | null
  developmentFixed: number | null
  infrastructure: number | null

  societyMaintDeposit: number | null
  advanceRunningMaint: number | null
  townshipDeposit: number | null
  townshipAdvance: number | null

  carParkingAmount: number | null
  carParkingCount: number | null
  clubMembership: number | null
  legalCharges: number | null
  otherCharges: Array<{ label: string; amount: number }>

  saleDeedAmount: number | null
  gstPercent: number
  stampDutyPercent: number
  registrationPercent: number

  bhkConfigs: BhkConfigFormRow[]

  changeReason: string
}

interface ExistingPricing {
  id: string
  propertyType: string
  basicRatePerSqft: number | null
  plcRatePerSqft: number | null
  floorRisePerSqft: number | null
  floorRiseFrom: number | null
  unitFloorNo: number | null
  landRatePerSqyd: number | null
  consRatePerSqyd: number | null
  plcRatePerSqyd: number | null
  audaGebAecCharge: number | null
  developmentFixed: number | null
  infrastructure: number | null
  societyMaintDeposit: number | null
  advanceRunningMaint: number | null
  townshipDeposit: number | null
  townshipAdvance: number | null
  carParkingAmount: number | null
  carParkingCount: number | null
  clubMembership: number | null
  legalCharges: number | null
  otherCharges: unknown
  saleDeedAmount: number | null
  gstPercent: number
  stampDutyPercent: number
  registrationPercent: number
  pricingVersion?: number
  bhkConfigs?: unknown
}

interface Props {
  projectId: string
  projectName: string
  sbaSqftMin?: number | null
  carpetSqftMin?: number | null
  pricing: ExistingPricing | null
}

const DEFAULTS: PricingFormValues = {
  propertyType: 'flat',
  areaSqftOrSqyd: 0,
  basicRatePerSqft: null,
  plcRatePerSqft: null,
  floorRisePerSqft: null,
  floorRiseFrom: 1,
  unitFloorNo: null,
  landRatePerSqyd: null,
  consRatePerSqyd: null,
  plcRatePerSqyd: null,
  audaGebAecCharge: null,
  developmentFixed: null,
  infrastructure: null,
  societyMaintDeposit: null,
  advanceRunningMaint: null,
  townshipDeposit: null,
  townshipAdvance: null,
  carParkingAmount: null,
  carParkingCount: 1,
  clubMembership: null,
  legalCharges: null,
  otherCharges: [],
  saleDeedAmount: null,
  gstPercent: 5.0,
  stampDutyPercent: 4.9,
  registrationPercent: 1.0,
  bhkConfigs: [
    { type: '2BHK', sbaSqft: '', carpetSqft: '' },
    { type: '3BHK', sbaSqft: '', carpetSqft: '' },
    { type: '4BHK', sbaSqft: '', carpetSqft: '' },
  ],
  changeReason: '',
}

function buildInitial(
  pricing: ExistingPricing | null,
  sbaSqftMin?: number | null
): PricingFormValues {
  if (!pricing) {
    return { ...DEFAULTS, areaSqftOrSqyd: sbaSqftMin ?? 0 }
  }
  const oc = Array.isArray(pricing.otherCharges)
    ? (pricing.otherCharges as Array<{ label: string; amount: number }>)
    : []
  const bhkRaw = Array.isArray(pricing.bhkConfigs)
    ? (pricing.bhkConfigs as Array<{
        type?: unknown
        sbaSqft?: unknown
        carpetSqft?: unknown
      }>)
    : []
  const bhkConfigs: BhkConfigFormRow[] =
    bhkRaw.length > 0
      ? bhkRaw.map((r) => ({
          type: String(r?.type ?? ''),
          sbaSqft: r?.sbaSqft != null && r.sbaSqft !== '' ? String(r.sbaSqft) : '',
          carpetSqft:
            r?.carpetSqft != null && r.carpetSqft !== '' ? String(r.carpetSqft) : '',
        }))
      : DEFAULTS.bhkConfigs
  return {
    ...DEFAULTS,
    bhkConfigs,
    propertyType: pricing.propertyType === 'villa' ? 'villa' : 'flat',
    areaSqftOrSqyd: sbaSqftMin ?? 0,
    basicRatePerSqft: pricing.basicRatePerSqft,
    plcRatePerSqft: pricing.plcRatePerSqft,
    floorRisePerSqft: pricing.floorRisePerSqft,
    floorRiseFrom: pricing.floorRiseFrom ?? 1,
    unitFloorNo: pricing.unitFloorNo,
    landRatePerSqyd: pricing.landRatePerSqyd,
    consRatePerSqyd: pricing.consRatePerSqyd,
    plcRatePerSqyd: pricing.plcRatePerSqyd,
    audaGebAecCharge: pricing.audaGebAecCharge,
    developmentFixed: pricing.developmentFixed,
    infrastructure: pricing.infrastructure,
    societyMaintDeposit: pricing.societyMaintDeposit,
    advanceRunningMaint: pricing.advanceRunningMaint,
    townshipDeposit: pricing.townshipDeposit,
    townshipAdvance: pricing.townshipAdvance,
    carParkingAmount: pricing.carParkingAmount,
    carParkingCount: pricing.carParkingCount ?? 1,
    clubMembership: pricing.clubMembership,
    legalCharges: pricing.legalCharges,
    otherCharges: oc,
    saleDeedAmount: pricing.saleDeedAmount,
    gstPercent: pricing.gstPercent ?? 5.0,
    stampDutyPercent: pricing.stampDutyPercent ?? 4.9,
    registrationPercent: pricing.registrationPercent ?? 1.0,
    changeReason: '',
  }
}

/**
 * Convert form values into PricingInput at the calculator boundary.
 *
 * Controlled-input form state is "should be" `number | null`, but in
 * practice strings can leak in (e.g. when state is rehydrated from a
 * server response, when a parent passes a stringified payload, or when
 * a row in `otherCharges` is freshly added with `Number('')` → 0/NaN).
 * Wrapping every numeric field with `num()` here means the calculator
 * sees real numbers, defeating the "4200" + "210" string-concat bug.
 */
function toPricingInput(v: PricingFormValues): PricingInput {
  return {
    propertyType: v.propertyType,
    basicRatePerSqft: num(v.basicRatePerSqft),
    plcRatePerSqft: num(v.plcRatePerSqft),
    floorRisePerSqft: num(v.floorRisePerSqft),
    floorRiseFrom: num(v.floorRiseFrom),
    unitFloorNo: num(v.unitFloorNo),
    landRatePerSqyd: num(v.landRatePerSqyd),
    consRatePerSqyd: num(v.consRatePerSqyd),
    plcRatePerSqyd: num(v.plcRatePerSqyd),
    audaGebAecCharge: num(v.audaGebAecCharge),
    developmentFixed: num(v.developmentFixed),
    infrastructure: num(v.infrastructure),
    societyMaintDeposit: num(v.societyMaintDeposit),
    advanceRunningMaint: num(v.advanceRunningMaint),
    townshipDeposit: num(v.townshipDeposit),
    townshipAdvance: num(v.townshipAdvance),
    carParkingAmount: num(v.carParkingAmount),
    carParkingCount: num(v.carParkingCount),
    clubMembership: num(v.clubMembership),
    legalCharges: num(v.legalCharges),
    otherCharges: (v.otherCharges ?? []).map((row) => ({
      label: String(row?.label ?? ''),
      amount: num(row?.amount),
    })),
    saleDeedAmount: num(v.saleDeedAmount),
    gstPercent: num(v.gstPercent),
    stampDutyPercent: num(v.stampDutyPercent),
    registrationPercent: num(v.registrationPercent),
  }
}

// Compact INR formatter for inline cells (per-row All-In). Matches the
// style used in `LiveCostBreakup.tsx` so the two displays stay coherent.
function formatINRShort(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '—'
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

// ---- small field primitives -------------------------------------------------

interface NumberFieldProps {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  hint?: string
  step?: number
  min?: number
  max?: number
  dataAttr?: string
}

function NumberField({ label, value, onChange, hint, step = 1, min, max, dataAttr }: NumberFieldProps) {
  const dataProps: Record<string, string> = dataAttr ? { 'data-cs': dataAttr } : {}
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1 text-[#9CA3AF]">
        {label}
      </label>
      <input
        type="number"
        inputMode="numeric"
        step={step}
        min={min}
        max={max}
        value={value ?? ''}
        onChange={(e) => {
          const raw = e.target.value
          onChange(raw === '' ? null : Number(raw))
        }}
        aria-label={label}
        {...dataProps}
        className="w-full px-3 py-2 rounded-lg text-[12px] font-mono text-white outline-none"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      />
      {hint && <p className="text-[10px] text-[#6B7280] mt-1">{hint}</p>}
    </div>
  )
}

// ---- collapsible section -----------------------------------------------------

interface SectionProps {
  title: string
  id: string
  defaultOpen?: boolean
  children: React.ReactNode
}

function Section({ title, id, defaultOpen, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen ?? true)
  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="rounded-xl"
      style={{
        background: 'var(--card-bg, #111827)',
        border: '1px solid var(--card-border, rgba(255,255,255,0.07))',
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-body`}
        aria-label={`Toggle ${title}`}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span
          id={`${id}-heading`}
          className="text-[12px] font-semibold uppercase tracking-wider text-white"
        >
          {title}
        </span>
        <span className="text-[14px] text-[#9CA3AF]">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div id={`${id}-body`} className="px-4 pb-4 pt-1">
          {children}
        </div>
      )}
    </section>
  )
}

// ---- main form --------------------------------------------------------------

export default function PricingStep3Form({
  projectId,
  projectName,
  sbaSqftMin,
  pricing,
}: Props) {
  const router = useRouter()
  const isNew = !pricing
  const initial = useMemo(() => buildInitial(pricing, sbaSqftMin), [pricing, sbaSqftMin])

  const [form, setForm] = useState<PricingFormValues>(initial)
  const [breakdown, setBreakdown] = useState<Breakdown>(() =>
    calculateBreakdown(toPricingInput(initial), num(initial.areaSqftOrSqyd))
  )
  // Per-BHK live all-in totals, keyed by row index. Recomputed on the
  // same debounce cadence as the main breakdown.
  const [bhkAllIns, setBhkAllIns] = useState<number[]>(() =>
    initial.bhkConfigs.map(
      (r) => calculateAllInForBhk(toPricingInput(initial), r.sbaSqft).allIn
    )
  )
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bhkDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced recompute (300ms) so every keystroke doesn't hammer calc.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setBreakdown(calculateBreakdown(toPricingInput(form), num(form.areaSqftOrSqyd)))
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [form])

  // Per-BHK debounce — slightly tighter (200ms) so the per-row total
  // tracks the operator's latest sqft input without feeling laggy.
  useEffect(() => {
    if (bhkDebounceRef.current) clearTimeout(bhkDebounceRef.current)
    bhkDebounceRef.current = setTimeout(() => {
      const input = toPricingInput(form)
      setBhkAllIns(form.bhkConfigs.map((r) => calculateAllInForBhk(input, r.sbaSqft).allIn))
    }, 200)
    return () => {
      if (bhkDebounceRef.current) clearTimeout(bhkDebounceRef.current)
    }
  }, [form])

  const set = <K extends keyof PricingFormValues>(key: K, value: PricingFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
    setSuccess(false)
  }

  // ---- client-side validation mirror of PricingSchema ----------------------
  const validationErrors = useMemo<string[]>(() => {
    const errs: string[] = []
    if (!form.areaSqftOrSqyd || form.areaSqftOrSqyd <= 0) {
      errs.push('Area (sqft/sqyd) is required')
    }
    if (form.propertyType === 'flat') {
      if (form.basicRatePerSqft == null || form.basicRatePerSqft < 1000) {
        errs.push('basicRatePerSqft must be 1000–100000 for flats')
      }
    } else {
      if (form.landRatePerSqyd == null) errs.push('landRatePerSqyd is required for villas')
      if (form.consRatePerSqyd == null) errs.push('consRatePerSqyd is required for villas')
    }
    if (form.otherCharges.length > 5) errs.push('Max 5 "other charges" rows')
    for (const p of ['gstPercent', 'stampDutyPercent', 'registrationPercent'] as const) {
      const v = form[p]
      if (v < 0 || v > 15) errs.push(`${p} must be 0–15`)
    }
    return errs
  }, [form])

  const isValid = validationErrors.length === 0

  const handleSave = async () => {
    if (!isValid) return
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      // Strip empty BHK rows (no type AND no sqft) and coerce sqft to numbers.
      const cleanedBhk = form.bhkConfigs
        .filter((r) => (r.type && r.type.trim()) || num(r.sbaSqft) > 0)
        .map((r) => ({
          type: r.type.trim(),
          sbaSqft: num(r.sbaSqft),
          carpetSqft: num(r.carpetSqft),
        }))

      const payload = {
        ...form,
        // Strip empty "other charges" rows the user added but never filled in.
        otherCharges: form.otherCharges.filter(
          (r) => r.label && r.label.trim() && Number(r.amount) > 0
        ),
        bhkConfigs: cleanedBhk.length ? cleanedBhk : undefined,
      }
      const url = `/api/admin/projects/${projectId}/pricing`
      const method = isNew ? 'POST' : 'PUT'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        let msg = `Save failed (${res.status})`
        try {
          const err = await res.json()
          if (typeof err?.error === 'string') msg = err.error
          else if (err?.details?.fieldErrors) {
            msg = Object.entries(err.details.fieldErrors)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
              .join(' · ')
          }
        } catch {
          /* non-JSON */
        }
        setError(msg)
        return
      }
      setDirty(false)
      setSuccess(true)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setSaving(false)
    }
  }

  const addOtherCharge = () => {
    if (form.otherCharges.length >= 5) return
    set('otherCharges', [...form.otherCharges, { label: '', amount: 0 }])
  }

  const updateOtherCharge = (i: number, key: 'label' | 'amount', value: string | number) => {
    const next = [...form.otherCharges]
    next[i] = {
      ...next[i],
      [key]: key === 'amount' ? Number(value) : String(value),
    }
    set('otherCharges', next)
  }

  const removeOtherCharge = (i: number) => {
    const next = [...form.otherCharges]
    next.splice(i, 1)
    set('otherCharges', next)
  }

  // ---- BHK config row manipulators ----------------------------------------
  const addBhkRow = () => {
    if (form.bhkConfigs.length >= 8) return
    set('bhkConfigs', [...form.bhkConfigs, { type: '', sbaSqft: '', carpetSqft: '' }])
  }

  const updateBhkRow = (i: number, key: keyof BhkConfigFormRow, value: string) => {
    const next = [...form.bhkConfigs]
    next[i] = { ...next[i], [key]: value }
    set('bhkConfigs', next)
  }

  const removeBhkRow = (i: number) => {
    const row = form.bhkConfigs[i]
    const hasData = !!(row?.type || row?.sbaSqft || row?.carpetSqft)
    if (hasData && typeof window !== 'undefined') {
      const ok = window.confirm(`Remove ${row?.type || `row ${i + 1}`}?`)
      if (!ok) return
    }
    const next = [...form.bhkConfigs]
    next.splice(i, 1)
    set('bhkConfigs', next)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Form (cols 1-2) */}
      <div className="lg:col-span-2 space-y-4">
        {/* Property type toggle + area ---------------------------------- */}
        <section
          className="rounded-xl p-4"
          style={{
            background: 'var(--card-bg, #111827)',
            border: '1px solid var(--card-border, rgba(255,255,255,0.07))',
          }}
        >
          <p className="text-[11px] text-[#9CA3AF] mb-2">
            Editing: <span className="text-white font-medium">{projectName}</span>
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label
                className="block text-[10px] font-semibold uppercase tracking-wider mb-1 text-[#9CA3AF]"
                htmlFor="cs-property-type"
              >
                Property type
              </label>
              <div className="flex gap-2">
                {(['flat', 'villa'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-label={`Select ${t}`}
                    aria-pressed={form.propertyType === t}
                    data-cs={`property-type-${t}`}
                    onClick={() => set('propertyType', t)}
                    className="flex-1 py-2 rounded-lg text-[11px] font-semibold transition-colors"
                    style={{
                      background:
                        form.propertyType === t
                          ? '#1B4F8A'
                          : 'rgba(255,255,255,0.05)',
                      color: form.propertyType === t ? 'white' : '#9CA3AF',
                      border:
                        form.propertyType === t
                          ? '1px solid #1B4F8A'
                          : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <NumberField
                label={
                  form.propertyType === 'flat'
                    ? 'Unit area (sqft SBU)'
                    : 'Plot area (sqyd)'
                }
                value={form.areaSqftOrSqyd || null}
                onChange={(v) => set('areaSqftOrSqyd', v ?? 0)}
                min={1}
                max={100000}
                dataAttr="area"
                hint={
                  form.propertyType === 'flat'
                    ? 'SBU (super built-up) used for per-sqft math'
                    : 'Plot area in square yards'
                }
              />
            </div>
          </div>
        </section>

        {/* Section 1 — Base price ----------------------------------------- */}
        <Section id="sec-base" title="1. Base Price" defaultOpen>
          {form.propertyType === 'flat' ? (
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Basic rate (₹/sqft) *"
                value={form.basicRatePerSqft}
                onChange={(v) => set('basicRatePerSqft', v)}
                min={1000}
                max={100000}
                dataAttr="basic-rate"
              />
              <NumberField
                label="PLC rate (₹/sqft)"
                value={form.plcRatePerSqft}
                onChange={(v) => set('plcRatePerSqft', v)}
                hint="Preferred location charge"
                dataAttr="plc-rate"
              />
              <NumberField
                label="Floor rise (₹/sqft/floor)"
                value={form.floorRisePerSqft}
                onChange={(v) => set('floorRisePerSqft', v)}
                dataAttr="floor-rise"
              />
              <NumberField
                label="Floor rise starts from floor"
                value={form.floorRiseFrom}
                onChange={(v) => set('floorRiseFrom', v)}
                min={0}
                max={200}
                dataAttr="floor-rise-from"
              />
              <NumberField
                label="Unit floor no."
                value={form.unitFloorNo}
                onChange={(v) => set('unitFloorNo', v)}
                min={0}
                max={200}
                dataAttr="unit-floor-no"
                hint="Used to compute floor-rise delta"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Land rate (₹/sqyd) *"
                value={form.landRatePerSqyd}
                onChange={(v) => set('landRatePerSqyd', v)}
                min={1000}
                max={500000}
                dataAttr="land-rate"
              />
              <NumberField
                label="Construction rate (₹/sqyd) *"
                value={form.consRatePerSqyd}
                onChange={(v) => set('consRatePerSqyd', v)}
                min={500}
                max={200000}
                dataAttr="cons-rate"
              />
              <NumberField
                label="PLC rate (₹/sqyd)"
                value={form.plcRatePerSqyd}
                onChange={(v) => set('plcRatePerSqyd', v)}
                dataAttr="plc-rate-sqyd"
              />
            </div>
          )}
        </Section>

        {/* Section 1b — BHK Configurations (Bug B) ------------------------ */}
        {form.propertyType === 'flat' && (
          <Section id="sec-bhk" title="1b. BHK Configurations" defaultOpen>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-[#9CA3AF]">
                Per-flat sizes drive the buyer-facing all-in totals.
              </p>
              <button
                type="button"
                aria-label="Add BHK row"
                onClick={addBhkRow}
                disabled={form.bhkConfigs.length >= 8}
                data-cs="bhk-add-row"
                className="text-[10px] px-2 py-1 rounded-lg disabled:opacity-40"
                style={{
                  background: 'rgba(96,165,250,0.12)',
                  color: '#60A5FA',
                  border: '1px solid rgba(96,165,250,0.25)',
                }}
              >
                + Add type
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]" aria-label="BHK configurations">
                <thead>
                  <tr className="text-left text-[#9CA3AF]">
                    <th className="font-medium pb-2 pr-2">BHK Type</th>
                    <th className="font-medium pb-2 pr-2">SBU sqft</th>
                    <th className="font-medium pb-2 pr-2">Carpet sqft</th>
                    <th className="font-medium pb-2 pr-2 text-right">All-in Total</th>
                    <th className="pb-2 w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.bhkConfigs.map((row, i) => {
                    const allIn = bhkAllIns[i] ?? 0
                    return (
                      <tr key={i} className="align-middle">
                        <td className="py-1 pr-2">
                          <input
                            type="text"
                            aria-label={`BHK row ${i + 1} type`}
                            placeholder="2BHK"
                            value={row.type}
                            onChange={(e) => updateBhkRow(i, 'type', e.target.value)}
                            data-cs={`bhk-type-${i}`}
                            className="w-full px-2 py-1.5 rounded-lg text-white outline-none"
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.08)',
                            }}
                          />
                        </td>
                        <td className="py-1 pr-2">
                          <input
                            type="number"
                            aria-label={`BHK row ${i + 1} SBU sqft`}
                            placeholder="1450"
                            value={row.sbaSqft}
                            onChange={(e) => updateBhkRow(i, 'sbaSqft', e.target.value)}
                            data-cs={`bhk-sba-${i}`}
                            min={0}
                            max={100000}
                            className="w-full px-2 py-1.5 rounded-lg font-mono text-white outline-none"
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.08)',
                            }}
                          />
                        </td>
                        <td className="py-1 pr-2">
                          <input
                            type="number"
                            aria-label={`BHK row ${i + 1} carpet sqft`}
                            placeholder="950"
                            value={row.carpetSqft}
                            onChange={(e) => updateBhkRow(i, 'carpetSqft', e.target.value)}
                            data-cs={`bhk-carpet-${i}`}
                            min={0}
                            max={100000}
                            className="w-full px-2 py-1.5 rounded-lg font-mono text-white outline-none"
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.08)',
                            }}
                          />
                        </td>
                        <td
                          className="py-1 pr-2 text-right font-mono"
                          data-cs={`bhk-allin-${i}`}
                          aria-label={`BHK row ${i + 1} all-in total`}
                        >
                          <span style={{ color: allIn > 0 ? '#34D399' : '#6B7280' }}>
                            {allIn > 0 ? formatINRShort(allIn) : '—'}
                          </span>
                        </td>
                        <td className="py-1 text-right">
                          <button
                            type="button"
                            aria-label={`Remove BHK row ${i + 1}`}
                            onClick={() => removeBhkRow(i)}
                            className="text-[#F87171] text-[14px]"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {form.bhkConfigs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-2 text-[#6B7280] italic">
                        No BHK rows. Add at least one to drive per-flat totals.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* Section 2 — Dev & Govt ----------------------------------------- */}
        <Section id="sec-dev" title="2. Development & Govt Charges">
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="AUDA / GEB / AEC (₹)"
              value={form.audaGebAecCharge}
              onChange={(v) => set('audaGebAecCharge', v)}
              dataAttr="auda-geb"
            />
            <NumberField
              label="Development charges (₹)"
              value={form.developmentFixed}
              onChange={(v) => set('developmentFixed', v)}
              dataAttr="development-fixed"
            />
            <NumberField
              label="Infrastructure (₹)"
              value={form.infrastructure}
              onChange={(v) => set('infrastructure', v)}
              dataAttr="infrastructure"
            />
          </div>
        </Section>

        {/* Section 3 — Maintenance & Deposits ----------------------------- */}
        <Section id="sec-maint" title="3. Maintenance & Deposits">
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Society maintenance deposit (₹)"
              value={form.societyMaintDeposit}
              onChange={(v) => set('societyMaintDeposit', v)}
              dataAttr="society-maint"
            />
            <NumberField
              label="Advance running maintenance (₹)"
              value={form.advanceRunningMaint}
              onChange={(v) => set('advanceRunningMaint', v)}
              dataAttr="advance-maint"
            />
            <NumberField
              label="Township deposit (₹)"
              value={form.townshipDeposit}
              onChange={(v) => set('townshipDeposit', v)}
              dataAttr="township-deposit"
            />
            <NumberField
              label="Township advance (₹)"
              value={form.townshipAdvance}
              onChange={(v) => set('townshipAdvance', v)}
              dataAttr="township-advance"
            />
          </div>
        </Section>

        {/* Section 4 — Fixed Charges -------------------------------------- */}
        <Section id="sec-fixed" title="4. Fixed Charges">
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Car parking amount (₹ / slot)"
              value={form.carParkingAmount}
              onChange={(v) => set('carParkingAmount', v)}
              dataAttr="car-parking-amount"
            />
            <NumberField
              label="Car parking count"
              value={form.carParkingCount}
              onChange={(v) => set('carParkingCount', v)}
              min={0}
              max={10}
              dataAttr="car-parking-count"
            />
            <NumberField
              label="Club membership (₹)"
              value={form.clubMembership}
              onChange={(v) => set('clubMembership', v)}
              dataAttr="club-membership"
            />
            <NumberField
              label="Legal charges (₹)"
              value={form.legalCharges}
              onChange={(v) => set('legalCharges', v)}
              dataAttr="legal-charges"
            />
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                Other charges (max 5)
              </p>
              <button
                type="button"
                aria-label="Add other charge row"
                onClick={addOtherCharge}
                disabled={form.otherCharges.length >= 5}
                className="text-[10px] px-2 py-1 rounded-lg disabled:opacity-40"
                style={{
                  background: 'rgba(96,165,250,0.12)',
                  color: '#60A5FA',
                  border: '1px solid rgba(96,165,250,0.25)',
                }}
              >
                + Add row
              </button>
            </div>
            <div className="space-y-2">
              {form.otherCharges.map((row, i) => (
                <div
                  key={i}
                  className="grid gap-2"
                  style={{ gridTemplateColumns: '1fr 140px 28px' }}
                >
                  <input
                    type="text"
                    aria-label={`Other charge ${i + 1} label`}
                    placeholder="Charge label"
                    value={row.label}
                    onChange={(e) => updateOtherCharge(i, 'label', e.target.value)}
                    className="px-2 py-1.5 rounded-lg text-[11px] text-white outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  />
                  <input
                    type="number"
                    aria-label={`Other charge ${i + 1} amount`}
                    placeholder="Amount ₹"
                    value={row.amount || ''}
                    onChange={(e) => updateOtherCharge(i, 'amount', e.target.value)}
                    className="px-2 py-1.5 rounded-lg text-[11px] font-mono text-white outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  />
                  <button
                    type="button"
                    aria-label={`Remove other charge ${i + 1}`}
                    onClick={() => removeOtherCharge(i)}
                    className="text-[#F87171] text-[14px] flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
              {form.otherCharges.length === 0 && (
                <p className="text-[11px] text-[#6B7280] italic">No custom charges.</p>
              )}
            </div>
          </div>
        </Section>

        {/* Section 5 — Tax & Stamp ---------------------------------------- */}
        <Section id="sec-tax" title="5. Tax, Stamp Duty & Registration">
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Sale deed amount (₹)"
              value={form.saleDeedAmount}
              onChange={(v) => set('saleDeedAmount', v)}
              dataAttr="sale-deed"
              hint="Declared value for stamp duty"
            />
            <NumberField
              label="GST %"
              value={form.gstPercent}
              onChange={(v) => set('gstPercent', v ?? 0)}
              step={0.1}
              min={0}
              max={15}
              dataAttr="gst-percent"
            />
            <NumberField
              label="Stamp duty %"
              value={form.stampDutyPercent}
              onChange={(v) => set('stampDutyPercent', v ?? 0)}
              step={0.1}
              min={0}
              max={15}
              dataAttr="stamp-duty-percent"
            />
            <NumberField
              label="Registration %"
              value={form.registrationPercent}
              onChange={(v) => set('registrationPercent', v ?? 0)}
              step={0.1}
              min={0}
              max={15}
              dataAttr="registration-percent"
            />
          </div>
        </Section>

        {/* Change reason + actions -------------------------------------- */}
        <section
          className="rounded-xl p-4"
          style={{
            background: 'var(--card-bg, #111827)',
            border: '1px solid var(--card-border, rgba(255,255,255,0.07))',
          }}
        >
          <div>
            <label
              htmlFor="cs-change-reason"
              className="block text-[10px] font-semibold uppercase tracking-wider mb-1 text-[#9CA3AF]"
            >
              Change reason (optional)
            </label>
            <input
              id="cs-change-reason"
              type="text"
              value={form.changeReason}
              onChange={(e) => set('changeReason', e.target.value)}
              aria-label="Change reason"
              placeholder="e.g. builder revised base rate after Diwali"
              className="w-full px-3 py-2 rounded-lg text-[12px] text-white outline-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            />
          </div>

          {!isValid && (
            <ul
              aria-label="Validation errors"
              className="mt-3 text-[11px] text-[#F87171] list-disc pl-4"
            >
              {validationErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {error && (
            <div
              role="alert"
              className="mt-3 text-[11px] px-3 py-2 rounded"
              style={{
                background: 'rgba(163,45,45,0.12)',
                color: '#F87171',
                border: '1px solid rgba(163,45,45,0.25)',
              }}
            >
              {error}
            </div>
          )}
          {success && (
            <div
              role="status"
              className="mt-3 text-[11px] px-3 py-2 rounded"
              style={{
                background: 'rgba(16,185,129,0.12)',
                color: '#34D399',
                border: '1px solid rgba(16,185,129,0.25)',
              }}
            >
              Pricing saved.
            </div>
          )}

          <div className="flex items-center gap-2 mt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isValid}
              aria-label={isNew ? 'Save pricing' : 'Update pricing'}
              className="bg-[#185FA5] text-white text-[12px] font-semibold px-4 py-2 rounded-lg hover:bg-[#0C447C] disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : isNew ? 'Save pricing' : 'Update pricing'}
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(initial)
                setDirty(false)
                setError(null)
                setSuccess(false)
              }}
              aria-label="Reset form"
              className="text-[12px] text-[#9CA3AF] border border-white/10 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              Reset
            </button>
          </div>
        </section>
      </div>

      {/* Sidebar (col 3) */}
      <div className="lg:col-span-1">
        <div className="lg:sticky lg:top-16">
          <LiveCostBreakup
            breakdown={breakdown}
            dirty={dirty}
            affectedBuyers={0}
            bhkRows={form.bhkConfigs.map((r, i) => ({
              type: r.type || `Row ${i + 1}`,
              sbaSqft: num(r.sbaSqft),
              allIn: bhkAllIns[i] ?? 0,
            }))}
          />
        </div>
      </div>
    </div>
  )
}
