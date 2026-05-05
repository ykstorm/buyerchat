import { describe, it, expect } from 'vitest'
import {
  selectStreamFallback,
  classifyStreamError,
  STREAM_ABORT_FALLBACK,
  STREAM_TIMEOUT_FALLBACK,
  STREAM_EMPTY_FALLBACK,
  STREAM_UPSTREAM_FALLBACK,
} from './stream-fallback'

describe('selectStreamFallback (Sprint 11 — fallback message map)', () => {
  it('returns null when stream completed cleanly', () => {
    expect(
      selectStreamFallback({
        abortedByLeak: false,
        abortedByMarkdown: false,
        hadError: false,
        errorKind: null,
      })
    ).toBeNull()
  })

  it('returns abort copy when leak abort fired', () => {
    expect(
      selectStreamFallback({
        abortedByLeak: true,
        abortedByMarkdown: false,
        hadError: false,
        errorKind: null,
      })
    ).toBe(STREAM_ABORT_FALLBACK)
  })

  it('returns abort copy when markdown abort fired', () => {
    expect(
      selectStreamFallback({
        abortedByLeak: false,
        abortedByMarkdown: true,
        hadError: false,
        errorKind: null,
      })
    ).toBe(STREAM_ABORT_FALLBACK)
  })

  it('returns timeout copy on timeout error kind', () => {
    expect(
      selectStreamFallback({
        abortedByLeak: false,
        abortedByMarkdown: false,
        hadError: true,
        errorKind: 'timeout',
      })
    ).toBe(STREAM_TIMEOUT_FALLBACK)
  })

  it('returns empty-stream copy on empty error kind', () => {
    expect(
      selectStreamFallback({
        abortedByLeak: false,
        abortedByMarkdown: false,
        hadError: true,
        errorKind: 'empty',
      })
    ).toBe(STREAM_EMPTY_FALLBACK)
  })

  it('returns upstream copy on upstream error kind', () => {
    expect(
      selectStreamFallback({
        abortedByLeak: false,
        abortedByMarkdown: false,
        hadError: true,
        errorKind: 'upstream',
      })
    ).toBe(STREAM_UPSTREAM_FALLBACK)
  })

  it('falls back to abort copy on unknown / null kind', () => {
    expect(
      selectStreamFallback({
        abortedByLeak: false,
        abortedByMarkdown: false,
        hadError: true,
        errorKind: 'unknown',
      })
    ).toBe(STREAM_ABORT_FALLBACK)
    expect(
      selectStreamFallback({
        abortedByLeak: false,
        abortedByMarkdown: false,
        hadError: true,
        errorKind: null,
      })
    ).toBe(STREAM_ABORT_FALLBACK)
  })

  it('prioritizes abort flags over error kind', () => {
    // If both a leak abort AND a downstream error fire, the leak copy wins —
    // safety-grade aborts are the user's signal, not the upstream incident.
    expect(
      selectStreamFallback({
        abortedByLeak: true,
        abortedByMarkdown: false,
        hadError: true,
        errorKind: 'upstream',
      })
    ).toBe(STREAM_ABORT_FALLBACK)
  })
})

describe('classifyStreamError (Sprint 11 — error kind heuristics)', () => {
  it('classifies AbortError instance as timeout', () => {
    const err = new Error('The operation was aborted due to timeout')
    err.name = 'AbortError'
    expect(classifyStreamError(err)).toBe('timeout')
  })

  it('classifies "aborted" message as timeout', () => {
    expect(classifyStreamError(new Error('Request aborted'))).toBe('timeout')
  })

  it('classifies "timeout" message as timeout', () => {
    expect(classifyStreamError(new Error('Connection timeout'))).toBe('timeout')
  })

  it('classifies SDK error with status 400 as upstream', () => {
    const err = Object.assign(new Error('Bad request'), { status: 400 })
    expect(classifyStreamError(err)).toBe('upstream')
  })

  it('classifies SDK error with status 429 as upstream', () => {
    const err = Object.assign(new Error('Rate limited'), { status: 429 })
    expect(classifyStreamError(err)).toBe('upstream')
  })

  it('classifies SDK error with status 500 as upstream', () => {
    const err = Object.assign(new Error('Server error'), { status: 500 })
    expect(classifyStreamError(err)).toBe('upstream')
  })

  it('classifies SDK error with statusCode field as upstream', () => {
    // Some SDK shapes expose the code as `statusCode` rather than `status`.
    const err = Object.assign(new Error('Not found'), { statusCode: 404 })
    expect(classifyStreamError(err)).toBe('upstream')
  })

  it('falls back to unknown for un-tagged errors', () => {
    expect(classifyStreamError(new Error('Some random failure'))).toBe('unknown')
    expect(classifyStreamError('plain string')).toBe('unknown')
    expect(classifyStreamError(null)).toBe('unknown')
  })
})

