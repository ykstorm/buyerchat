'use client'

import { useState, useCallback, FormEvent } from 'react'
import { m, useReducedMotion } from 'framer-motion'
import { isValidIndianMobile } from '@/lib/stage-a-capture'

// Stage A soft capture (Agent 4) — rendered inline in /chat after the AI's
// first PROJECT_CARD. Optional. Save → /api/chat/capture POST. Skip → PATCH.
// Once submitted (saved or skipped), the parent stops rendering it for this
// session via captureStage on ChatSession.

type Props = {
  // Required, non-null per AGENT_DISCIPLINE §5 — no useParams() in deeply
  // nested clients; sessionId is owned by chat-client.tsx and passed down.
  sessionId: string
  onComplete: () => void
}

function digitsOnly(input: string, max = 10): string {
  return input.replace(/\D/g, '').slice(0, max)
}

export default function StageACapture({ sessionId, onComplete }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const phoneValid = isValidIndianMobile(phone)
  const prefersReduced = useReducedMotion()

  const handleSave = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!phoneValid || saving || saved) return
      setSaving(true)
      setError(null)
      try {
        const res = await fetch('/api/chat/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            name: name.trim() || undefined,
            phone,
            stage: 'soft',
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          setError(data?.error ?? 'Could not save. Try again.')
          setSaving(false)
          return
        }
        setSaved(true)
        // Brief success state, then hand back to parent so it can refetch
        // session and stop rendering this card.
        setTimeout(() => onComplete(), 1100)
      } catch {
        setError('Network error. Try again.')
        setSaving(false)
      }
    },
    [name, phone, phoneValid, saving, saved, sessionId, onComplete]
  )

  const handleSkip = useCallback(async () => {
    if (saving || saved) return
    setSaving(true)
    try {
      // Fire-and-forget PATCH — even if it fails, we hide the card client-side
      // so the buyer is never re-prompted in this tab. captureStage will be
      // refilled on the next PATCH retry or when ChatSession.lastMessageAt
      // refreshes.
      await fetch('/api/chat/capture', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, stage: 'skipped' }),
      }).catch(() => null)
    } finally {
      onComplete()
    }
  }, [saving, saved, sessionId, onComplete])

  if (saved) {
    return (
      <div
        className="my-3 ml-8 max-w-[480px] rounded-xl px-4 py-3"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
        }}
        role="status"
      >
        <p className="text-[13px] font-medium">Shortlist saved ✓</p>
        <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
          Homesty AI yahin se continue karega.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSave}
      className="my-3 ml-8 max-w-[480px] rounded-xl p-4"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        color: 'var(--text-primary)',
      }}
    >
      <p className="text-[13px] font-semibold">Save with Homesty AI</p>
      <p
        className="text-[12.5px] mt-1.5 leading-relaxed"
        style={{ color: 'var(--text-secondary)' }}
      >
        Number share karein toh yeh shortlist save ho jaayegi.
      </p>
      <p
        className="text-[12px] mt-1.5 leading-relaxed"
        style={{ color: 'var(--text-muted)' }}
      >
        Future mein price update, possession change, ya better unit availability
        aaye toh Homesty AI yahin se continue karega.
      </p>

      <div className="mt-3 space-y-2">
        <label className="block">
          <span
            className="text-[11px] uppercase tracking-wide"
            style={{ color: 'var(--text-muted)' }}
          >
            Naam (optional)
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 50))}
            disabled={saving}
            placeholder="Aapka naam"
            // text-[16px] on mobile defeats iOS Safari auto-zoom on focus.
            className="mt-1 w-full px-3 py-2 rounded-lg text-[16px] md:text-[13px] outline-none focus:ring-2"
            style={{
              background: 'var(--bg-base)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
            autoComplete="name"
          />
        </label>

        <label className="block">
          <span
            className="text-[11px] uppercase tracking-wide"
            style={{ color: 'var(--text-muted)' }}
          >
            Phone
          </span>
          <div
            className="mt-1 flex items-center rounded-lg overflow-hidden"
            style={{
              background: 'var(--bg-base)',
              border: '1px solid var(--border)',
            }}
          >
            <span
              className="px-3 py-2 text-[13px] border-r"
              style={{
                color: 'var(--text-muted)',
                borderColor: 'var(--border)',
              }}
            >
              +91
            </span>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(digitsOnly(e.target.value))}
              disabled={saving}
              placeholder="10 digit number"
              className="flex-1 px-3 py-2 text-[16px] md:text-[13px] bg-transparent outline-none"
              style={{ color: 'var(--text-primary)' }}
              autoComplete="tel-national"
              aria-invalid={phone.length > 0 && !phoneValid}
            />
          </div>
        </label>
      </div>

      {error && (
        <p className="mt-2 text-[12px]" style={{ color: '#B45309' }} role="alert">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <m.button
          type="submit"
          disabled={!phoneValid || saving}
          whileTap={prefersReduced || !phoneValid || saving ? undefined : { scale: 0.97 }}
          transition={{ type: 'spring', damping: 30, stiffness: 500 }}
          className="px-3 py-2 rounded-lg text-[12.5px] font-medium transition-opacity disabled:opacity-50"
          style={{
            background: 'var(--text-primary)',
            color: 'var(--bg-surface)',
          }}
        >
          {saving ? 'Saving…' : 'Save with Homesty AI'}
        </m.button>
        <button
          type="button"
          onClick={handleSkip}
          disabled={saving}
          className="px-3 py-2 rounded-lg text-[12.5px] font-medium border transition-opacity disabled:opacity-50"
          style={{
            background: 'transparent',
            color: 'var(--text-secondary)',
            borderColor: 'var(--border)',
          }}
        >
          Continue without
        </button>
      </div>
    </form>
  )
}
