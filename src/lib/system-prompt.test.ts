// system-prompt.test.ts — v3 14-PART verification
//
// Pinning v3 invariants so we catch accidental regressions when the
// prompt is edited. Each test maps to a numbered PART in the source-of-
// truth spec at docs/source-of-truth/v3-system-prompt.txt. The v2 body
// is archived in system-prompt-v2-archive.ts and not exercised here —
// see route.ts for the version flag wiring.

import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, formatRetrievedChunks } from './system-prompt'
import type { RetrievedChunk } from '@/lib/rag/retriever'

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

  it('PART 2: emits the OPENING MESSAGE PROTOCOL with professional English opener (Sprint 12.5)', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('OPENING MESSAGE PROTOCOL')
    expect(prompt).toContain(
      'Welcome to Homesty AI — honest property intelligence for South Bopal and Shela, Ahmedabad.',
    )
    expect(prompt).toContain('Are you looking for a family home or an investment property?')
    expect(prompt).toContain('professional English')
    expect(prompt).not.toMatch(/Namaste! Main Homesty AI hoon/)
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

  // Sprint 4 (2026-04-30): lock #7 strengthened with explicit ban on
  // cross-project price contamination (Image 1 root cause — AI substituted
  // Vishwanath Sarathya West's ₹4,000/sqft for The Planet's missing data).
  it('PART 15 lock #7: bans cross-project price contamination (Sprint 4)', () => {
    const prompt = buildSystemPrompt(baseCtx)
    // The new clause must mention the specific contamination sources
    expect(prompt).toMatch(/cross-project price contamination/i)
    expect(prompt).toMatch(/comparison set, RAG retrieved chunks, or another project/i)
    // The illustrative example anchors the rule for the model
    expect(prompt).toContain('Vishwanath Sarathya West')
    expect(prompt).toMatch(/each project's pricing stands\s*alone/i)
  })

  // Sprint 5.5 (2026-04-30): EXAMPLE 21 added to PART 16 — amenity queries
  // must answer in flowing comma-prose, never markdown bullets. Universal
  // (renders regardless of stageBEnabled).
  it('PART 16 EXAMPLE 21: amenity comma-prose pattern present (flag-off)', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('EXAMPLE 21')
    expect(prompt).toContain('pool, gym, kids play area')
    expect(prompt).toContain('WRONG SHAPES')
  })
  it('PART 16 EXAMPLE 21: amenity comma-prose pattern present (flag-on)', () => {
    const prompt = buildSystemPrompt(flagOnCtx)
    expect(prompt).toContain('EXAMPLE 21')
    expect(prompt).toContain('pool, gym, kids play area')
    expect(prompt).toContain('WRONG SHAPES')
  })

  // Sprint 5.5 (2026-04-30): PART 7 Step 1.5 added — imprecise time input
  // must be confirmed-back, not echoed verbatim and not fabricated into a
  // precise slot. Both flag-on (Step 1.5 between Steps 1 and 2) and flag-off
  // (paragraph at end of artifact-only flow) variants enforce the rule.
  it('PART 7 Step 1.5: imprecise time confirm-back rule present (flag-on)', () => {
    const prompt = buildSystemPrompt(flagOnCtx)
    expect(prompt).toContain('subah 9 11')
    expect(prompt).toMatch(/Wait for buyer's confirmation/i)
  })
  it('PART 7 imprecise time handling: confirm-back rule present (flag-off)', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('subah 9 11')
    expect(prompt).toMatch(/confirm-back/i)
  })

  // Sprint 8 (2026-05-02): EXAMPLE 22 added to PART 16 — locality amenity
  // queries (aas-paas / nearby) must answer in flowing comma-prose, never
  // markdown bullets. Universal (renders regardless of stageBEnabled).
  it('PART 16 EXAMPLE 22: locality amenity comma-prose pattern present (flag-off)', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('EXAMPLE 22')
    expect(prompt).toContain('aas-paas')
    expect(prompt).toMatch(/locality query/i)
  })
  it('PART 16 EXAMPLE 22: locality amenity comma-prose pattern present (flag-on)', () => {
    const prompt = buildSystemPrompt(flagOnCtx)
    expect(prompt).toContain('EXAMPLE 22')
    expect(prompt).toContain('aas-paas')
  })

  // Sprint 8 (2026-05-02): PART 7 Step 0 added — project-name validation
  // before the visit-booking flow advances. Unknown project names ("venus
  // group properties") must trigger a clarification ask, not the holding-
  // message flow. Both flag variants enforce.
  it('PART 7 Step 0: project-name validation rule present (flag-on)', () => {
    const prompt = buildSystemPrompt(flagOnCtx)
    expect(prompt).toContain('Step 0')
    expect(prompt).toMatch(/Project-name validation/i)
    expect(prompt).toContain('venus group properties')
  })
  it('PART 7 Step 0: project-name validation rule present (flag-off)', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('Step 0')
    expect(prompt).toMatch(/Project-name validation/i)
    expect(prompt).toContain('venus group properties')
  })

  // Sprint 11.5 (2026-05-02): comparison CARD shape regression. EXAMPLE 7
  // had been emitting `leftProjectId/rightProjectId` since the V2 prompt
  // — the dispatcher checks `card.projectIdA && card.projectIdB`, so the
  // mismatched shape was silently rejected, leaving the right panel
  // showing a stale prior artifact. Tests pin the correct field names
  // and prevent re-introduction of the wrong shape.
  it('PART 16 EXAMPLE 7: comparison CARD uses projectIdA/projectIdB shape', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('EXAMPLE 7')
    expect(prompt).toMatch(/"type":"comparison","projectIdA"/)
    expect(prompt).toMatch(/"projectIdB"/)
  })
  it('PART 16 EXAMPLE 7: comparison CARD does NOT use leftProjectId/rightProjectId (regression guard)', () => {
    const prompt = buildSystemPrompt(baseCtx)
    // The wrong shape is referenced ONLY in the [WRONG SHAPE — silently
    // dropped] negative-example block of EXAMPLE 23 (with the ❌ marker).
    // It must not appear in any actual emitted CARD example.
    const cardEmissions = prompt.match(/<!--CARD:\{[^}]+\}-->/g) ?? []
    for (const card of cardEmissions) {
      expect(card).not.toContain('leftProjectId')
      expect(card).not.toContain('rightProjectId')
    }
  })

  // Sprint 11.5 — comparison CARD enforcement. The PART 16 spec entry now
  // says "MUST emit a comparison CARD whenever the buyer asks to compare
  // two projects" so the model can't fall back to prose-only responses.
  it('PART 16 comparison spec: MUST-emit enforcement language present', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toMatch(/MUST emit a comparison CARD/i)
  })

  // Sprint 11.5 — EXAMPLE 23 added to PART 16. New comparison example
  // showcases the correct projectIdA/projectIdB shape and explicitly
  // names the wrong shape in its WRONG-SHAPE annotation block so the
  // model has both positive and negative reinforcement.
  it('PART 16 EXAMPLE 23: comparison emission example present (flag-off)', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('EXAMPLE 23')
    expect(prompt).toMatch(/comparison.*MUST emit/i)
    expect(prompt).toMatch(/projectIdA/)
  })
  it('PART 16 EXAMPLE 23: comparison emission example present (flag-on)', () => {
    const prompt = buildSystemPrompt(flagOnCtx)
    expect(prompt).toContain('EXAMPLE 23')
    expect(prompt).toMatch(/projectIdA/)
  })

  // Sprint 11.8 — cost_breakdown CARD enforcement. Same emission-drift class
  // Sprint 11.5 fixed for comparison: prose-only cost replies left the right
  // panel showing a stale prior artifact. PART 16 cost_breakdown spec entry
  // now carries MUST-emit language and EXAMPLE 24 demos the correct shape.
  it('PART 16 cost_breakdown spec: MUST-emit enforcement language present', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toMatch(/MUST emit a cost_breakdown CARD/i)
  })
  it('PART 16 EXAMPLE 24: cost_breakdown emission example present (flag-off)', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('EXAMPLE 24')
    expect(prompt).toMatch(/cost_breakdown.*MUST emit/i)
  })
  it('PART 16 EXAMPLE 24: cost_breakdown emission example present (flag-on)', () => {
    const prompt = buildSystemPrompt(flagOnCtx)
    expect(prompt).toContain('EXAMPLE 24')
    expect(prompt).toMatch(/"type":"cost_breakdown","projectId"/)
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
    expect(prompt).not.toContain('Rohit Patel ka visit request note ho gaya. Project: The Planet')
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
    expect(prompt).toContain('Rohit Patel ka visit request note ho gaya. Project: The Planet')
  })
})

