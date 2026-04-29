import { describe, it, expect } from 'vitest'
import { hydrateArtifacts } from './artifact-hydrate'
import type { PersistedArtifact, ProjectType } from '@/lib/types/chat'
import type { BuilderAIContext } from '@/lib/types/builder-ai-context'

const proj = (id: string, builderName = 'Acme'): ProjectType => ({
  id,
  projectName: `Project ${id}`,
  builderName,
  pricePerSqft: 4000,
  minPrice: 8500000,
  maxPrice: 9500000,
  possessionDate: new Date('2026-12-01'),
  constructionStatus: 'Under Construction',
  microMarket: 'Shela',
  trustScore: 75,
  trustGrade: 'B',
})

const projects: ProjectType[] = [proj('p1'), proj('p2', 'Goyal & Co.')]
const builders: BuilderAIContext[] = [
  {
    id: 'b1',
    builderName: 'Goyal & Co.',
    brandName: 'Goyal',
    totalTrustScore: 82,
    grade: 'A',
    deliveryScore: 24,
    reraScore: 16,
    qualityScore: 16,
    financialScore: 13,
    responsivenessScore: 13,
    agreementSigned: true,
  },
]

describe('hydrateArtifacts', () => {
  it('empty / null / undefined input → empty output', () => {
    expect(hydrateArtifacts([], projects)).toEqual([])
    expect(hydrateArtifacts(null, projects)).toEqual([])
    expect(hydrateArtifacts(undefined, projects)).toEqual([])
  })

  it('project_card with valid projectId → hydrated with full Project', () => {
    const persisted: PersistedArtifact[] = [
      { type: 'project_card', projectId: 'p1', emittedAt: '2026-04-29T00:00:00Z' },
    ]
    const out = hydrateArtifacts(persisted, projects)
    expect(out).toHaveLength(1)
    expect(out[0].type).toBe('project_card')
    expect(out[0].data.id).toBe('p1')
    expect(out[0].data.projectName).toBe('Project p1')
  })

  it('project_card with deleted projectId → omitted', () => {
    const persisted: PersistedArtifact[] = [
      { type: 'project_card', projectId: 'deleted-id', emittedAt: '2026-04-29T00:00:00Z' },
    ]
    expect(hydrateArtifacts(persisted, projects)).toEqual([])
  })

  it('comparison with both projectIdA + projectIdB valid → hydrated dataA + dataB', () => {
    const persisted: PersistedArtifact[] = [
      {
        type: 'comparison',
        projectIdA: 'p1',
        projectIdB: 'p2',
        emittedAt: '2026-04-29T00:00:00Z',
      },
    ]
    const out = hydrateArtifacts(persisted, projects)
    expect(out).toHaveLength(1)
    expect(out[0].type).toBe('comparison')
    expect(out[0].data.id).toBe('p1')
    expect(out[0].dataB?.id).toBe('p2')
  })

  it('comparison with one missing projectId → omitted (need both)', () => {
    const persisted: PersistedArtifact[] = [
      {
        type: 'comparison',
        projectIdA: 'p1',
        projectIdB: 'deleted-id',
        emittedAt: '2026-04-29T00:00:00Z',
      },
    ]
    expect(hydrateArtifacts(persisted, projects)).toEqual([])
  })

  it('builder_trust resolves builder by name and attaches BuilderAIContext', () => {
    const persisted: PersistedArtifact[] = [
      {
        type: 'builder_trust',
        builderName: 'Goyal & Co.',
        grade: 'A',
        trustScore: 82,
        emittedAt: '2026-04-29T00:00:00Z',
      },
    ]
    const out = hydrateArtifacts(persisted, projects, builders)
    expect(out).toHaveLength(1)
    expect(out[0].type).toBe('builder_trust')
    expect(out[0].builder?.builderName).toBe('Goyal & Co.')
    expect(out[0].data.trustGrade).toBe('A')
    expect(out[0].data.trustScore).toBe(82)
  })

  it('builder_trust with no matching project → omitted', () => {
    const persisted: PersistedArtifact[] = [
      {
        type: 'builder_trust',
        builderName: 'Unknown Builder',
        emittedAt: '2026-04-29T00:00:00Z',
      },
    ]
    expect(hydrateArtifacts(persisted, projects, builders)).toEqual([])
  })

  it('visit_booking + visit_prompt + cost_breakdown all hydrate via projectId', () => {
    const persisted: PersistedArtifact[] = [
      { type: 'visit_booking', projectId: 'p1', emittedAt: '2026-04-29T00:00:00Z' },
      { type: 'visit_prompt', projectId: 'p2', emittedAt: '2026-04-29T00:00:01Z' },
      { type: 'cost_breakdown', projectId: 'p1', emittedAt: '2026-04-29T00:00:02Z' },
    ]
    const out = hydrateArtifacts(persisted, projects)
    expect(out).toHaveLength(3)
    expect(out.map((a) => a.type)).toEqual([
      'visit_booking',
      'visit_prompt',
      'cost_breakdown',
    ])
  })

  it('preserves order from persisted array', () => {
    const persisted: PersistedArtifact[] = [
      { type: 'project_card', projectId: 'p2', emittedAt: '2026-04-29T00:00:00Z' },
      { type: 'project_card', projectId: 'p1', emittedAt: '2026-04-29T00:00:01Z' },
    ]
    const out = hydrateArtifacts(persisted, projects)
    expect(out.map((a) => a.data.id)).toEqual(['p2', 'p1'])
  })

  it('unknown type silently dropped — no throw', () => {
    const persisted = [
      { type: 'unknown_type' as any, projectId: 'p1', emittedAt: '2026-04-29T00:00:00Z' },
    ] as PersistedArtifact[]
    expect(() => hydrateArtifacts(persisted, projects)).not.toThrow()
    expect(hydrateArtifacts(persisted, projects)).toEqual([])
  })
})
