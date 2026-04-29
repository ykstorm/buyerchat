/**
 * Shared types for the chat system.
 * Single source of truth — imported by chat-client, ChatCenter, ChatRightPanel, and all artifact cards.
 */

import type { BuilderAIContext } from './builder-ai-context'

export type ProjectType = {
  id: string
  projectName: string
  builderName: string
  pricePerSqft: number | null
  minPrice: number
  maxPrice: number
  possessionDate: Date | string
  constructionStatus: string
  microMarket: string
  decisionTag?: string | null
  honestConcern?: string | null
  analystNote?: string | null
  possessionFlag?: string | null
  configurations?: string | null
  bankApprovals?: string | null
  priceNote?: string | null
  pricePerSqftType?: string | null
  loadingFactor?: number | null
  allInPrice?: number | null
  trustScore?: number | null
  trustGrade?: string | null
  charges?: unknown
  carpetSqftMin?: number | null
  sbaSqftMin?: number | null
}

export type ArtifactType =
  | 'project_card'
  | 'visit_booking'
  | 'comparison'
  | 'cost_breakdown'
  | 'visit_prompt'
  | 'builder_trust'

export type Artifact = {
  type: ArtifactType
  data: ProjectType
  dataB?: ProjectType
  // Optional resolved builder attached for builder_trust artifacts.
  // When undefined, BuilderTrustCard hides detailed subscore bars.
  builder?: BuilderAIContext | null
}

// PersistedArtifact (Sprint 2, 2026-04-29) — DB-storable shape for
// ChatSession.artifactHistory. Keeps IDs + token + type-specific scalars,
// not full ProjectType/BuilderAIContext objects. Runtime Artifact is
// hydrated on session load by joining these IDs against the current
// projects/builders fetch — so price/possession/etc. on a re-opened
// session always reflect the latest data, not a stale snapshot.
//
// Shape mirrors the AI's CARD payload schema (see chat-client.tsx CARD
// parser at line ~386) so /api/chat can persist directly without
// re-mapping.
export interface PersistedArtifact {
  type: ArtifactType
  projectId?: string       // project_card / cost_breakdown / visit_booking / visit_prompt
  projectIdA?: string      // comparison
  projectIdB?: string      // comparison
  projectName?: string     // fallback label when projectId unresolvable
  builderId?: string       // builder_trust
  builderName?: string     // builder_trust (substring fallback)
  grade?: string           // builder_trust
  trustScore?: number      // builder_trust
  reason?: string          // visit_prompt / visit_booking
  emittedAt: string        // ISO timestamp — order is preserved by index
}
