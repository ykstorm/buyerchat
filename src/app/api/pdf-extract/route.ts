// DEPRECATED (Sprint 11.13, 2026-05-05) — superseded by /api/extract.
// This streaming SSE endpoint is still wired to the admin /[id]/page.tsx
// "Upload PDF" tab for progress-UX continuity (PdfStreamProgress consumer).
// New work should target /api/extract instead — it accepts both PDF (via
// Cloudinary URL) and pasted text, returns plain JSON, no SSE plumbing.
// Migration path: switch PdfStreamProgress to /api/extract once a non-
// streaming UX is acceptable, OR extend /api/extract to stream like this.

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
// Streaming PDF extraction. Hobby plan caps function duration at 60s
// for streaming responses; Pro plan goes to 300s. If we ever drop back
// to the sync fallback path, this needs to come down to 30 (Vercel
// Hobby sync cap). See AGENT_DISCIPLINE §6.
export const maxDuration = 60

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

const EXTRACT_PROMPT = `Extract these fields from this RERA brochure PDF. Return ONLY valid JSON, no other text:
{
  "carpet_2bhk": number or null,
  "carpet_3bhk": number or null,
  "carpet_4bhk": number or null,
  "sbu_2bhk": number or null,
  "sbu_3bhk": number or null,
  "sbu_4bhk": number or null,
  "total_floors": number or null,
  "total_units": number or null,
  "configurations": string or null,
  "amenities": string or null,
  "possession_date": string or null,
  "loading_factor": number or null
}
Areas in sqft only. If not found use null.`

type SsePayload = Record<string, unknown>

function sse(event: string, data: SsePayload): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

function tryParseJson(text: string): unknown | null {
  if (!text) return null
  const cleaned = text.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

async function loadPdfBuffer(req: NextRequest): Promise<
  { ok: true; buffer: Buffer } | { ok: false; status: number; error: string }
> {
  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => null)
    const url: unknown = body?.url
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      return { ok: false, status: 400, error: 'Missing or invalid `url`' }
    }
    const res = await fetch(url)
    if (!res.ok) {
      return { ok: false, status: 400, error: `Failed to fetch PDF (${res.status})` }
    }
    const ab = await res.arrayBuffer()
    if (ab.byteLength > MAX_SIZE) {
      return { ok: false, status: 400, error: 'File too large. Maximum 10 MB.' }
    }
    return { ok: true, buffer: Buffer.from(ab) }
  }

  const formData = await req.formData()
  const file = formData.get('pdf') as File | null
  if (!file) return { ok: false, status: 400, error: 'No PDF uploaded' }
  if (file.type !== 'application/pdf') {
    return { ok: false, status: 400, error: 'Only PDF files are accepted' }
  }
  if (file.size > MAX_SIZE) {
    return { ok: false, status: 400, error: 'File too large. Maximum 10 MB.' }
  }
  const ab = await file.arrayBuffer()
  return { ok: true, buffer: Buffer.from(ab) }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (
    session?.user?.email?.toLowerCase() !==
    process.env.ADMIN_EMAIL?.toLowerCase()
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const loaded = await loadPdfBuffer(req)
  if (!loaded.ok) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.status })
  }
  const base64 = loaded.buffer.toString('base64')

  const encoder = new TextEncoder()
  const client = new Anthropic()

  const stream = new ReadableStream({
    start(controller) {
      let closed = false
      let slowFired = false
      let lastChunkAt = Date.now()
      let acc = ''

      const push = (event: string, data: SsePayload) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(sse(event, data)))
        } catch {
          /* controller already closed */
        }
      }

      const close = () => {
        if (closed) return
        closed = true
        try {
          controller.close()
        } catch {
          /* already closed */
        }
      }

      // Server-side 8s no-chunk timeout — emit slow signal but DO NOT
      // abort. Client decides whether to switch to manual entry.
      const slowTimer = setInterval(() => {
        if (slowFired || closed) return
        if (Date.now() - lastChunkAt > 8000) {
          slowFired = true
          push('extraction_slow', {
            message: 'Taking longer than usual',
            elapsedMs: Date.now() - lastChunkAt,
          })
        }
      }, 1000)

      push('starting', { message: 'Reading brochure' })

      const messageStream = client.messages.stream({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64,
                },
              },
              { type: 'text', text: EXTRACT_PROMPT },
            ],
          },
        ],
      })

      messageStream.on('text', (delta: string, snapshot: string) => {
        lastChunkAt = Date.now()
        acc = snapshot
        const partial = tryParseJson(snapshot)
        push('progress', {
          delta,
          parsed: partial,
        })
      })

      messageStream.on('finalMessage', () => {
        const text = acc
        const parsed = tryParseJson(text)
        if (parsed) {
          push('extraction_complete', { data: parsed })
        } else {
          push('error', {
            message: 'Model returned non-JSON output',
            raw: text.slice(0, 500),
          })
        }
        clearInterval(slowTimer)
        close()
      })

      messageStream.on('error', (err) => {
        const detail = err instanceof Error ? err.message : 'Stream error'
        push('error', { message: detail })
        clearInterval(slowTimer)
        close()
        // Audit-only Sentry capture; client already received the event.
        import('@sentry/nextjs')
          .then((Sentry) => Sentry.captureException(err))
          .catch(() => {})
      })

      messageStream.on('abort', () => {
        push('error', { message: 'Stream aborted' })
        clearInterval(slowTimer)
        close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