// Sprint 11.X (2026-05-05) — BUG-1 partial-rescue.
// When errorKind='unknown' AND the stream produced real content
// before blowing up, deliver the partial buffer instead of the
// generic STREAM_ABORT_FALLBACK blame copy. Other error kinds
// (leak/markdown/timeout/upstream) still fallback unconditionally
// because their failure semantics make partial content unsafe
// (leak) or genuinely incomplete/wrong (timeout/upstream).
describe('Sprint 11.X — partial-rescue on unknown errorKind', () => {
  it('unknown errorKind + bufferHasContent=true → null (deliver buffer)', () => {
    expect(
      selectStreamFallback({
        abortedByLeak: false,
        abortedByMarkdown: false,
        hadError: true,
        errorKind: 'unknown',
        bufferHasContent: true,
      })
    ).toBeNull()
  })

  it('unknown errorKind + bufferHasContent=false → STREAM_ABORT_FALLBACK (truly empty)', () => {
    expect(
      selectStreamFallback({
        abortedByLeak: false,
        abortedByMarkdown: false,
        hadError: true,
        errorKind: 'unknown',
        bufferHasContent: false,
      })
    ).toBe(STREAM_ABORT_FALLBACK)
  })

  it('null errorKind + bufferHasContent=true → null (deliver buffer)', () => {
    // null is the "classifier never ran" case; treat same as unknown.
    expect(
      selectStreamFallback({
        abortedByLeak: false,
        abortedByMarkdown: false,
        hadError: true,
        errorKind: null,
        bufferHasContent: true,
      })
    ).toBeNull()
  })

  it('leak errorKind + bufferHasContent=true → STILL STREAM_ABORT_FALLBACK (partial content unsafe)', () => {
    // Leak abort already fired the partial-content protection; we never
    // deliver leaked content even if some chars made it through.
    expect(
      selectStreamFallback({
        abortedByLeak: true,
        abortedByMarkdown: false,
        hadError: true,
        errorKind: 'leak',
        bufferHasContent: true,
      })
    ).toBe(STREAM_ABORT_FALLBACK)
  })

  it('markdown errorKind + bufferHasContent=true → STILL STREAM_ABORT_FALLBACK', () => {
    // Markdown abort means format is broken; partial content would render
    // mangled. Don't deliver.
    expect(
      selectStreamFallback({
        abortedByLeak: false,
        abortedByMarkdown: true,
        hadError: true,
        errorKind: 'markdown',
        bufferHasContent: true,
      })
    ).toBe(STREAM_ABORT_FALLBACK)
  })

  it('timeout errorKind + bufferHasContent=true → STILL STREAM_TIMEOUT_FALLBACK (partial is genuinely incomplete)', () => {
    expect(
      selectStreamFallback({
        abortedByLeak: false,
        abortedByMarkdown: false,
        hadError: true,
        errorKind: 'timeout',
        bufferHasContent: true,
      })
    ).toBe(STREAM_TIMEOUT_FALLBACK)
  })

  it('upstream errorKind + bufferHasContent=true → STILL STREAM_UPSTREAM_FALLBACK', () => {
    // 4xx/5xx mid-stream means upstream killed the response — partial is
    // not a complete answer, fallback explains the issue.
    expect(
      selectStreamFallback({
        abortedByLeak: false,
        abortedByMarkdown: false,
        hadError: true,
        errorKind: 'upstream',
        bufferHasContent: true,
      })
    ).toBe(STREAM_UPSTREAM_FALLBACK)
  })

  it('omitted bufferHasContent (undefined) treated as false — backwards compat', () => {
    // Existing call sites that don't pass the new field must keep the old
    // STREAM_ABORT_FALLBACK behavior on unknown.
    expect(
      selectStreamFallback({
        abortedByLeak: false,
        abortedByMarkdown: false,
        hadError: true,
        errorKind: 'unknown',
      })
    ).toBe(STREAM_ABORT_FALLBACK)
  })
})

// Sprint 11.X — PART C copy tone enforcement. All 4 fallback strings
// share neutral, action-oriented tone (no buyer-blame language).
// Brand-bible no-broker-pressure principle: a stream hiccup is our
// fault, not the buyer's question being insufficiently specific.
describe('Sprint 11.X — fallback copy tone (PART C)', () => {
  it('STREAM_ABORT_FALLBACK uses neutral retry hint, not "be more specific" blame', () => {
    expect(STREAM_ABORT_FALLBACK).toContain('Ek second')
    expect(STREAM_ABORT_FALLBACK).toContain('thoda incomplete laga')
    // Old blame language must be gone.
    expect(STREAM_ABORT_FALLBACK).not.toContain('sawaal thoda specific batayein')
    expect(STREAM_ABORT_FALLBACK).not.toContain('Response complete nahi hua')
  })

  it('STREAM_EMPTY_FALLBACK uses neutral retry hint, no blame', () => {
    expect(STREAM_EMPTY_FALLBACK).toContain('Response generate nahi hua')
    expect(STREAM_EMPTY_FALLBACK).toContain('thoda alag tarah se puchein')
    // Old blame language must be gone.
    expect(STREAM_EMPTY_FALLBACK).not.toContain('aur specific batayein')
  })

  it('STREAM_TIMEOUT_FALLBACK uses refresh hint, no blame', () => {
    expect(STREAM_TIMEOUT_FALLBACK).toContain('time le raha hai')
    expect(STREAM_TIMEOUT_FALLBACK).toContain('refresh karke')
    // Old blame language must be gone.
    expect(STREAM_TIMEOUT_FALLBACK).not.toContain('thoda specific batayein')
  })

  it('STREAM_UPSTREAM_FALLBACK acknowledges service issue, no blame', () => {
    expect(STREAM_UPSTREAM_FALLBACK).toContain('temporary issue')
    expect(STREAM_UPSTREAM_FALLBACK).toContain('kuch seconds baad')
    // Old blame language must be gone.
    expect(STREAM_UPSTREAM_FALLBACK).not.toContain('thoda alag tareeke se puchein')
  })
})
