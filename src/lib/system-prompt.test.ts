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

  // Sprint 13.1.A (2026-05-05) — audit conflict C2: EXAMPLE 17 RIGHT shape
  // previously had AI responding in Hinglish on turn 1 ("Aapke budget aur
  // Shela family requirement..."), contradicting PART 2 OPENING PROTOCOL.
  // Rewritten as multi-turn flow: turn-1 English opener, turn-2 confirms
  // and emits CARDs. CARD-emission lesson preserved on turn 2.
  it('EXAMPLE 17 RIGHT: turn-1 AI response is English per OPENING PROTOCOL (Sprint 13.1.A)', () => {
    const prompt = buildSystemPrompt(baseCtx)
    // Turn-1 AI response opens with the English protocol header.
    expect(prompt).toContain('Turn 1 — User opens in Hinglish, AI opens professional English')
    // Specific English opener phrase from PART 2 OPENING PROTOCOL.
    expect(prompt).toContain('Welcome to Homesty AI — honest property intelligence for South Bopal and Shela, Ahmedabad.')
    // Turn 2 carries the CARD emission lesson.
    expect(prompt).toContain('Turn 2 — User confirms')
    expect(prompt).toContain('<!--CARD:{"type":"project_card","projectId":"cmn0jn3kp0000zwfy4r5mf5s1"}-->')
    // Negative: the old Hinglish turn-1 AI response must be gone.
    expect(prompt).not.toContain('Aapke budget aur Shela family requirement ke hisaab se do strong options match karte hain')
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

  it('PART 8: cross-refs PART 15 CANONICAL COMMISSION ANSWERS (Sprint 13.1.G dedup)', () => {
    // Sprint 13.1.G replaced the verbose PART 8 commission script with a
    // one-line cross-ref to PART 15 canonical (which has full English +
    // Hinglish + per-builder variants). Test pins both: cross-ref present
    // at the PART 8 site, full canonical block intact at PART 15.
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('Commission question — see PART 15 CANONICAL COMMISSION ANSWERS')
    // PART 15 canonical block carries the actual scripts.
    expect(prompt).toContain('Builder se commission leta hai — aapko kuch nahi dena.')
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

  // Sprint 13.1.A (2026-05-05) — audit conflict C1: PART 14 Stage 1 example
  // cell previously contradicted PART 2 OPENING MESSAGE PROTOCOL by showing
  // a Hinglish phrase ("Aap kya dhundh rahe hain?"). Reconciled to the
  // English opener so prose rule + few-shot table cell agree.
  it('PART 14 Stage 1: example cell uses English opener (Sprint 13.1.A)', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('Welcome to Homesty AI — honest property intelligence for South Bopal and Shela, Ahmedabad. Are you looking for a family home or an investment property?')
    expect(prompt).toContain('Professional EN (per PART 2 OPENING PROTOCOL)')
    // Negative: the old conflicting Hinglish phrase MUST NOT remain in the
    // Stage 1 cell. (Other parts of the prompt may legitimately use other
    // Hinglish phrases — this guards the specific old offender.)
    expect(prompt).not.toContain('Aap kya dhundh rahe hain?')
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

// Sprint 13.1.D (2026-05-05) — Audit duplication cleanup. Three rule
// classes had 2-4 duplicate statements across the prompt; cumulative
// ~230 tokens of redundancy per buyer message. Canonical statements
// kept in single PARTs; duplicates replaced with one-line cross-refs.
// These tests pin (a) canonical statements still present and complete,
// (b) cross-refs in place where duplicates were, (c) old duplicate
// language removed.
// Sprint 13.1.E (2026-05-05) — Audit C6 reconciliation. PART 0 Rule E
// forbids "mera/mere" literally, but PART 9 Rule 5 + Rule 6 sanction
// "mere paas nahi hai" as the canonical honest-deflection pattern.
// Self-contradiction in spec resolved via explicit EXEMPTION clause
// in Rule E + reciprocal cross-refs in Rule 5/6. CHECK 20 deliberate
// mera/mere exclusion is now documented as the sanctioned contract.
// Sprint 13.1.F (2026-05-05) — Audit dead-rule cleanup. Verify-then-
// remove on L1-L7 surfaced 0 confirmed dead, 4 dormant, 2 actually
// alive (audit was wrong), 1 doc fix. These tests pin the audit-mark
// comments + L1/L2 preservation so future audits can't accidentally
// remove the verified-alive rules + future cleanup sprints can see
// the dormancy markers inline.
// Sprint 13.1.G (2026-05-05) — audit duplications D3-D8 cleanup.
// Verify-then-act surfaced 4 partial duplicates (D3/D4/D7/D8 — surgical
// dedup with cross-refs) and 1 audit-was-wrong (D5 — both CHECKs
// intentionally distinct, audit-mark added in checker). Tests pin the
// dedup state + cross-ref text + retained-but-marked sites so future
// edits can't silently regress.
describe('Sprint 13.1.G — D3 commission script dedup', () => {
  it('PART 8 commission script replaced with cross-ref to PART 15 canonical', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('Commission question — see PART 15 CANONICAL COMMISSION ANSWERS')
    expect(prompt).toContain('Sprint 13.1.G dedup')
    // Old PART 8 verbose script gone.
    expect(prompt).not.toContain('Commission question (Option Z — canonical answer):\nBuilder se commission — aapse nahi.')
  })

  it('PART 15 CANONICAL COMMISSION ANSWERS block intact', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('CANONICAL COMMISSION ANSWERS')
    expect(prompt).toContain('Builder se commission leta hai — aapko kuch nahi dena.')
    expect(prompt).toContain('Per-builder commission rates are confidential')
  })

  it('EXAMPLE 2/2B/2C scenario-distinct commission demos intact (audit was wrong on consolidation)', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('EXAMPLE 2 — Injection attempt')
    expect(prompt).toContain('EXAMPLE 2B — Honest commission question (NOT a leak)')
    expect(prompt).toContain('EXAMPLE 2C — Hinglish commission question')
  })
})

describe('Sprint 13.1.G — D4 OTP-ban dedup (PART 7_FLAG_ON Step 3)', () => {
  it('PART 7_FLAG_ON Step 3 OTP banned-words list cross-refs PART 0 RULE C', () => {
    const prompt = buildSystemPrompt(flagOnCtx)
    expect(prompt).toContain('OTP-language ban — see PART 0 RULE C for the canonical banned-phrases list')
    // Old verbose 5-line OTP banned list at this site is gone.
    expect(prompt).not.toContain('- "OTP bheja hai" / "OTP sent" / "OTP <digits> pe"\n- "Enter karein" / "Enter the OTP" / "verify karein" (in OTP context)\n- "Wrong OTP" / "OTP galat hai"')
  })

  it('PART 7_FLAG_ON Step 3 retains the visit-specific bans (pre-confirmation)', () => {
    const prompt = buildSystemPrompt(flagOnCtx)
    // The visit-specific bans aren't in PART 0 RULE C (which is OTP-only)
    // — they must survive at this site.
    expect(prompt).toContain('"Visit confirmed" / "Visit booked" / "Slot locked"')
  })

  it('PART 0 RULE C canonical OTP banned-phrases list intact', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('RULE C — OTP PROHIBITION')
    expect(prompt).toContain('"OTP bheja hai", "OTP sent", "Enter the OTP"')
  })
})

describe('Sprint 13.1.G — D7 EXAMPLE 21+22 WRONG SHAPE dedup', () => {
  it('EXAMPLE 21 WRONG SHAPE block replaced with cross-ref to EXAMPLE 17', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('See EXAMPLE 17 for the canonical bullet anti-pattern + MARKDOWN_ABORT explanation')
    // EXAMPLE 21 RIGHT shape (topic-specific) preserved.
    expect(prompt).toContain('EXAMPLE 21 — Amenity query')
    expect(prompt).toContain('Riviera Aspire ke amenities mein swimming pool, gym')
  })

  it('EXAMPLE 22 WRONG SHAPE block replaced with cross-ref to EXAMPLE 17', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('bullet/em-dash/numbered list shapes are forbidden for locality queries too')
    // EXAMPLE 22 RIGHT shape (topic-specific) preserved.
    expect(prompt).toContain('EXAMPLE 22 — Locality query')
    expect(prompt).toContain('Riviera Bliss ke aas-paas DPS Bopal aur Shanti Asiatic School')
  })

  it('EXAMPLE 17 (canonical bullet anti-pattern) intact', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('EXAMPLE 17 — Hinglish budget+config query')
    expect(prompt).toContain('MARKDOWN_ABORT')
  })
})