// Sprint 11.17.1 (2026-05-05) — RAG observability + diagnosability.
// PART B (formatRetrievedChunks helper) + PART C (empty-state always-render)
// pin the contract so future edits to PART 17 don't silently strip source/
// similarity annotations or revert to silent omission on empty chunks.
describe('Sprint 11.17.1 — formatRetrievedChunks helper (PART B)', () => {
  it('renders source + similarity in chunk header', () => {
    const chunks: RetrievedChunk[] = [
      { sourceType: 'location_data', sourceId: 'loc-1', content: 'Hospital nearby.', similarity: 0.84 },
    ]
    const out = formatRetrievedChunks(chunks)
    expect(out).toContain('(source=location_data, similarity=0.84)')
  })

  it('formats similarity to 2 decimals', () => {
    const chunks: RetrievedChunk[] = [
      { sourceType: 'project', sourceId: 'p1', content: 'x', similarity: 0.7123456 },
    ]
    const out = formatRetrievedChunks(chunks)
    expect(out).toContain('similarity=0.71')
    expect(out).not.toContain('0.7123456')
  })

  it('preserves chunk content verbatim', () => {
    const longContent = 'Riviera Bliss is in Shela. ' + 'a'.repeat(400)
    const chunks: RetrievedChunk[] = [
      { sourceType: 'project', sourceId: 'p1', content: longContent, similarity: 0.5 },
    ]
    const out = formatRetrievedChunks(chunks)
    expect(out).toContain(longContent)
  })

  it('separates multiple chunks by blank line, indexed [1]/[2]', () => {
    const chunks: RetrievedChunk[] = [
      { sourceType: 'project', sourceId: 'p1', content: 'first', similarity: 0.9 },
      { sourceType: 'builder', sourceId: 'b1', content: 'second', similarity: 0.6 },
    ]
    const out = formatRetrievedChunks(chunks)
    expect(out).toContain('[1] (source=project')
    expect(out).toContain('[2] (source=builder')
    expect(out).toContain('first\n\n[2]')
  })
})

