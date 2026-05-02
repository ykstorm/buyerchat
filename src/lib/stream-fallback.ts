// Sprint 11 (2026-05-02) — stream-abort fallback selection.
//
// /api/chat wraps streamText so leak/markdown/timeout/etc errors can be
// converted into Hinglish guidance instead of surfacing a truncated body
// or a raw upstream error string. Sprint 8 sharpened the abort copy and
// added a timeout-specific variant. Sprint 11 splits the long tail of
// 'unknown' errors into actionable kinds:
//
//   leak/markdown → STREAM_ABORT_FALLBACK (existing — safety abort)
//   timeout       → STREAM_TIMEOUT_FALLBACK (existing — slow upstream)
//   empty         → STREAM_EMPTY_FALLBACK (new — model returned 0 tokens)
//   upstream      → STREAM_UPSTREAM_FALLBACK (new — 4xx/5xx from OpenAI)
//   unknown       → STREAM_ABORT_FALLBACK (preserved as default)
//
// Kept as pure module so route.ts stays testable indirectly: the route
// wires inputs, this module owns the message map.

export type StreamErrorKind =
  | 'leak'
  | 'markdown'
  | 'timeout'
  | 'empty'
  | 'upstream'
  | 'unknown'
  | null

export const STREAM_ABORT_FALLBACK =
  'Response complete nahi hua — sawaal thoda specific batayein (e.g., project ka naam ya exact requirement). Dubara try karein.'

export const STREAM_TIMEOUT_FALLBACK =
  'Response thoda slow ho raha hai — sawaal dubara puchein ya thoda specific batayein.'

export const STREAM_EMPTY_FALLBACK =
  'Response generate nahi ho paya — sawaal ko aur specific batayein (e.g., project ka exact naam ya budget range). Dubara try karein.'

export const STREAM_UPSTREAM_FALLBACK =
  'Server pe response generate karne mein dikkat hui — sawaal thoda alag tareeke se puchein. Dubara try karein.'

export interface StreamFallbackInput {
  abortedByLeak: boolean
  abortedByMarkdown: boolean
  hadError: boolean
  errorKind: StreamErrorKind
}

// Returns the buyer-facing fallback string, or null when the stream
// completed cleanly and no fallback should be appended.
export function selectStreamFallback(input: StreamFallbackInput): string | null {
  if (input.abortedByLeak || input.abortedByMarkdown) {
    return STREAM_ABORT_FALLBACK
  }
  if (!input.hadError) return null
  switch (input.errorKind) {
    case 'timeout':
      return STREAM_TIMEOUT_FALLBACK
    case 'empty':
      return STREAM_EMPTY_FALLBACK
    case 'upstream':
      return STREAM_UPSTREAM_FALLBACK
    case 'leak':
    case 'markdown':
    case 'unknown':
    case null:
    default:
      return STREAM_ABORT_FALLBACK
  }
}

// Classifies an error caught from streamText onError or the wrapper-stage
// catch into one of our known kinds. Pure so route.ts can call it from
// either site without duplicating the heuristics.
export function classifyStreamError(error: unknown): Exclude<StreamErrorKind, null> {
  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()

  // AbortSignal.timeout fires AbortError; some runtimes emit "aborted" or
  // "timeout" inside the message. Cover all three.
  const isTimeout =
    (error instanceof Error && error.name === 'AbortError') ||
    lower.includes('aborted') ||
    lower.includes('timeout')
  if (isTimeout) return 'timeout'

  // OpenAI SDK errors typically expose .status (axios-style) or .statusCode.
  // 4xx → bad request / auth / rate / context-length; 5xx → upstream outage.
  // Both are "the model didn't get a chance to respond" from the buyer's
  // POV — same fallback copy.
  const status =
    (error as { status?: number } | null)?.status ??
    (error as { statusCode?: number } | null)?.statusCode
  if (typeof status === 'number' && status >= 400 && status < 600) {
    return 'upstream'
  }

  return 'unknown'
}