describe('Sprint 13.1.G — D8 PART 6_FLAG_ON Honest Concern dedup', () => {
  it('PART 6_FLAG_ON standalone Honest Concern shape cross-refs PART 4 canonical', () => {
    const prompt = buildSystemPrompt(flagOnCtx)
    expect(prompt).toContain('see PART 4 Rule 2/3 + Honest Concern Rules for canonical format')
  })

  it('PART 4 Honest Concern Rules canonical block intact', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('Honest Concern Rules:')
    expect(prompt).toContain('Rule 2: Every recommendation MUST include Honest Concern')
  })

  it('PART 8 template-usage Honest Concern sites preserved (not over-deduped)', () => {
    const prompt = buildSystemPrompt(baseCtx)
    // L719 + L737 are USAGES not REDEFINITIONS — retained.
    expect(prompt).toContain('⚠️ Honest Concern: [What to verify before final booking]')
    expect(prompt).toContain('⚠️ Honest Concern: [Specific gap or concern with data]')
  })
})

describe('Sprint 13.1.F — audit dead-rule verification markers', () => {
  it('L3 Re-entry loop script intact + DORMANT audit-mark present', () => {
    const prompt = buildSystemPrompt(baseCtx)
    // Original rule text preserved.
    expect(prompt).toContain('Aapka shortlist save hai.')
    expect(prompt).toContain('Kal ya next week wapas aayein')
    // Audit-mark documents dormancy reason + re-evaluation trigger.
    expect(prompt).toContain('Sprint 13.1.F audit-mark L3: DORMANT')
    expect(prompt).toContain('no "buyer leaving" detection signal')
  })

  it('L4 PART_6_FLAG_ON comparison table intact + DORMANT audit-mark present (flag-on path)', () => {
    const prompt = buildSystemPrompt(flagOnCtx)
    // Original pipe-table preserved.
    expect(prompt).toContain('| Factor       | Project A      | Project B      |')
    expect(prompt).toContain('| Possession   | Dec 2026       | Mar 2026       |')
    // Audit-mark documents flag gating + reversibility intent.
    expect(prompt).toContain('Sprint 13.1.F audit-mark L4: DORMANT')
    expect(prompt).toContain('STAGE_B_ENABLED')
  })

  it('L5 PART 11 FOLLOW-UP BUTTONS table intact + DORMANT audit-mark present', () => {
    const prompt = buildSystemPrompt(baseCtx)
    // Original frequency rules preserved.
    expect(prompt).toContain('PART 11 — FOLLOW-UP BUTTONS')
    expect(prompt).toContain('Maximum 1 set of buttons per 3 messages')
    expect(prompt).toContain('NEVER show buttons during: emotional moments')
    // Audit-mark explains why retained (CTA-frequency guidance for prose).
    expect(prompt).toContain('Sprint 13.1.F audit-mark L5: DORMANT')
    expect(prompt).toContain('CTA-frequency drift')
  })

  it('L6 PART_5_FLAG_ON Stage B trigger scripts intact + DORMANT audit-mark present (flag-on path)', () => {
    const prompt = buildSystemPrompt(flagOnCtx)
    // Original capture strategy header preserved.
    expect(prompt).toContain('PART 5 — CAPTURE STRATEGY')
    expect(prompt).toContain('Stage A — Soft Capture')
    expect(prompt).toContain('Stage B — Hard Capture (OTP required)')
    // Audit-mark.
    expect(prompt).toContain('Sprint 13.1.F audit-mark L6: DORMANT')
  })

  it('L1 PART 14 STEP 6 emotional extraction intact (audit was WRONG; rule actually alive)', () => {
    const prompt = buildSystemPrompt(baseCtx)
    // Original script preserved — audit deliverable corrected, no removal.
    expect(prompt).toContain('STEP 6 — AFTER VISIT (Emotional Extraction)')
    expect(prompt).toContain('dil se kaisa laga?')
  })

  it('L2 Scripts A/B/C uses-buyer-words pattern intact (audit was WRONG; capability concern not dead code)', () => {
    const prompt = buildSystemPrompt(baseCtx)
    // The "[their own words]" placeholder pattern preserved across Scripts.
    expect(prompt).toContain('[their own words]')
    expect(prompt).toContain('Aapne bataya tha')
  })

  it('L7 numbering-gap doc comment present near EXAMPLE 10/14 boundary', () => {
    const prompt = buildSystemPrompt(baseCtx)
    // Doc comment explains why gaps (EXAMPLE 11/12/13/19/20) are preserved.
    expect(prompt).toContain('Sprint 13.1.F audit-mark L7: numbering gaps')
    expect(prompt).toContain('INTENTIONAL')
    expect(prompt).toContain('Resequencing would break those external references')
  })
})

