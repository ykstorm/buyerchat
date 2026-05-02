// Sprint 11.5 (2026-05-02) — artifact staleness signal.
//
// The right panel keeps the last-rendered artifact across buyer turns
// (so a 3-step thread that surfaced a project_card on turn 1 still has
// that card visible while the buyer reads turn 3's prose). When turn 3
// asks a different question (a comparison, a cost question, an
// unrelated builder query) AND the AI fails to emit a fresh CARD —
// because of a prompt-shape bug like the EXAMPLE 7 leftProjectId
// regression, or genuine emission drift — the buyer sees stale data
// next to fresh prose. Looks like cross-session contamination.
//
// This helper labels that state. Pure so the chat client can pass in
// timestamps without dragging React state into the test surface — same
// pattern as Sprint 7-fix shouldRenderStageACapture and Sprint 8
// isBareKeywordInput.
//
// Hide-vs-signal decision: don't hide. Buyers want continuity, and a
// stale-but-relevant card is more useful than an empty panel during
// the brief window between sending a query and the new CARD landing.
// The right panel renders a subtle caption when isArtifactStale is
// true — "Previous result — new response in progress…" — and the
// caption disappears the moment a fresh CARD lands.

export interface ArtifactStalenessInput {
  hasArtifact: boolean
  lastQueryAt: number | null
  lastArtifactAt: number | null
  isStreaming: boolean
}

export function isArtifactStale(input: ArtifactStalenessInput): boolean {
  // No artifact rendered yet → nothing to mark stale.
  if (!input.hasArtifact) return false
  // No buyer query has fired in this session → can't be stale relative
  // to a question that didn't happen. Hydration-only state.
  if (input.lastQueryAt == null) return false
  // Artifact predates the latest query AND the response is still in
  // flight → user sent a new question, no fresh CARD has landed yet.
  // Show staleness caption so the buyer knows this isn't the answer
  // to their current question.
  if (input.lastArtifactAt == null) {
    return input.isStreaming
  }
  if (input.lastArtifactAt < input.lastQueryAt) {
    return input.isStreaming
  }
  // Latest artifact is newer than (or equal to) latest query →
  // dispatcher has caught up, no staleness.
  return false
}

export const ARTIFACT_STALENESS_CAPTION =
  'Previous result — new response in progress…'
