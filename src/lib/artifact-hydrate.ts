// Sprint 2 (2026-04-29) — hydrate PersistedArtifact[] from DB into runtime
// Artifact[]. Pure function, testable without React.
//
// Replaces the keyword-match restore loop in chat-client.tsx that scanned
// assistant prose for projectName substrings (only handled project_card,
// missed casual/abbreviated names, lost CARD payload metadata). The new
// path is structural: parse CARDs at /api/chat persist time, store IDs +
// scalars on ChatSession.artifactHistory, hydrate on session load by
// joining against the current projects/builders arrays.
//
// Hydration is fail-soft: a deleted project / unknown builder yields null
// for that entry, which the caller filters out. Never throws.

import type {
  Artifact,
  PersistedArtifact,
  ProjectType,
} from '@/lib/types/chat'
import type { BuilderAIContext } from '@/lib/types/builder-ai-context'

export function hydrateArtifacts(
  persisted: readonly PersistedArtifact[] | null | undefined,
  projects: readonly ProjectType[],
  builders: readonly BuilderAIContext[] = []
): Artifact[] {
  if (!persisted || persisted.length === 0) return []
  const out: Artifact[] = []
  for (const p of persisted) {
    const a = hydrateOne(p, projects, builders)
    if (a) out.push(a)
  }
  return out
}

function hydrateOne(
  p: PersistedArtifact,
  projects: readonly ProjectType[],
  builders: readonly BuilderAIContext[]
): Artifact | null {
  switch (p.type) {
    case 'project_card':
    case 'cost_breakdown':
    case 'visit_booking':
    case 'visit_prompt': {
      if (!p.projectId) return null
      const proj = projects.find((x) => x.id === p.projectId)
      if (!proj) return null
      return { type: p.type, data: proj }
    }
    case 'comparison': {
      if (!p.projectIdA || !p.projectIdB) return null
      const a = projects.find((x) => x.id === p.projectIdA)
      const b = projects.find((x) => x.id === p.projectIdB)
      if (!a || !b) return null
      return { type: 'comparison', data: a, dataB: b }
    }
    case 'builder_trust': {
      const needle = (p.builderName ?? '').toLowerCase()
      if (!needle) return null
      const builder =
        builders.find(
          (b) =>
            (b.builderName ?? '').toLowerCase() === needle ||
            (b.brandName ?? '').toLowerCase() === needle ||
            (b.builderName ?? '').toLowerCase().includes(needle) ||
            (b.brandName ?? '').toLowerCase().includes(needle)
        ) ?? null
      const project = projects.find((x) =>
        x.builderName.toLowerCase().includes(needle)
      )
      if (!project) return null
      return {
        type: 'builder_trust',
        data: {
          ...project,
          trustScore: p.trustScore ?? builder?.totalTrustScore ?? project.trustScore ?? null,
          trustGrade: p.grade ?? builder?.grade ?? project.trustGrade ?? null,
        },
        builder,
      }
    }
    default:
      return null
  }
}