describe('Sprint 13.1.E — PART 0 Rule E mera/mere exemption (C6)', () => {
  it('PART 0 Rule E original forbidden list intact (not weakened)', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('RULE E — NO FIRST PERSON')
    expect(prompt).toContain('NEVER use: I, me, my, main, mera, mujhe, maine, hamara, hum.')
  })

  it('PART 0 Rule E contains EXEMPTION clause referencing PART 9 Rule 5 + Rule 6', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('EXEMPTION (Sprint 13.1.E reconciliation)')
    expect(prompt).toContain('"mere paas nahi hai"')
    expect(prompt).toContain('PART 9 Rule 5 + Rule 6')
    // Documents that CHECK 20 permits the pattern.
    expect(prompt).toContain('CHECK 20 (FIRST_PERSON_HINDI) deliberately permits')
  })

  it('PART 0 Rule E exemption preserves the outside-deflection ban', () => {
    const prompt = buildSystemPrompt(baseCtx)
    // The exemption is narrow — outside the deflection pattern,
    // "mera/mere" remain forbidden. Future edits that widen the
    // exemption to all uses would fail this assertion.
    expect(prompt).toContain('Outside the "mere paas nahi hai" deflection pattern, "mera/mere" remain forbidden')
  })

  it('PART 9 Rule 5 contains reciprocal cross-ref to PART 0 Rule E exemption', () => {
    const prompt = buildSystemPrompt(baseCtx)
    // Bidirectional contract — Rule 5 anchors back to Rule E so future
    // edits to either side see the cross-ref.
    expect(prompt).toContain('Honest missing-data fallback (non-RERA fields): "Yeh data mere paas nahi hai.')
    expect(prompt).toMatch(/mere paas nahi hai[\s\S]{1,200}see PART 0 Rule E exemption/i)
  })

  it('PART 9 Rule 6 contains reciprocal cross-ref to PART 0 Rule E exemption', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('"Delay data mere paas nahi — GRERA pe verify: [steps]"')
    // Cross-ref must follow the RIGHT example so future editors see
    // it inline with the sanctioned phrase.
    expect(prompt).toMatch(/Delay data mere paas nahi[\s\S]{1,150}see PART 0 Rule E exemption/i)
  })
})

