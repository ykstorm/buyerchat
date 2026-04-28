import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => ({ user: { email: 'admin@test.local' } })),
}))

type StreamHandler = (...args: unknown[]) => void
const handlers: Record<string, StreamHandler> = {}

class FakeMessageStream {
  on(event: string, fn: StreamHandler) {
    handlers[event] = fn
    return this
  }
}

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class {
      messages = {
        stream: () => new FakeMessageStream(),
      }
    },
  }
})

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))

const ORIG_FETCH = globalThis.fetch

beforeEach(() => {
  process.env.ADMIN_EMAIL = 'admin@test.local'
  for (const k of Object.keys(handlers)) delete handlers[k]
  // Stub fetch for the Cloudinary URL fetch path inside the route.
  globalThis.fetch = vi.fn(async () => {
    const buf = new TextEncoder().encode('%PDF-1.4 fake').buffer
    return new Response(buf, { status: 200 })
  }) as unknown as typeof fetch
})

afterEach(() => {
  globalThis.fetch = ORIG_FETCH
})

async function readSse(body: ReadableStream<Uint8Array>): Promise<
  Array<{ event: string; data: unknown }>
> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  const out: Array<{ event: string; data: unknown }> = []
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let sep
    while ((sep = buf.indexOf('\n\n')) !== -1) {
      const block = buf.slice(0, sep)
      buf = buf.slice(sep + 2)
      let event = 'message'
      let dataLine = ''
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) dataLine += line.slice(5).trim()
      }
      try {
        out.push({ event, data: JSON.parse(dataLine) })
      } catch {
        out.push({ event, data: dataLine })
      }
    }
  }
  return out
}

describe('POST /api/pdf-extract (streaming)', () => {
  it('emits starting + progress + extraction_complete with parsed JSON', async () => {
    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/pdf-extract', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://res.cloudinary.com/x/y.pdf' }),
    })

    // Drive the stream: emit a partial text snapshot, then finalMessage.
    const drive = setTimeout(() => {
      handlers.text?.('{"carpet_3bhk":', '{"carpet_3bhk":')
      handlers.text?.('1200}', '{"carpet_3bhk":1200}')
      handlers.finalMessage?.()
    }, 0)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any)
    expect(res.headers.get('content-type')).toBe('text/event-stream')
    const events = await readSse(res.body!)
    clearTimeout(drive)

    const types = events.map((e) => e.event)
    expect(types[0]).toBe('starting')
    expect(types).toContain('progress')
    expect(types).toContain('extraction_complete')

    const complete = events.find((e) => e.event === 'extraction_complete')!
    expect((complete.data as { data: { carpet_3bhk: number } }).data.carpet_3bhk).toBe(1200)
  })

  it('emits error event when model returns non-JSON', async () => {
    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/pdf-extract', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://res.cloudinary.com/x/y.pdf' }),
    })

    setTimeout(() => {
      handlers.text?.('not-json', 'not-json')
      handlers.finalMessage?.()
    }, 0)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any)
    const events = await readSse(res.body!)
    expect(events.map((e) => e.event)).toContain('error')
  })

  it('rejects non-admin sessions with 403 (no stream)', async () => {
    const auth = (await import('@/lib/auth')).auth as unknown as ReturnType<
      typeof vi.fn
    >
    auth.mockResolvedValueOnce({ user: { email: 'someone-else@test.local' } })

    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/pdf-extract', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://res.cloudinary.com/x/y.pdf' }),
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any)
    expect(res.status).toBe(403)
    expect(res.headers.get('content-type')).not.toBe('text/event-stream')
  })
})
