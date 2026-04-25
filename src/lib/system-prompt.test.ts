// system-prompt.test.ts — v3 14-PART verification
//
// Pinning v3 invariants so we catch accidental regressions when the
// prompt is edited. Each test maps to a numbered PART in the source-of-
// truth spec at docs/source-of-truth/v3-system-prompt.txt. The v2 body
// is archived in system-prompt-v2-archive.ts and not exercised here —
// see route.ts for the version flag wiring.

import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from './system-prompt'

const baseCtx = {
  projects: [
    {
      id: 'cmtest123',
      name: 'Test Project A',
      builder: 'Acme Builders',
      zone: 'Shela',
      configurations: '3BHK',
      trustScore: 75,
      decisionTag: 'Buy w/ Cond',
      possession: 'Dec 2026',
      possessionFlag: 'green',
      reraNumber: 'PR/GJ/123/2024',
      pricePerSqft: 4000,
      priceRange: '₹85L–₹95L',
      bankApprovals: 'SBI, HDFC',
      honestConcern: 'Construction at 30% — verify pace.',
      analystNote: 'Strong location.',
    },
  ],
  localities: [{ name: 'Shela', avgPricePerSqft: 4180 }],
  infrastructure: [{ name: 'Iskcon Cross Roads', distance: '2km' }],
  dataAsOf: '2026-04-24',
}

describe('v3 system prompt — PART invariants', () => {
  it('PART 2: emits the canonical Hinglish opener verbatim', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain(
      'Namaste! Main Homesty AI hoon — South Bopal aur Shela ke projects ka honest property analysis karta hoon.',
    )
    expect(prompt).toContain('Aap kya dhundh rahe hain — 2BHK, 3BHK, family home ya investment?')
  })

  it('PART 3: caps qualification questions to "maximum 1-2 per message"', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('maximum 1-2 per message')
  })

  it('PART 4: enforces max 2 projects per recommendation', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('Max 2 projects per recommendation')
  })

  it('PART 7: lists the 4-step visit booking flow', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('Step 1 — Micro-commitment')
    expect(prompt).toContain('Step 2 — Personalized slot')
    expect(prompt).toContain('Step 3 — OTP verification')
    expect(prompt).toContain('Step 4 — Confirmation')
  })

  it('PART 8: includes the canonical commission (Option Z) script', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('Builder se commission — aapse nahi.')
    expect(prompt).toContain('Aapko Homesty AI use karne ke liye kuch pay nahi karna.')
  })

  it('PART 9 Rule 4: bans first-person pronouns', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('Rule 4: No First Person')
    expect(prompt).toMatch(/ZERO "main\/mera\/I\/me\/my\/maine"/i)
  })

  it('PART 10: declares Roman script absolute', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('Always Roman/English alphabet. NEVER Devanagari or Gujarati script.')
  })

  it('PART 12 Banned Patterns: includes "Best for / Not ideal for / Worth visiting"', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toMatch(/Best for \/ Not ideal for \/ Worth visiting/)
  })

  it('PART 14: Emotional Decision Engine renders 4-stage tone evolution', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('PART 14 — EMOTIONAL DECISION ENGINE')
    expect(prompt).toContain('Stage 1 — Entry')
    expect(prompt).toContain('Stage 2 — Comfort')
    expect(prompt).toContain('Stage 3 — Interest')
    expect(prompt).toContain('Stage 4 — Decision')
  })

  it('PART 15: injects PROJECT_JSON, locality data, and GUARD_LIST when ctx populated', () => {
    const guardList = 'GUARD_LIST (hospital): ["Krishna Shalby"]'
    const prompt = buildSystemPrompt({ ...baseCtx, locationGuardList: guardList })
    // Project facts surface in the data-injection block
    expect(prompt).toContain('Test Project A')
    expect(prompt).toContain('Acme Builders')
    expect(prompt).toContain('PR/GJ/123/2024')
    expect(prompt).toContain('ID: cmtest123')
    // Locality JSON is serialised
    expect(prompt).toContain('"name": "Shela"')
    // Guard list block is rendered ahead of PROJECT_JSON
    expect(prompt).toContain(guardList)
    // Anti-fabrication rule numbers from v2 PART 8.5 are preserved
    expect(prompt).toContain('FABRICATED_STAT')
    expect(prompt).toContain('FABRICATED_PRICE')
    expect(prompt).toContain('FAKE_VISIT_CLAIM')
  })
})
