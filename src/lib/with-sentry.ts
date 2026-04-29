import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

/**
 * Higher-order wrapper for Next.js route handlers. Catches any thrown
 * error, captures it to Sentry tagged with the route, and returns a
 * canonical 500 JSON response carrying the Sentry event id so support
 * can correlate user reports.
 *
 * PoC. Day 6 applies to /api/admin/projects/bulk-upload only. Full
 * rollout to all ~20 routes lives under MASTER_FIX_LIST D1 as a
 * follow-up sprint.
 */

// Permissive handler shape — any arg list, returns a Response. Next.js
// route signatures vary by HTTP method + dynamic segments; the wrapper
// passes args through unchanged.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RouteHandler = (...args: any[]) => Promise<Response>

export function withSentry<T extends RouteHandler>(
  handler: T,
  opts: { route?: string } = {},
): T {
  const route = opts.route ?? 'unknown'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapped = async (...args: any[]) => {
    try {
      return await handler(...args)
    } catch (err) {
      const eventId = Sentry.captureException(err, {
        tags: { module: 'with-sentry', route },
        extra: {
          url: (args[0] as { url?: string } | undefined)?.url ?? null,
        },
      })
      return NextResponse.json(
        { error: 'Internal Server Error', requestId: eventId },
        { status: 500 },
      )
    }
  }
  return wrapped as T
}
