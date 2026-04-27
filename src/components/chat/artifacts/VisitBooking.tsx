"use client"
import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"

interface VisitBookingProps {
  projectId: string
  projectName: string
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

// Draft persistence — survives OAuth full-page reload.
const DRAFT_TTL_MS = 30 * 60 * 1000 // 30 min
const draftKey = (projectId: string) => `buyerchat:visitdraft:${projectId}`

type VisitDraft = {
  name: string
  phone: string
  selectedDateIso: string | null
  pending: boolean
  ts: number
}

function getDatePills(): { label: string; date: Date }[] {
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + i)
    return { label: `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`, date: d }
  })
}

export function VisitBooking({ projectId, projectName }: VisitBookingProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'idle'|'loading'|'success'|'error'|'signin'>('idle')
  const [token, setToken] = useState('')
  const [errorMsg, setErrorMsg] = useState('Something went wrong. Try again.')
  const pills = getDatePills()
  const canSubmit = !!selectedDate && name.trim().length > 0 && phone.trim().length === 10

  // On mount: rehydrate draft from sessionStorage if the buyer was mid-OAuth.
  useEffect(() => {
    if (typeof window === 'undefined' || !projectId) return
    try {
      const raw = window.sessionStorage.getItem(draftKey(projectId))
      if (!raw) return
      const draft = JSON.parse(raw) as VisitDraft
      if (!draft || typeof draft !== 'object') return
      const fresh = typeof draft.ts === 'number' && Date.now() - draft.ts < DRAFT_TTL_MS
      if (!fresh) {
        window.sessionStorage.removeItem(draftKey(projectId))
        return
      }
      if (draft.name) setName(draft.name)
      if (draft.phone) setPhone(draft.phone)
      if (draft.selectedDateIso) {
        const d = new Date(draft.selectedDateIso)
        if (!Number.isNaN(d.getTime())) setSelectedDate(d)
      }
      if (draft.pending) {
        // Clear the pending flag but keep the draft in storage until booking completes
        // or the user navigates away. This way a second OAuth attempt re-rehydrates.
        window.sessionStorage.setItem(
          draftKey(projectId),
          JSON.stringify({ ...draft, pending: false, ts: Date.now() })
        )
      }
    } catch {
      /* storage unavailable — no-op */
    }
    // Only run on projectId change (mount-equivalent for this artifact)
  }, [projectId])

  const persistDraft = (pending: boolean) => {
    if (typeof window === 'undefined' || !projectId) return
    try {
      const draft: VisitDraft = {
        name,
        phone,
        selectedDateIso: selectedDate ? selectedDate.toISOString() : null,
        pending,
        ts: Date.now(),
      }
      window.sessionStorage.setItem(draftKey(projectId), JSON.stringify(draft))
    } catch {
      /* storage unavailable — no-op */
    }
  }

  const clearDraft = () => {
    if (typeof window === 'undefined' || !projectId) return
    try {
      window.sessionStorage.removeItem(draftKey(projectId))
    } catch {
      /* no-op */
    }
  }

  const handleConfirm = async () => {
    if (!canSubmit || status === 'loading') return
    setStatus('loading')
    try {
      const res = await fetch('/api/visit-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          visitScheduledDate: selectedDate!.toISOString(),
          buyerName: name.trim(),
          buyerPhone: phone.trim(),
        }),
      })
      if (res.status === 409) {
        const data = await res.json()
        setToken(data.visitToken ?? 'Already booked')
        setStatus('success')
        clearDraft()
        return
      }
      if (res.status === 401) {
        setStatus('signin')
        return
      }
      if (!res.ok) {
        // Surface the real error from the server so we can diagnose silent failures.
        let serverMsg = `Request failed (${res.status})`
        try {
          const errData = await res.json()
          if (typeof errData?.error === 'string') {
            serverMsg = errData.error
          } else if (errData?.error?.fieldErrors) {
            // Zod flatten() format
            const fields = Object.entries(errData.error.fieldErrors)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
              .join(' | ')
            serverMsg = fields || serverMsg
          }
        } catch { /* response not JSON */ }
        setStatus('error')
        setErrorMsg(serverMsg)
        return
      }
      const data = await res.json()
      if (!data.visitToken) {
        setStatus('error')
        setErrorMsg('Booking failed — no token received. Please try again.')
        return
      }
      setToken(data.visitToken)
      setStatus('success')
      clearDraft()
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Network error. Please try again.')
    }
  }

  return (
    <div className="rounded-2xl p-5 w-full max-w-sm" style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border)' }}>
      {projectId && (
        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('show-project-card', { detail: { projectId } }))}
          className="flex items-center gap-1 text-[11px] mb-3 transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
          ← Back to project
        </button>
      )}
      <h3 className="text-lg font-semibold mb-0.5" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--text-primary)' }}>
        Book a site visit
      </h3>
      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{projectName}</p>
      {status === 'signin' ? (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(27,79,138,0.1)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1B4F8A" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div>
            <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Sign in to book</p>
            <p className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>Your OTP token protects your commission. Sign in to claim it.</p>
          </div>
          <button
            type="button"
            aria-label="Sign in with Google to book visit"
            onClick={() => {
              // Preserve draft: persist name/phone/date to sessionStorage so that
              // after the OAuth full-page reload the buyer returns to the same
              // artifact with their entries intact. Return URL is the chat page
              // so artifact state re-renders naturally.
              persistDraft(true)
              const callbackUrl = typeof window !== 'undefined' ? window.location.href : '/chat'
              signIn('google', { callbackUrl })
            }}
            className="w-full py-2.5 rounded-full text-[13px] font-medium text-white text-center transition-opacity hover:opacity-90"
            style={{ background: '#1B4F8A' }}
          >
            Sign in with Google
          </button>
          <button type="button" onClick={() => setStatus('idle')} className="text-[11px] transition-colors" style={{ color: 'var(--text-muted)' }}>
            ← Back
          </button>
        </div>
      ) : status === 'success' ? (
        <div className="flex flex-col items-center gap-4 py-3 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-accent-green)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-accent-green)" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <div>
            <p className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Visit confirmed!</p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{projectName}</p>
          </div>
          <div className="w-full rounded-2xl p-4 overflow-hidden max-w-full" style={{ background: 'var(--bg-accent-green)', border: '1px solid var(--border-accent-green)' }}>
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--text-accent-green)' }}>Your OTP Token</p>
            <p className="text-[22px] sm:text-[26px] font-bold tracking-wider font-mono max-w-full" style={{ color: 'var(--text-accent-green)', wordBreak: 'break-all', overflowWrap: 'anywhere' }}>{token}</p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-accent-green-light)' }}>Show this at the site. Your commission is protected.</p>
          </div>
          <div className="w-full text-left space-y-2">
            {[
              '📋 Note down this token before leaving',
              '🏗 Builder will verify at the site gate',
              '📱 Balvir will coordinate your visit',
              '⏰ Arrive 5 min early',
            ].map(tip => (
              <p key={tip} className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{tip}</p>
            ))}
          </div>
          <button type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('show-project-card', { detail: { projectId } }))}
            className="w-full py-2 rounded-full text-[13px] font-medium transition-colors"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            ← Back to project details
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {pills.map(({ label, date }) => {
              const isSelected = selectedDate?.toDateString() === date.toDateString()
              return (
                <button key={label} type="button"
                  onClick={() => { setSelectedDate(date); if (status === 'error') setStatus('idle') }}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                  style={isSelected
                    ? { background: '#1B4F8A', color: 'white', borderColor: '#1B4F8A' }
                    : { background: 'var(--bg-surface)', color: 'var(--text-primary)', borderColor: 'var(--border)' }
                  }
                >{label}</button>
              )
            })}
          </div>
          <div className="flex flex-col gap-2 mb-4">
            <input type="text" placeholder="Your name" value={name}
              onChange={e => setName(e.target.value)}
              // text-[16px] on mobile defeats iOS Safari auto-zoom on focus.
              className="w-full px-3 py-2.5 rounded-xl text-[16px] md:text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/15 focus:border-[#1B4F8A]/50 transition-all"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            <div className="flex gap-2">
              <span className="flex items-center px-3 rounded-xl text-sm flex-shrink-0" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-surface)' }}>+91</span>
              <input type="tel" placeholder="10-digit number" value={phone} maxLength={10}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="flex-1 px-3 py-2.5 rounded-xl text-[16px] md:text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/15 focus:border-[#1B4F8A]/50 transition-all"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
          {status === 'error' && <p className="text-xs text-[#A32D2D] mb-3">{errorMsg}</p>}
          <button type="button" onClick={handleConfirm}
            disabled={!canSubmit || status === 'loading'}
            className="w-full py-2.5 rounded-full text-sm font-medium bg-[#1B4F8A] text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
          >
            {status === 'loading' ? 'Booking...' : 'Confirm visit'}
          </button>
          {!canSubmit && selectedDate && (
            <p className="text-[11px] text-center mt-2" style={{ color: 'var(--text-muted)' }}>Enter name and 10-digit phone to confirm</p>
          )}
        </>
      )}
    </div>
  )
}
