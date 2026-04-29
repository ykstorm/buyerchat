import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(() => 'sentry-event-id-abc'),
}))

import { withSentry } from './with-sentry'
import * as Sentry from '@sentry/nextjs'

const mCapture = Sentry.captureException as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('withSentry — pass-through', () => {
  it('returns the handler response when no error is thrown', async () => {
    const handler = vi.fn(
      async (_req: Request) => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )
    const wrapped = withSentry(handler, { route: 'admin/projects/bulk-upload' })

    const res = await wrapped(new Request('http://localhost/api/test'))

    expect(res.status).toBe(200)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(mCapture).not.toHaveBeenCalled()
  })
})

describe('withSentry — error capture', () => {
  it('catches thrown errors, calls Sentry with route tag, returns 500 + requestId', async () => {
    const boom = new Error('kaboom')
    const handler = vi.fn(async (_req: Request): Promise<Response> => {
      throw boom
    })
    const wrapped = withSentry(handler, { route: 'admin/projects/bulk-upload' })

    const res = await wrapped(new Request('http://localhost/api/test'))

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({
      error: 'Internal Server Error',
      requestId: 'sentry-event-id-abc',
    })
    expect(mCapture).toHaveBeenCalledTimes(1)
    expect(mCapture).toHaveBeenCalledWith(
      boom,
      expect.objectContaining({
        tags: { module: 'with-sentry', route: 'admin/projects/bulk-upload' },
      }),
    )
  })
})
