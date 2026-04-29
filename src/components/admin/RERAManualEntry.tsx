'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface RERAManualPayload {
  reraNumber: string
  status: string
  approvalDate: string
  expiryDate: string
  totalUnits: number
  unitAllocation: string
}

interface Props {
  onApply: (data: RERAManualPayload) => void
  // Optional. When set (edit page only), Apply also flips reraVerified=true
  // with source='manual' via /api/rera-fetch and refreshes the parent page
  // so the verification pill turns green. On /admin/projects/new (no id yet)
  // this is omitted and only the form-fill behavior runs.
  projectId?: string
}

const STATUSES = ['Active', 'Expired', 'Pending', 'Withdrawn']

export default function RERAManualEntry({ onApply, projectId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [persisting, setPersisting] = useState(false)
  const [persistError, setPersistError] = useState<string | null>(null)
  const [form, setForm] = useState<RERAManualPayload>({
    reraNumber: '',
    status: 'Active',
    approvalDate: '',
    expiryDate: '',
    totalUnits: 0,
    unitAllocation: '',
  })

  const set = <K extends keyof RERAManualPayload>(
    field: K,
    value: RERAManualPayload[K],
  ) => setForm((p) => ({ ...p, [field]: value }))

  const handleApply = async () => {
    if (!form.reraNumber.trim()) return
    onApply(form)
    if (!projectId) return
    setPersisting(true)
    setPersistError(null)
    try {
      const raw = JSON.stringify(form)
      const res = await fetch('/api/rera-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reraNumber: form.reraNumber,
          projectId,
          manualPayload: raw,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        setPersistError(json?.error ?? `HTTP ${res.status}`)
        return
      }
      router.refresh()
    } catch (e) {
      setPersistError((e as Error).message)
    } finally {
      setPersisting(false)
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-[11px] font-medium underline-offset-2 hover:underline"
        style={{ color: '#9CA3AF' }}
      >
        {open ? '− Hide manual RERA entry' : '+ Enter RERA details manually'}
      </button>

      {open && (
        <div
          className="mt-3 rounded-xl p-4 space-y-3"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div>
            <label
              className="block text-[11px] mb-1"
              style={{ color: '#9CA3AF' }}
            >
              RERA Number
            </label>
            <input
              value={form.reraNumber}
              onChange={(e) => set('reraNumber', e.target.value)}
              placeholder="PR/GJ/AHMEDABAD/AUDA/RAA12345/…"
              className="w-full rounded-lg px-3 py-2 text-[12px] font-mono text-white outline-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            />
            <p className="text-[10px] mt-1" style={{ color: '#6B7280' }}>
              Hint: PR/GJ/AHMEDABAD/AUDA/RAA12345/…
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="block text-[11px] mb-1"
                style={{ color: '#9CA3AF' }}
              >
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-[12px] text-white outline-none"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="block text-[11px] mb-1"
                style={{ color: '#9CA3AF' }}
              >
                Total Units
              </label>
              <input
                type="number"
                min={0}
                value={form.totalUnits}
                onChange={(e) => set('totalUnits', Number(e.target.value))}
                className="w-full rounded-lg px-3 py-2 text-[12px] font-mono text-white outline-none"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="block text-[11px] mb-1"
                style={{ color: '#9CA3AF' }}
              >
                Approval Date
              </label>
              <input
                type="date"
                value={form.approvalDate}
                onChange={(e) => set('approvalDate', e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-[12px] text-white outline-none"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              />
            </div>
            <div>
              <label
                className="block text-[11px] mb-1"
                style={{ color: '#9CA3AF' }}
              >
                Expiry Date
              </label>
              <input
                type="date"
                value={form.expiryDate}
                onChange={(e) => set('expiryDate', e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-[12px] text-white outline-none"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              />
            </div>
          </div>

          <div>
            <label
              className="block text-[11px] mb-1"
              style={{ color: '#9CA3AF' }}
            >
              Unit Allocation
            </label>
            <input
              value={form.unitAllocation}
              onChange={(e) => set('unitAllocation', e.target.value)}
              placeholder="1BHK: 12, 2BHK: 80, 3BHK: 60"
              className="w-full rounded-lg px-3 py-2 text-[12px] text-white outline-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            />
          </div>

          {persistError && (
            <p className="text-[11px]" style={{ color: '#F5C76E' }}>
              {persistError}
            </p>
          )}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleApply}
              disabled={!form.reraNumber.trim() || persisting}
              className="text-[11px] font-medium px-4 py-1.5 rounded-lg transition-colors disabled:opacity-40"
              style={{ background: '#185FA5', color: 'white' }}
            >
              {persisting
                ? 'Verifying…'
                : projectId
                  ? 'Apply & mark verified'
                  : 'Apply to form'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
