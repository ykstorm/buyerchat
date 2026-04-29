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

// Sprint 1 (2026-04-29): PART 5/6/7 + EXAMPLE 18 + RULE B body are now
// conditionally injected based on STAGE_B_ENABLED. Tests that assert the
// flag-on (legacy) copy use this ctx; tests that assert the flag-off (current
// production state) copy use baseCtx directly.
const flagOnCtx = { ...baseCtx, stageBEnabled: true }

describe('v3 system prompt — PART invariants', () => {
  it('PART 0 ABSOLUTE RULES: appears before Master Formula and lists Rules A-F', () => {
    const prompt = buildSystemPrompt(baseCtx)
    // The "ABSOLUTE RULES" header must come before the Master Formula header
    // (P2-PROMPT-NUCLEAR contract — front-load the hard stops).
    const absIdx = prompt.indexOf('PART 0 — ABSOLUTE RULES')
    const masterIdx = prompt.indexOf('MASTER FORMULA')
    expect(absIdx).toBeGreaterThan(-1)
    expect(masterIdx).toBeGreaterThan(absIdx)
    // All six rule labels are present.
    expect(prompt).toContain('RULE A — OUTPUT FORMAT')
    expect(prompt).toContain('RULE B — VISIT BOOKING')
    expect(prompt).toContain('RULE C — OTP PROHIBITION')
    expect(prompt).toContain('RULE D — AMENITY NAMES')
    expect(prompt).toContain('RULE E — NO FIRST PERSON')
    expect(prompt).toContain('RULE F — CARD CONTRACT')
  })

  it('PART 16 few-shots: EXAMPLE 17 + 18 appear BEFORE Example 1 (flag-on)', () => {
    const prompt = buildSystemPrompt(flagOnCtx)
    const ex17 = prompt.indexOf('EXAMPLE 17 — Hinglish budget+config')
    const ex18 = prompt.indexOf('EXAMPLE 18 — Visit-booking name+phone')
    const ex1 = prompt.indexOf('EXAMPLE 1 — Family buyer opening')
    expect(ex17).toBeGreaterThan(-1)
    expect(ex18).toBeGreaterThan(-1)
    expect(ex1).toBeGreaterThan(-1)
    expect(ex17).toBeLessThan(ex1)
    expect(ex18).toBeLessThan(ex1)
  })

  it('PART 7 (flag-on): visit-checklist no longer says "parking allocation" as a thing to confirm', () => {
    const prompt = buildSystemPrompt(flagOnCtx)
    // The phrase "parking allocation confirm karna" was the source of the
    // Sentry "Parking Allocation" HALLUCINATION event (the model read the
    // visit checklist as an amenities list). Replaced by the safer phrasing.
    expect(prompt).toContain('parking space ka arrangement seedha builder se confirm karna')
    expect(prompt).not.toMatch(/parking allocation confirm karna/i)
  })

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

  it('PART 4: enforces MAXIMUM 2 projects per recommendation', () => {
    const prompt = buildSystemPrompt(baseCtx)
    // Wording strengthened in P2-CHIPS-DASHBOARD (PROJECT_LIMIT
    // enforcement) — old "Max 2 projects per recommendation" → new
    // "MAXIMUM 2 projects per response" + cap restated for CARD blocks.
    expect(prompt).toContain('MAXIMUM 2 projects per response')
  })

  it('PART 7 (flag-on): lists the 4-step visit booking flow', () => {
    const prompt = buildSystemPrompt(flagOnCtx)
    expect(prompt).toContain('Step 1 — Micro-commitment')
    expect(prompt).toContain('Step 2 — Personalized slot')
    // Step 3 changed from "OTP verification" to "HOLDING MESSAGE" on
    // 2026-04-27 (P2-CRITICAL-7 Bug #1) after live smoke test caught the
    // model fabricating an OTP send/verify flow it has no tool for.
    expect(prompt).toContain('Step 3 — HOLDING MESSAGE')
    expect(prompt).toContain('Step 4 — Confirmation')
  })

  it('PART 7 (flag-on): bans OTP simulation in visit booking', () => {
    const prompt = buildSystemPrompt(flagOnCtx)
    // The strengthened PART 8.5 rule #2 must list specific banned phrases.
    expect(prompt).toContain('OTP bheja hai')
    expect(prompt).toContain('Kuch problem hui — dubara try karein')
  })

  it('PART 9 Rule 9: zero-bullets-ever rule is present', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('Rule 9: ZERO BULLETS EVER')
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

// Sprint 1 (2026-04-29): STAGE_B_ENABLED flag-gating coverage.
// PART 5/6/7 + EXAMPLE 18 + RULE B body should NOT contain Stage B trigger
// scripts when stageBEnabled=false (default). When stageBEnabled=true, the
// flag-on body MUST be intact so flipping the env var later is a no-op for
// the prompt layer.
describe('Stage B flag-aware prompt sections (Sprint 1)', () => {
  it('flag-OFF (default): omits Stage B trigger scripts and "request note ho gaya" template', () => {
    const prompt = buildSystemPrompt(baseCtx)
    // The verbatim trigger scripts hardcoded into PART 5 (lines 320-339 pre-Sprint-1)
    expect(prompt).not.toContain('Mobile number share karein — calculation unlock ho jaayegi')
    expect(prompt).not.toContain('calculation unlock ho jaayegi')
    expect(prompt).not.toContain('mobile number chahiye')
    // PART 7 Step 3 holding-message template that the AI parroted in Image 6
    expect(prompt).not.toContain('[Buyer name] ka visit request note ho gaya')
    expect(prompt).not.toContain('Preferred slot: [Day, Time range]')
    // EXAMPLE 18 flag-on canonical bad-output mimicry (line 1013 pre-Sprint-1)
    expect(prompt).not.toContain('Lakshyaraj ka visit request note ho gaya. Project: The Planet')
  })

  it('flag-OFF (default): includes flag-off replacement copy + ❌ inverted EXAMPLE 18', () => {
    const prompt = buildSystemPrompt(baseCtx)
    // PART 5 flag-off explicitly bans phone-asking-in-prose
    expect(prompt).toContain('Stage A (soft capture, no OTP) is the only capture flow active')
    expect(prompt).toContain('NEVER ask buyers for phone/mobile/OTP')
    // PART 7 flag-off names the visit_booking artifact as the only mechanism
    expect(prompt).toContain('PART 7 — VISIT BOOKING (artifact-only, no in-prose phone capture)')
    expect(prompt).toContain('visit_booking artifact')
    // EXAMPLE 18 flag-off shows the bad pattern as ❌ with the corrected ✓ response
    expect(prompt).toContain('NEVER OUTPUT THIS SHAPE')
    expect(prompt).toContain('CORRECT WHEN STAGE B IS OFF')
    expect(prompt).toContain('Aapne naam aur number share kiya')
    // RULE B's body should be the flag-off variant
    expect(prompt).toContain('RULE B — VISIT BOOKING (Stage B is OFF)')
  })

  it('flag-ON: includes Stage B trigger scripts (recovery path for future flag flip)', () => {
    const prompt = buildSystemPrompt(flagOnCtx)
    // The flag-on body MUST still contain the legacy trigger scripts so that
    // when Mama flips STAGE_B_ENABLED=true later, no second sprint is needed.
    expect(prompt).toContain('Mobile number share karein — calculation unlock ho jaayegi')
    expect(prompt).toContain('PART 5 — CAPTURE STRATEGY')
    expect(prompt).toContain('PART 7 — VISIT BOOKING COMPLETE FLOW (4 steps)')
    // PART 7 Step 3 template restored verbatim
    expect(prompt).toContain('[Buyer name] ka visit request note ho gaya')
    // EXAMPLE 18 flag-on shows the legitimate holding-message form
    expect(prompt).toContain('Lakshyaraj ka visit request note ho gaya. Project: The Planet')
  })
})
