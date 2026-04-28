'use client'

import { useCallback, useEffect, useRef, useState, FormEvent } from 'react'
import { m, useReducedMotion } from 'framer-motion'
import { isValidIndianMobile } from '@/lib/stage-a-capture'
import type { HardCaptureIntent } from '@/lib/intent-classifier'

// Stage B hard capture (Agent G) — feature-flagged. Inline 3-step card:
// (1) name+phone → POST /api/otp/send → (2) 4-digit code → POST /api/otp/verify
// → (3) success animation → onVerified() refires the original user message.
// 3px gold left rule signals "gated moment, not optional."

type Props = {
  intent: HardCaptureIntent
  message: string
  sessionId: string
  onVerified: () => void
}

function digitsOnly(input: string, max = 10): string {
  return input.replace(/\D/g, '').slice(0, max)
}

function digitsOnly4(input: string): string {
  return input.replace(/\D/g, '').slice(0, 4)
}

export default function StageBCapture({ intent, message, sessionId, onVerified }: Props) {
  const [step, setStep] = useState<'phone' | 'otp' | 'success'>('phone')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const prefersReduced = useReducedMotion()
  const phoneValid = isValidIndianMobile(phone)
  const codeValid = code.length === 4

  useEffect(() => {
    if (step !== 'otp') return
    setResendIn(30)
    tickRef.current = setInterval(() => {
      setResendIn(prev => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [step])

  const handlePhoneSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!phoneValid || busy) return
      setBusy(true)
      setError(null)
      try {
        const res = await fetch('/api/otp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, sessionId }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          setError(data?.error ?? 'Could not send code. Try again.')
          return
        }
        setStep('otp')
      } catch {
        setError('Network error. Try again.')
      } finally {
        setBusy(false)
      }
    },
    [phone, phoneValid, busy, sessionId]
  )

  const handleResend = useCallback(async () => {
    if (resendIn > 0 || busy) return
    setBusy(true)
    setError(null)
    try {
      await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, sessionId }),
      })
      setResendIn(30)
    } catch {
      setError('Resend failed.')
    } finally {
      setBusy(false)
    }
  }, [phone, sessionId, resendIn, busy])

  const handleVerify = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!codeValid || busy) return
      setBusy(true)
      setError(null)
      try {
        const res = await fetch('/api/otp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, code, sessionId, name: name.trim() || undefined }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          setError(data?.error ?? 'Verification failed.')
          return
        }
        setStep('success')
        setTimeout(() => onVerified(), 1500)
      } catch {
        setError('Network error. Try again.')
      } finally {
        setBusy(false)
      }
    },
    [phone, code, codeValid, busy, sessionId, name, onVerified]
  )

  return (
    <div
      className="my-3 ml-8 max-w-[480px] rounded-xl p-4"
      style={{
        background: 'var(--bg-surface)',
        borderLeft: '3px solid var(--gold, #C49B50)',
        border: '1px solid var(--border)',
        borderLeftWidth: '3px',
        color: 'var(--text-primary)',
      }}
      role="region"
      aria-label="Verify phone to continue"
    >
      <p
        className="text-[12.5px] leading-relaxed"
        style={{ color: 'var(--text-secondary)' }}
      >
        {message}
      </p>

      {step === 'phone' && (
        <form onSubmit={handlePhoneSubmit} className="mt-3 space-y-2">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Naam (optional)
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 50))}
              disabled={busy}
              placeholder="Aapka naam"
              className="mt-1 w-full px-3 py-2 rounded-lg text-[16px] md:text-[13px] outline-none focus:ring-2"
              style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              autoComplete="name"
            />
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Phone
            </span>
            <div
              className="mt-1 flex items-center rounded-lg overflow-hidden"
              style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}
            >
              <span className="px-3 py-2 text-[13px] border-r" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(digitsOnly(e.target.value))}
                disabled={busy}
                placeholder="10 digit number"
                className="flex-1 px-3 py-2 text-[16px] md:text-[13px] bg-transparent outline-none"
                style={{ color: 'var(--text-primary)' }}
                autoComplete="tel-national"
                aria-invalid={phone.length > 0 && !phoneValid}
              />
            </div>
          </label>

          {error && (
            <p className="text-[12px]" style={{ color: '#B45309' }} role="alert">
              {error}
            </p>
          )}

          <m.button
            type="submit"
            disabled={!phoneValid || busy}
            whileTap={prefersReduced || !phoneValid || busy ? undefined : { scale: 0.97 }}
            transition={{ type: 'spring', damping: 30, stiffness: 500 }}
            className="px-3 py-2 rounded-lg text-[12.5px] font-medium transition-opacity disabled:opacity-50"
            style={{ background: 'var(--text-primary)', color: 'var(--bg-surface)' }}
          >
            {busy ? 'Sending…' : 'Send code →'}
          </m.button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleVerify} className="mt-3 space-y-2">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Code (4 digits)
            </span>
            <input
              type="tel"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(digitsOnly4(e.target.value))}
              disabled={busy}
              placeholder="0000"
              className="mt-1 w-full px-3 py-2 rounded-lg text-[16px] md:text-[14px] tracking-[0.4em] text-center outline-none focus:ring-2"
              style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              autoComplete="one-time-code"
              autoFocus
            />
          </label>

          {error && (
            <p className="text-[12px]" style={{ color: '#B45309' }} role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2 items-center">
            <m.button
              type="submit"
              disabled={!codeValid || busy}
              whileTap={prefersReduced || !codeValid || busy ? undefined : { scale: 0.97 }}
              transition={{ type: 'spring', damping: 30, stiffness: 500 }}
              className="px-3 py-2 rounded-lg text-[12.5px] font-medium transition-opacity disabled:opacity-50"
              style={{ background: 'var(--text-primary)', color: 'var(--bg-surface)' }}
            >
              {busy ? 'Verifying…' : 'Verify →'}
            </m.button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendIn > 0 || busy}
              className="text-[12px] underline-offset-2 hover:underline disabled:opacity-40"
              style={{ color: 'var(--text-muted)' }}
            >
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}

      {step === 'success' && (
        <div className="mt-3 flex items-center gap-2">
          <m.svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200 }}
          >
            <circle cx="12" cy="12" r="11" fill="none" stroke="var(--gold, #C49B50)" strokeWidth="1.5" />
            <m.path
              d="M7 12l3.5 3.5L17 9"
              fill="none"
              stroke="var(--gold, #C49B50)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            />
          </m.svg>
          <p className="text-[12.5px] font-medium">Verified — continuing…</p>
        </div>
      )}

      {/* Surface intent in DOM for analytics / a11y debug. */}
      <span className="sr-only" data-stage-b-intent={intent} />
    </div>
  )
}
