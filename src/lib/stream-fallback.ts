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
//   unknown       → partial-rescue if buffer has content, else fallback
//
// Sprint 11.X (2026-05-05) — BUG-1 fix. 'unknown' errorKind is the
// catch-all "we don't know what blew up" bucket. When the stream
// produced real content before hitting an unknown error, deliver the
// partial content to the buyer instead of replacing it with the
// generic STREAM_ABORT_FALLBACK blame copy. Real AI output that hit
// a hiccup mid-stream beats zero output + "be more specific" blame.
// Other error kinds (leak/markdown/timeout/upstream) keep their
// specific fallback because their failure semantics make partial
// content either unsafe (leak) or genuinely incomplete (timeout).
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

// Sprint 11.X copy — neutral, action-oriented, no buyer-blame language.
// Replaces "sawaal thoda specific batayein" framing across all 4 strings.
// Brand-bible no-broker-pressure principle: a stream hiccup is our fault,
// not the buyer's question being insufficiently specific.
export const STREAM_ABORT_FALLBACK =
  "Ek second — response thoda incomplete laga. Same sawaal dubara puchein ya 'Riviera ka cost' jaisa specific question try karein."

export const STREAM_TIMEOUT_FALLBACK =
  'Response thoda time le raha hai — please refresh karke wapas try karein.'

export const STREAM_EMPTY_FALLBACK =
  'Response generate nahi hua — dubara try karein, ya question thoda alag tarah se puchein.'

export const STREAM_UPSTREAM_FALLBACK =
  'Service mein temporary issue aaya — kuch seconds baad try karein.'

export interface StreamFallbackInput {
  abortedByLeak: boolean
  abortedByMarkdown: boolean
  hadError: boolean
  errorKind: StreamErrorKind
  // Sprint 11.X — partial-rescue input. When errorKind='unknown' AND
  // bufferHasContent=true, the selector returns null (deliver buffer
  // as-is, no fallback). All other kinds ignore this flag.
  bufferHasContent?: boolean
}

// Returns the buyer-facing fallback string, or null when the stream
// completed cleanly OR partial-rescue applies (deliver buffer as-is).
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
    case 'unknown':
    case null:
      // Sprint 11.X partial-rescue: if buffer carried content before
      // the unknown error, deliver it (return null = no fallback).
      // Truly empty unknown errors fall through to STREAM_ABORT_FALLBACK.
      if (input.bufferHasContent) return null
      return STREAM_ABORT_FALLBACK
    case 'leak':
    case 'markdown':
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
