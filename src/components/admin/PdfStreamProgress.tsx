'use client'

import { useEffect, useRef, useState } from 'react'
import type { PdfExtractData } from '@/lib/admin/pdf-upload'

type StreamState =
  | 'idle'
  | 'uploading'
  | 'starting'
  | 'progress'
  | 'extraction_slow'
  | 'extraction_complete'
  | 'error'

interface Props {
  file: File | null
  onComplete: (data: PdfExtractData) => void
  onError: (message: string) => void
  onSwitchToManual?: () => void
}

const PHRASES = [
  'Extracting carpet…',
  'Loading factor…',
  'Reading possession…',
  'Cataloguing amenities…',
]

interface SignedUpload {
  signature: string
  timestamp: number
  apiKey: string
  cloudName: string
  folder: string
}

async function uploadToCloudinary(file: File): Promise<string> {
  const signRes = await fetch('/api/admin/cloudinary-sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder: 'pdfs' }),
  })
  if (!signRes.ok) throw new Error(`cloudinary-sign failed (${signRes.status})`)
  const signed = (await signRes.json()) as SignedUpload

  const fd = new FormData()
  fd.append('file', file)
  fd.append('api_key', signed.apiKey)
  fd.append('timestamp', String(signed.timestamp))
  fd.append('signature', signed.signature)
  fd.append('folder', signed.folder)
  const url = `https://api.cloudinary.com/v1_1/${signed.cloudName}/auto/upload`
  const res = await fetch(url, { method: 'POST', body: fd })
  if (!res.ok) {
    throw new Error(`Cloudinary upload failed (${res.status})`)
  }
  const json = await res.json()
  if (typeof json?.secure_url !== 'string') {
    throw new Error('Cloudinary upload: missing secure_url')
  }
  return json.secure_url
}

async function* iterSse(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<{ event: string; data: unknown }> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let sepIdx
    while ((sepIdx = buf.indexOf('\n\n')) !== -1) {
      const block = buf.slice(0, sepIdx)
      buf = buf.slice(sepIdx + 2)
      let event = 'message'
      let dataLine = ''
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) dataLine += line.slice(5).trim()
      }
      let data: unknown = dataLine
      try {
        data = JSON.parse(dataLine)
      } catch {
        /* leave as string */
      }
      yield { event, data }
    }
  }
}

export default function PdfStreamProgress({
  file,
  onComplete,
  onError,
  onSwitchToManual,
}: Props) {
  const [state, setState] = useState<StreamState>('idle')
  const [phraseIdx, setPhraseIdx] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  // Cosmetic phrase rotation while streaming.
  useEffect(() => {
    if (state !== 'progress' && state !== 'starting') return
    const t = setInterval(
      () => setPhraseIdx((i) => (i + 1) % PHRASES.length),
      1500,
    )
    return () => clearInterval(t)
  }, [state])

  useEffect(() => {
    if (!file) return
    let cancelled = false
    const ctl = new AbortController()
    abortRef.current = ctl

    async function run() {
      try {
        setState('uploading')
        const secureUrl = await uploadToCloudinary(file!)
        if (cancelled) return
        setState('starting')

        const res = await fetch('/api/pdf-extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: secureUrl }),
          signal: ctl.signal,
        })
        if (!res.ok || !res.body) {
          throw new Error(`pdf-extract failed (${res.status})`)
        }

        for await (const { event, data } of iterSse(res.body)) {
          if (cancelled) return
          if (event === 'starting') {
            setState('starting')
          } else if (event === 'progress') {
            setState('progress')
          } else if (event === 'extraction_slow') {
            setState('extraction_slow')
          } else if (event === 'extraction_complete') {
            setState('extraction_complete')
            const payload = (data as { data?: PdfExtractData })?.data
            if (payload) onComplete(payload)
            return
          } else if (event === 'error') {
            const msg =
              (data as { message?: string })?.message ?? 'Extract failed'
            setState('error')
            onError(msg)
            return
          }
        }
      } catch (err) {
        if (cancelled) return
        setState('error')
        onError(err instanceof Error ? err.message : 'PDF extract failed')
      }
    }

    void run()

    return () => {
      cancelled = true
      ctl.abort()
    }
  }, [file, onComplete, onError])

  if (!file || state === 'idle') return null

  const phrase =
    state === 'uploading'
      ? 'Uploading PDF…'
      : state === 'starting'
        ? 'Reading brochure…'
        : state === 'progress' || state === 'extraction_slow'
          ? PHRASES[phraseIdx]
          : state === 'extraction_complete'
            ? 'Done — fields populated'
            : 'Extract failed'

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-3 rounded-lg p-3"
      style={{
        background: 'rgba(96,165,250,0.08)',
        border: '1px solid rgba(96,165,250,0.20)',
      }}
    >
      <div className="flex items-center gap-2">
        {(state === 'uploading' ||
          state === 'starting' ||
          state === 'progress' ||
          state === 'extraction_slow') && (
          <span
            className="inline-block w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#60A5FA', borderTopColor: 'transparent' }}
          />
        )}
        <p className="text-[12px]" style={{ color: '#BFDBFE' }}>
          {phrase}
        </p>
      </div>

      {state === 'extraction_slow' && (
        <div className="mt-2 flex items-center gap-2">
          <p className="text-[11px] flex-1" style={{ color: '#FBBF24' }}>
            Taking longer than usual. Use manual entry instead?
          </p>
          {onSwitchToManual && (
            <button
              type="button"
              onClick={() => {
                abortRef.current?.abort()
                onSwitchToManual()
              }}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors"
              style={{
                background: 'rgba(251,191,36,0.15)',
                color: '#FBBF24',
                border: '1px solid rgba(251,191,36,0.30)',
              }}
            >
              Switch to manual
            </button>
          )}
        </div>
      )}

      {state === 'error' && onSwitchToManual && (
        <button
          type="button"
          onClick={onSwitchToManual}
          className="mt-2 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors"
          style={{
            background: 'rgba(248,113,113,0.10)',
            color: '#F87171',
            border: '1px solid rgba(248,113,113,0.30)',
          }}
        >
          Manual entry only
        </button>
      )}
    </div>
  )
}
