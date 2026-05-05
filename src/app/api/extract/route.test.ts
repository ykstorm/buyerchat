import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Auth mock — toggled per test via authResult.
let authResult: { user?: { email?: string } } | null = {
  user: { email: 'admin@test.local' },
}
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => authResult),
}))

// Anthropic mock — controllable via anthropicResponse + anthropicShouldThrow.
let anthropicResponse: unknown = null
let anthropicShouldThrow: Error | null = null
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class {
      messages = {
        create: vi.fn(async () => {
          if (anthropicShouldThrow) throw anthropicShouldThrow
          return anthropicResponse
        }),
      }
    },
  }
})

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

const ORIG_FETCH = globalThis.fetch

beforeEach(() => {
  process.env.ADMIN_EMAIL = 'admin@test.local'
  authResult = { user: { email: 'admin@test.local' } }
  anthropicShouldThrow = null
  // Default Anthropic response — valid JSON brochure shape.
  anthropicResponse = {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ projectName: 'Test Project', builder: 'Test Builder' }),
      },
    ],
    usage: { input_tokens: 100, output_tokens: 50 },
  }
  // Default fetch — returns a small fake PDF for the pdf-mode path.
  globalThis.fetch = vi.fn(async () => {
    const buf = new TextEncoder().encode('%PDF-1.4 fake brochure content').buffer
    return new Response(buf, { status: 200 })
  }) as unknown as typeof fetch
})

afterEach(() => {
  globalThis.fetch = ORIG_FETCH
})

function makeReq(body: unknown): Request {
  return new Request('http://localhost/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/extract', () => {
  it('PDF mode happy path → returns parsed JSON + meta', async () => {
    const { POST } = await import('./route')
    const res = await POST(
      makeReq({ mode: 'pdf', pdfUrl: 'https://example.com/x.pdf' }),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.data).toEqual({ projectName: 'Test Project', builder: 'Test Builder' })
    expect(json.meta.mode).toBe('pdf')
    expect(json.meta.input_tokens).toBe(100)
  })

  it('text mode happy path → returns parsed JSON with source meta', async () => {
    const { POST } = await import('./route')
    const longText = 'a'.repeat(60)
    const res = await POST(
      makeReq({ mode: 'text', text: longText, source: 'rera' }),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.meta.mode).toBe('text')
    expect(json.meta.source).toBe('rera')
  })

  it('strips ```json code fences before parsing', async () => {
    anthropicResponse = {
      content: [
        { type: 'text', text: '```json\n{"projectName":"Fenced"}\n```' },
      ],
      usage: { input_tokens: 10, output_tokens: 5 },
    }
    const { POST } = await import('./route')
    const res = await POST(
      makeReq({ mode: 'text', text: 'a'.repeat(60) }),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toEqual({ projectName: 'Fenced' })
  })

  it('403 when caller is not admin', async () => {
    authResult = { user: { email: 'someone-else@example.com' } }
    const { POST } = await import('./route')
    const res = await POST(makeReq({ mode: 'text', text: 'a'.repeat(60) }))
    expect(res.status).toBe(403)
  })

  it('403 when no session at all', async () => {
    authResult = null
    const { POST } = await import('./route')
    const res = await POST(makeReq({ mode: 'text', text: 'a'.repeat(60) }))
    expect(res.status).toBe(403)
  })

  it('400 on missing mode discriminator', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeReq({ text: 'a'.repeat(60) }))
    expect(res.status).toBe(400)
  })

  it('400 on text shorter than 50 chars', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeReq({ mode: 'text', text: 'too short' }))
    expect(res.status).toBe(400)
  })

  it('400 on PDF mode missing pdfUrl', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeReq({ mode: 'pdf' }))
    expect(res.status).toBe(400)
  })

  it('400 when pdfUrl fetch returns non-OK', async () => {
    globalThis.fetch = vi.fn(async () => new Response('not found', { status: 404 })) as unknown as typeof fetch
    const { POST } = await import('./route')
    const res = await POST(makeReq({ mode: 'pdf', pdfUrl: 'https://example.com/missing.pdf' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/Failed to fetch PDF/)
  })

  it('502 when Anthropic returns non-JSON text', async () => {
    anthropicResponse = {
      content: [{ type: 'text', text: 'I cannot extract this brochure, sorry.' }],
      usage: { input_tokens: 10, output_tokens: 5 },
    }
    const { POST } = await import('./route')
    const res = await POST(makeReq({ mode: 'text', text: 'a'.repeat(60) }))
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.error).toMatch(/not valid JSON/)
    expect(json.preview).toBeTruthy()
  })

  it('500 when Anthropic API throws', async () => {
    anthropicShouldThrow = new Error('Anthropic API down')
    const { POST } = await import('./route')
    const res = await POST(makeReq({ mode: 'text', text: 'a'.repeat(60) }))
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.message).toMatch(/Anthropic API down/)
  })

  it('400 on malformed JSON body', async () => {
    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json {',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
