import { describe, it, expect } from 'vitest'
import {
  isArtifactStale,
  ARTIFACT_STALENESS_CAPTION,
} from './artifact-staleness'

describe('isArtifactStale (Sprint 11.5 — right-panel staleness signal)', () => {
  it('returns false when no artifact is rendered', () => {
    expect(
      isArtifactStale({
        hasArtifact: false,
        lastQueryAt: 1000,
        lastArtifactAt: 500,
        isStreaming: true,
      })
    ).toBe(false)
  })

  it('returns false when no buyer query has fired yet (hydration-only)', () => {
    // Session restored from chat history — artifact rendered from
    // hydrateArtifacts but the buyer hasn't typed anything in this
    // mount. No staleness because there is no "current question."
    expect(
      isArtifactStale({
        hasArtifact: true,
        lastQueryAt: null,
        lastArtifactAt: 500,
        isStreaming: false,
      })
    ).toBe(false)
  })

  it('returns true when artifact predates current query and response is streaming', () => {
    expect(
      isArtifactStale({
        hasArtifact: true,
        lastQueryAt: 2000,
        lastArtifactAt: 1500,
        isStreaming: true,
      })
    ).toBe(true)
  })

  it('returns true when no artifact has landed in this session and a query is mid-stream', () => {
    // Buyer asked something, response is streaming, no CARD has
    // arrived yet. The visible artifact (if any) was hydrated from
    // a prior session — relative to the live query, it's stale.
    expect(
      isArtifactStale({
        hasArtifact: true,
        lastQueryAt: 2000,
        lastArtifactAt: null,
        isStreaming: true,
      })
    ).toBe(true)
  })

  it('returns false when artifact is fresh (newer than current query)', () => {
    expect(
      isArtifactStale({
        hasArtifact: true,
        lastQueryAt: 2000,
        lastArtifactAt: 2500,
        isStreaming: false,
      })
    ).toBe(false)
  })

  it('returns false when artifact landed exactly at query timestamp', () => {
    // Edge case: dispatcher fires within the same millisecond as the
    // query timestamp. Treat as fresh.
    expect(
      isArtifactStale({
        hasArtifact: true,
        lastQueryAt: 2000,
        lastArtifactAt: 2000,
        isStreaming: false,
      })
    ).toBe(false)
  })

  it('returns false when streaming has finished even if no fresh CARD landed', () => {
    // Stream finished without a CARD emission. Don't keep the
    // staleness caption forever — the response is done. The CARD
    // miss is a separate (Sprint 9.5 / emission-drift) concern.
    expect(
      isArtifactStale({
        hasArtifact: true,
        lastQueryAt: 2000,
        lastArtifactAt: 1500,
        isStreaming: false,
      })
    ).toBe(false)
  })
})

describe('ARTIFACT_STALENESS_CAPTION', () => {
  it('communicates the in-progress nature without claiming the artifact is wrong', () => {
    expect(ARTIFACT_STALENESS_CAPTION.toLowerCase()).toContain('previous result')
    expect(ARTIFACT_STALENESS_CAPTION.toLowerCase()).toContain('new response')
  })
})