describe('Sprint 13.1.D — D1 bullet-ban dedup', () => {
  it('PART 0 RULE A canonical bullet-ban text intact', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('RULE A — OUTPUT FORMAT')
    expect(prompt).toContain('You NEVER use bullet points')
    expect(prompt).toContain('aborts your stream mid-response')
  })

  it('PART 9 Rule 9 cross-refs PART 0 RULE A (full WRONG/RIGHT examples removed)', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('Rule 9: ZERO BULLETS EVER — see PART 0 RULE A')
    // Old WRONG example markers removed.
    expect(prompt).not.toContain('"1. Vishwanath Sarathya West')
    expect(prompt).not.toContain('Pehla option Sarathya hai. Doosra option Riviera hai.')
    // Unique English+Hinglish reinforcement preserved.
    expect(prompt).toContain('This rule applies in BOTH English and Hinglish')
  })

  it('PART 12 ADDITIONAL HARD BANS cross-refs PART 0 RULE A', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('Markdown bold / headers / bullets / numbered lists — see PART 0 RULE A')
    // Old verbose ban text removed.
    expect(prompt).not.toContain('NEVER use markdown bold (**text**) or markdown headers')
  })

  it('FINAL REMINDER [1] still reinforces bullet-ban', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('REPLACE the bulleted list with one short prose sentence')
    expect(prompt).toContain('(PART 0 Rule A)')
  })
})