describe('Sprint 11.17.1 — PART 17 always-render empty-state (PART C)', () => {
  it('PART 17 header present when retrievedChunks is undefined', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('PART 17 — RETRIEVED KNOWLEDGE BASE CONTEXT')
  })

  it('PART 17 header present when retrievedChunks is empty []', () => {
    const prompt = buildSystemPrompt(baseCtx, undefined, null, [])
    expect(prompt).toContain('PART 17 — RETRIEVED KNOWLEDGE BASE CONTEXT')
  })

  it('empty-state instructs "Do NOT fabricate" when no chunks', () => {
    const prompt = buildSystemPrompt(baseCtx, undefined, null, [])
    expect(prompt).toContain('No relevant context retrieved from knowledge base')
    expect(prompt).toContain('Do NOT fabricate')
  })

  it('empty-state language NOT present when chunks have items', () => {
    const chunks: RetrievedChunk[] = [
      { sourceType: 'location_data', sourceId: 'loc-1', content: 'CIMS Hospital is 1.2km from Riviera Bliss.', similarity: 0.88 },
      { sourceType: 'project', sourceId: 'p1', content: 'Riviera Bliss has 3BHK at ₹85L.', similarity: 0.72 },
    ]
    const prompt = buildSystemPrompt(baseCtx, undefined, null, chunks)
    expect(prompt).toContain('PART 17 — RETRIEVED KNOWLEDGE BASE CONTEXT')
    expect(prompt).toContain('(source=location_data, similarity=0.88)')
    expect(prompt).toContain('(source=project, similarity=0.72)')
    expect(prompt).not.toContain('No relevant context retrieved from knowledge base')
    // Note: "Do NOT fabricate" appears in PART 0 absolute rules unconditionally,
    // so we can't assert its absence here. The empty-state-specific marker is
    // "No relevant context retrieved from knowledge base" — pinned above.
  })

  it('TRUST HIERARCHY clause present when chunks have items (governs precedence vs PART 15)', () => {
    const chunks: RetrievedChunk[] = [
      { sourceType: 'project', sourceId: 'p1', content: 'something', similarity: 0.6 },
    ]
    const prompt = buildSystemPrompt(baseCtx, undefined, null, chunks)
    expect(prompt).toContain('TRUST HIERARCHY')
    expect(prompt).toContain('trust project_json')
  })
})
