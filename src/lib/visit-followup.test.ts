import { describe, it, expect } from 'vitest'
import type { SiteVisit } from '@prisma/client'
import {
  buildFollowupMessage,
  followupsDueForVisit,
  type FollowupKind,
} from './visit-followup'

const HOUR_MS = 60 * 60 * 1000

// Build a SiteVisit fixture with the new follow-up columns initialised.
// Only the fields touched by followupsDueForVisit need to be realistic.
function makeVisit(overrides: Partial<SiteVisit> = {}): SiteVisit & { project?: { projectName: string } | null } {
  return {
    id: 'v1',
    visitToken: 'AG-TEST',
    userId: 'u1',
    projectId: 'p1',
    otpVerified: true,
    visitScheduledDate: new Date(),
    visitCompleted: false,
    createdAt: new Date(),
    expiresAt: null,
    builderAcknowledged: false,
    leadRegisteredAt: null,
    buyerName: 'Test Buyer',
    buyerPhone: '9876543210',
    buyerEmail: null,
    followupT24Sent: null,
    followupT3Sent: null,
    followupT1Sent: null,
    postVisitT1Sent: null,
    postVisitT24Sent: null,
    postVisitT48Sent: null,
    postVisit72Closed: false,
    ...overrides,
  } as unknown as SiteVisit & { project?: { projectName: string } | null }
}

const NOW = new Date('2026-04-26T12:00:00.000Z')

describe('followupsDueForVisit — window correctness', () => {
  it('fires T-24 when slot is exactly 24h away and timestamp is null', () => {
    const visit = makeVisit({ visitScheduledDate: new Date(NOW.getTime() + 24 * HOUR_MS) })
    expect(followupsDueForVisit(visit, NOW)).toContain('followup_t24')
  })

  it('does NOT fire T-24 when slot is 25h+ away (just outside window)', () => {
    const visit = makeVisit({ visitScheduledDate: new Date(NOW.getTime() + 25.5 * HOUR_MS) })
    expect(followupsDueForVisit(visit, NOW)).not.toContain('followup_t24')
  })

  it('fires T-24 when slot is 23.5h away (inside window upper bound)', () => {
    const visit = makeVisit({ visitScheduledDate: new Date(NOW.getTime() + 23.5 * HOUR_MS) })
    expect(followupsDueForVisit(visit, NOW)).toContain('followup_t24')
  })

  it('fires T-3 at 3h-before-slot and not T-24', () => {
    const visit = makeVisit({ visitScheduledDate: new Date(NOW.getTime() + 3 * HOUR_MS) })
    const due = followupsDueForVisit(visit, NOW)
    expect(due).toContain('followup_t3')
    expect(due).not.toContain('followup_t24')
  })

  it('fires T-1 at 1h-before-slot', () => {
    const visit = makeVisit({ visitScheduledDate: new Date(NOW.getTime() + 1 * HOUR_MS) })
    expect(followupsDueForVisit(visit, NOW)).toContain('followup_t1')
  })

  it('fires T+1 at 1h-after-slot', () => {
    const visit = makeVisit({ visitScheduledDate: new Date(NOW.getTime() - 1 * HOUR_MS) })
    expect(followupsDueForVisit(visit, NOW)).toContain('post_visit_t1')
  })

  it('fires T+24 at 24h-after-slot', () => {
    const visit = makeVisit({ visitScheduledDate: new Date(NOW.getTime() - 24 * HOUR_MS) })
    expect(followupsDueForVisit(visit, NOW)).toContain('post_visit_t24')
  })

  it('fires T+48 at 48h-after-slot', () => {
    const visit = makeVisit({ visitScheduledDate: new Date(NOW.getTime() - 48 * HOUR_MS) })
    expect(followupsDueForVisit(visit, NOW)).toContain('post_visit_t48')
  })
})

describe('followupsDueForVisit — idempotency', () => {
  it('returns nothing for T-24 when followupT24Sent is already set', () => {
    const visit = makeVisit({
      visitScheduledDate: new Date(NOW.getTime() + 24 * HOUR_MS),
      followupT24Sent: new Date(NOW.getTime() - 60 * 60 * 1000),
    })
    expect(followupsDueForVisit(visit, NOW)).not.toContain('followup_t24')
  })

  it('returns nothing for T+24 when postVisitT24Sent is already set', () => {
    const visit = makeVisit({
      visitScheduledDate: new Date(NOW.getTime() - 24 * HOUR_MS),
      postVisitT24Sent: new Date(NOW.getTime() - 1000),
    })
    expect(followupsDueForVisit(visit, NOW)).not.toContain('post_visit_t24')
  })
})

describe('followupsDueForVisit — T+72 close one-shot', () => {
  it('fires close when slot was 73h ago and flag is false', () => {
    const visit = makeVisit({
      visitScheduledDate: new Date(NOW.getTime() - 73 * HOUR_MS),
      postVisit72Closed: false,
    })
    expect(followupsDueForVisit(visit, NOW)).toContain('post_visit_t72_close')
  })

  it('does NOT fire close once postVisit72Closed is true', () => {
    const visit = makeVisit({
      visitScheduledDate: new Date(NOW.getTime() - 73 * HOUR_MS),
      postVisit72Closed: true,
    })
    expect(followupsDueForVisit(visit, NOW)).not.toContain('post_visit_t72_close')
  })

  it('does NOT fire close when slot was only 71h ago (still inside silent window)', () => {
    const visit = makeVisit({
      visitScheduledDate: new Date(NOW.getTime() - 71 * HOUR_MS),
      postVisit72Closed: false,
    })
    expect(followupsDueForVisit(visit, NOW)).not.toContain('post_visit_t72_close')
  })
})

describe('buildFollowupMessage — verbatim playbook templates', () => {
  // Templates are user-facing. We assert the unique opening line of each
  // kind so a paraphrase or accidental rewrite breaks the test.
  const baseSlot = new Date('2026-05-01T11:00:00.000Z')
  const payload = { projectName: 'Sarathya West', slot: baseSlot, token: 'AG-1234' }

  const expectations: Record<FollowupKind, string> = {
    followup_t24:        'Kal aapka Sarathya West ka visit hai',
    followup_t3:         'Sarathya West visit aaj',
    followup_t1:         'Site ke paas honge ab.',
    post_visit_t1:       'Visit kaisa raha?',
    post_visit_t24:      'Kal ka visit kaafi useful raha hoga.',
    post_visit_t48:      'Aapka Sarathya West visit pending decision mein hai.',
    post_visit_t72_close: 'Aapka shortlist active hai.',
  }

  for (const [kind, opener] of Object.entries(expectations) as [FollowupKind, string][]) {
    it(`${kind} starts with the playbook opener`, () => {
      const text = buildFollowupMessage(kind, payload)
      expect(text.startsWith(opener)).toBe(true)
    })
  }

  it('T-24 contains both checklist items from the playbook', () => {
    const text = buildFollowupMessage('followup_t24', payload)
    expect(text).toContain('Bedroom ka actual size')
    expect(text).toContain('Light aur ventilation')
  })

  it('T+1 is short and open-ended (per playbook PART D1)', () => {
    const text = buildFollowupMessage('post_visit_t1', payload)
    expect(text.split('\n').length).toBeLessThanOrEqual(3)
    expect(text).toContain('Seedha batao')
  })
})