describe('Sprint 13.1.D — D2 visit-holding dedup', () => {
  it('PART 7 Step 3 canonical holding-message script intact (flag-on)', () => {
    const prompt = buildSystemPrompt(flagOnCtx)
    expect(prompt).toContain('Step 3 — HOLDING MESSAGE (when buyer gives name + phone)')
    expect(prompt).toContain('[Buyer name] ka visit request note ho gaya.')
    expect(prompt).toContain('Homesty AI team aapko WhatsApp pe shortly confirm karega.')
  })

  it('PART 0 RULE B (flag-on) cross-refs PART 7 Step 3 (script body removed)', () => {
    const prompt = buildSystemPrompt(flagOnCtx)
    expect(prompt).toContain('the holding-message script defined in PART 7\nStep 3 (canonical)')
    // Old verbatim-script duplicate removed from RULE B.
    expect(prompt).not.toContain('"[Name] ka visit request note ho gaya. Project: [Project Name]. Preferred\nslot: [Day, Time]. Homesty AI team WhatsApp pe shortly confirm karega."')
  })

  it('PART 0 RULE B (flag-off) intact — DIFFERENT content, NOT a dedup target', () => {
    const prompt = buildSystemPrompt(baseCtx) // baseCtx = flag off
    expect(prompt).toContain('RULE B — VISIT BOOKING (Stage B is OFF)')
    // Flag-off path's unique content survives — it's not a duplicate.
    expect(prompt).toContain('Aapne naam aur number share kiya')
  })
})

describe('Sprint 13.1.D — D6 max-2-projects dedup', () => {
  it('PART 4 Rule 1 canonical max-2-projects rule intact', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('Rule 1: MAXIMUM 2 projects per response')
    expect(prompt).toContain('Cap also applies to project_card CARD blocks')
  })

  it('PART 0 RULE F cross-refs PART 4 Rule 1 for the cap (other RULE F content preserved)', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('for the per-response cap see PART 4 Rule 1')
    // Other RULE F content (CARD CONTRACT body) preserved.
    expect(prompt).toContain('Every time you name a specific project as a recommendation, emit')
    expect(prompt).toContain('your prose should NOT repeat any of those numbers')
    // Old standalone cap sentence removed.
    expect(prompt).not.toContain('One card per project, max two cards per response. The card')
  })

  it('PART 16 RULES 1 cross-refs PART 4 Rule 1 (single-line dedup)', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('CARD-block cap per response — see PART 4 Rule 1 (max 2)')
  })

  it('FINAL REMINDER [6] still reinforces 3-project failure mode', () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('REMOVE the weakest option. Maximum is 2 per response.')
    expect(prompt).toContain('(PART 4 Rule 1)')
  })
})

describe('Sprint 13.1.D — token reduction sanity check', () => {
  it('post-dedup prompt stays below the rolling-baseline ceiling', () => {
    // Sprint 13.1.D baseline: ~59,831 chars (HEAD 9f24a58).
    // Sprint 13.1.E added ~680 chars (PART 0 Rule E exemption clause +
    //   PART 9 Rule 5/6 cross-refs, closes audit C6). Actual: ~60,510.
    // Sprint 13.1.F added ~1,270 chars (4 dormant audit-mark HTML
    //   comments + L7 numbering-gap explanation comment, closes
    //   audit dead-rule tier verification). Actual: ~61,781.
    // Sprint 13.1.G saved ~490 chars (D3+D4+D7+D8 cross-refs replacing
    //   verbose duplicates) — net flag-off path actual: ~61,290. Ceiling
    //   HELD at 62,200 (not tightened to 61,800) per operator decision —
    //   preserves headroom for flag-state path variance buffer. Re-evaluate
    //   ceiling tightening when flag-state assumptions are formally
    //   locked (separate sprint).
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt.length).toBeLessThan(62_200)
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
