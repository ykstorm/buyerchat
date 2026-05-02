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
