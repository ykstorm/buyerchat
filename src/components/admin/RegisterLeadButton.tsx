'use client'

import { useState } from 'react'

export default function RegisterLeadButton({ visitId }: { visitId: string }) {
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  const register = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/register-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId }),
      })
      const data = await res.json()
      if (data.token) setToken(data.token)
    } catch (err) {
      console.error('Register lead error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (token) {
    return (
      <div className="text-right">
        <p className="font-mono text-[13px] font-bold text-[#085041]">{token}</p>
        <p className="text-[10px] text-[#0F6E56]">OTP generated</p>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={register}
      disabled={loading}
      className="text-[11px] bg-[#0F6E56] text-white px-2.5 py-1.5 rounded-lg hover:bg-[#085041] disabled:opacity-50 transition-colors whitespace-nowrap"
    >
      {loading ? 'Registering…' : 'Register now'}
    </button>
  )
}
