// Sentry beforeSend hook — strips PII (Indian mobile + email) from
// breadcrumbs, exception messages, and request payloads before any event
// leaves the process. Sentry's sendDefaultPii: false already drops cookie/
// header PII; this hook adds defense for buyer-typed strings that can flow
// in via /api/chat user messages, capture POST bodies, or thrown error
// strings that include the offending input.
//
// Pattern: lossy redaction. We don't keep enough info to re-identify the
// user — only enough to know "a phone-shaped or email-shaped value was
// here." That is the right tradeoff for an issue tracker.

import type { ErrorEvent, EventHint } from '@sentry/core'

const PHONE = /\b[6-9]\d{9}\b/g
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

function scrub(s: string | undefined | null): string | undefined | null {
  if (!s) return s
  return s.replace(PHONE, '[PHONE]').replace(EMAIL, '[EMAIL]')
}

// Recursively scrub strings inside an arbitrary object. Walks the same way
// Sentry's own normalizer does, but with redaction. Caps depth so a
// malformed event with a circular reference can't hang the hook.
function scrubDeep(value: unknown, depth = 0): unknown {
  if (depth > 8) return value
  if (typeof value === 'string') return scrub(value)
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, depth + 1))
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = scrubDeep(v, depth + 1)
    }
    return out
  }
  return value
}

export function redactSentryEvent(
  event: ErrorEvent,
  _hint?: EventHint,
): ErrorEvent | null {
  // Breadcrumbs — most common leak vector.
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((bc) => ({
      ...bc,
      message: scrub(bc.message) ?? undefined,
      data: bc.data ? (scrubDeep(bc.data) as typeof bc.data) : bc.data,
    }))
  }

  // Exception messages.
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((ex) => ({
      ...ex,
      value: scrub(ex.value) ?? undefined,
    }))
  }

  // Top-level message field (Sentry.captureMessage).
  if (event.message) event.message = scrub(event.message) ?? undefined

  // Request body / query — request.data is a string or object.
  if (event.request) {
    if (typeof event.request.data === 'string') {
      event.request.data = scrub(event.request.data) ?? undefined
    } else if (event.request.data) {
      event.request.data = scrubDeep(event.request.data) as typeof event.request.data
    }
    if (event.request.query_string && typeof event.request.query_string === 'string') {
      event.request.query_string = scrub(event.request.query_string) ?? undefined
    }
  }

  // Custom contexts (anything attached via Sentry.setContext or scope).
  if (event.contexts) {
    event.contexts = scrubDeep(event.contexts) as typeof event.contexts
  }

  return event
}
