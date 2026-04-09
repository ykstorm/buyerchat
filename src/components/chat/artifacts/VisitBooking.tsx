"use client"
import { useState } from "react"

interface VisitBookingProps {
  projectId: string
  projectName: string
  onBack?: () => void
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function getDatePills(): { label: string; date: Date }[] {
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + i)
    return { label: `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`, date: d }
  })
}

export function VisitBooking({ projectId, projectName, onBack }: VisitBookingProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'idle'|'loading'|'success'|'error'>('idle')
  const [token, setToken] = useState('')
  const [errorMsg, setErrorMsg] = useState('Something went wrong. Try again.')
  const pills = getDatePills()
  const canSubmit = !!selectedDate && name.trim().length > 0 && phone.trim().length === 10

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
        return
      }
      if (res.status === 401) {
        setStatus('error')
        setErrorMsg('Please sign in to book a site visit.')
        return
      }
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      if (!data.visitToken) {
        setStatus('error')
        setErrorMsg('Booking failed — no token received. Please try again.')
        return
      }
      setToken(data.visitToken)
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="bg-[#FAFAF9] border border-[#E7E5E4] rounded-2xl p-5 w-full max-w-sm">
      {onBack && (
        <button type="button" onClick={onBack}
          className="flex items-center gap-1 text-[11px] text-[#A8A29E] hover:text-[#1C1917] mb-3 transition-colors">
          ← Back to project
        </button>
      )}
      <h3 className="text-lg font-semibold text-[#1C1917] mb-0.5" style={{ fontFamily: "'Playfair Display', serif" }}>
        Book a site visit
      </h3>
      <p className="text-sm text-[#78716C] mb-4">{projectName}</p>
      {status === 'success' ? (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <p className="text-sm text-[#78716C]">Your visit is confirmed</p>
          <p className="text-2xl font-bold text-[#0F6E56]">{token}</p>
          <p className="text-xs text-[#78716C]">Bring this token to the site visit</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {pills.map(({ label, date }) => {
              const isSelected = selectedDate?.toDateString() === date.toDateString()
              return (
                <button key={label} type="button"
                  onClick={() => { setSelectedDate(date); if (status === 'error') setStatus('idle') }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    isSelected ? 'bg-[#1B4F8A] text-white border-[#1B4F8A]' : 'bg-white text-[#1C1917] border-[#E7E5E4] hover:border-[#1B4F8A]'
                  }`}
                >{label}</button>
              )
            })}
          </div>
          <div className="flex flex-col gap-2 mb-4">
            <input type="text" placeholder="Your name" value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E7E5E4] text-sm text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#1B4F8A]"
            />
            <div className="flex gap-2">
              <span className="flex items-center px-3 rounded-xl border border-[#E7E5E4] text-sm text-[#78716C] bg-white flex-shrink-0">+91</span>
              <input type="tel" placeholder="10-digit number" value={phone} maxLength={10}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="flex-1 px-3 py-2 rounded-xl border border-[#E7E5E4] text-sm text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#1B4F8A]"
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
            <p className="text-[11px] text-[#A8A29E] text-center mt-2">Enter name and 10-digit phone to confirm</p>
          )}
        </>
      )}
    </div>
  )
}
