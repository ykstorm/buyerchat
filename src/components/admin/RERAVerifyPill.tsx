'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  projectId: string
  reraNumber: string
}

interface VerifyState {
  reraVerified: boolean
  reraVerifiedAt: string | null
}

const TTL_MS = 7 * 24 * 60 * 60 * 1000

function daysSince(iso: string | null): number | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return null
  return Math.floor(ms / (24 * 60 * 60 * 1000))
}

export default function RERAVerifyPill({ projectId, reraNumber }: Props) {
  const router = useRouter()
  const [state, setState] = useState<VerifyState | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    fetch(`/api/admin/projects/${projectId}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return
        setState({
          reraVerified: !!d.reraVerified,
          reraVerifiedAt: d.reraVerifiedAt ?? null,
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [projectId])

  const verify = async () => {
    if (!reraNumber || busy) return
    setBusy(true)
    setNotice(null)
    try {
      const res = await fetch('/api/rera-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reraNumber, projectId, force: true }),
      })
      const json = await res.json().catch(() => ({}))
      if (json?.code === 'RERA_GEO_BLOCKED') {
        setNotice('RERA portal unavailable from this region — verify manually.')
        return
      }
      if (!res.ok || !json?.success) {
        setNotice(json?.error ?? `Verification failed (HTTP ${res.status})`)
        return
      }
      setState({
        reraVerified: true,
        reraVerifiedAt:
          (json?.verifiedAt as string | undefined) ?? new Date().toISOString(),
      })
      router.refresh()
    } catch (e) {
      setNotice(String((e as Error).message))
    } finally {
      setBusy(false)
    }
  }

  const days = daysSince(state?.reraVerifiedAt ?? null)
  const fresh =
    !!state?.reraVerified &&
    !!state.reraVerifiedAt &&
    Date.now() - new Date(state.reraVerifiedAt).getTime() < TTL_MS

  return (
    <div className="flex items-center gap-2 mt-2 flex-wrap">
      {state === null ? (
        <span className="text-[11px] px-2 py-0.5 rounded-full text-white/40 border border-white/10">
          Loading…
        </span>
      ) : fresh ? (
        <span
          className="text-[11px] px-2 py-0.5 rounded-full font-medium"
          style={{
            background: 'rgba(15, 110, 86, 0.18)',
            color: '#86EFAC',
            border: '1px solid rgba(15, 110, 86, 0.45)',
          }}
        >
          ✓ RERA verified {days === 0 ? 'today' : `${days}d ago`}
        </span>
      ) : (
        <span
          className="text-[11px] px-2 py-0.5 rounded-full font-medium"
          style={{
            background: 'rgba(186, 117, 23, 0.15)',
            color: '#F5C76E',
            border: '1px solid rgba(186, 117, 23, 0.45)',
          }}
        >
          ⚠ RERA {state?.reraVerified ? 'stale' : 'unverified'}
        </span>
      )}
      <button
        type="button"
        onClick={verify}
        disabled={busy || !reraNumber}
        className="text-[11px] px-2 py-0.5 rounded-md text-white/80 hover:bg-white/5 disabled:opacity-40"
        style={{ border: '1px solid rgba(255,255,255,0.18)' }}
      >
        {busy ? 'Verifying…' : fresh ? 'Re-verify' : 'Verify now'}
      </button>
      {notice && (
        <span className="text-[11px]" style={{ color: '#F5C76E' }}>
          {notice}
        </span>
      )}
    </div>
  )
}
