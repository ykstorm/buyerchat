/**
 * Shared types for the chat system.
 * Single source of truth — imported by chat-client, ChatCenter, ChatRightPanel, and all artifact cards.
 */

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
}
