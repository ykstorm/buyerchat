import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  checkResponse,
  CONTACT_LEAK_PATTERN,
  BUSINESS_LEAK_PATTERN,
  MARKDOWN_PATTERN,
} from './response-checker'
import type { ClassifiedQuery } from './intent-classifier'

// Helper: build a ClassifiedQuery with sensible defaults for a given persona.
function cq(
  persona: ClassifiedQuery['persona'] = 'unknown',
  intent: ClassifiedQuery['intent'] = 'general_query'
): ClassifiedQuery {
  return { intent, persona }
}

// Fixed CTA phrase so we satisfy MISSING_CTA whenever we mention a project.
const CTA = ' Want to book a site visit to check in person?'

describe('response-checker — exported patterns', () => {
  it('CONTACT_LEAK_PATTERN matches 10-digit phone', () => {
    expect(CONTACT_LEAK_PATTERN.test('call me 9876543210')).toBe(true)
  })
  it('BUSINESS_LEAK_PATTERN matches "commission rate"', () => {
    expect(BUSINESS_LEAK_PATTERN.test('our Commission Rate is 2%')).toBe(true)
  })
  // A1 Option Z — honest builder-side commission answer must NOT fire BUSINESS_LEAK.
  // Per-builder rate disclosure still must fire.
  it('BUSINESS_LEAK_PATTERN does NOT fire on canonical honest answer (English)', () => {
    expect(BUSINESS_LEAK_PATTERN.test('Homesty AI earns from builders — not from you. Exact amount is negotiated per deal with the builder.')).toBe(false)
  })
  it('BUSINESS_LEAK_PATTERN does NOT fire on canonical honest answer (Hinglish)', () => {
    expect(BUSINESS_LEAK_PATTERN.test('Builder se commission leta hai — aapko kuch nahi dena. Amount per deal builder ke saath mutually decide hota hai.')).toBe(false)
  })
  it('BUSINESS_LEAK_PATTERN fires on per-builder rate disclosure', () => {
    expect(BUSINESS_LEAK_PATTERN.test('Venus Group commission rate is 2%')).toBe(true)
    expect(BUSINESS_LEAK_PATTERN.test('Goyal & Co. partner status is premium tier')).toBe(true)
  })
  it('MARKDOWN_PATTERN matches bold, bullets, headers', () => {
    expect(MARKDOWN_PATTERN.test('**bold**')).toBe(true)
    expect(MARKDOWN_PATTERN.test('\n- bullet')).toBe(true)
    expect(MARKDOWN_PATTERN.test('# heading')).toBe(true)
  })
  it('MARKDOWN_PATTERN ignores plain prose', () => {
    expect(MARKDOWN_PATTERN.test('plain text with dashes - like this')).toBe(false)
  })
})

describe('PROJECT_LIMIT check', () => {
  it('passes when 1 project is mentioned with 1 project_card', () => {
    const names = ['Alpha Heights', 'Beta Park', 'Gamma Greens']
    const res = checkResponse(
      `Alpha Heights looks like a solid option for your budget.${CTA}\n<!--CARD:{"type":"project_card","projectId":"a1"}-->`,
      names,
      cq()
    )
    expect(res.violations.filter(v => v.startsWith('PROJECT_LIMIT'))).toHaveLength(0)
  })

  it('flags when 3 project_card CARDs are emitted', () => {
    const names = ['Alpha Heights', 'Beta Park', 'Gamma Greens']
    const text =
      `Alpha Heights, Beta Park, and Gamma Greens all fit your budget.${CTA}\n` +
      `<!--CARD:{"type":"project_card","projectId":"a"}-->\n` +
      `<!--CARD:{"type":"project_card","projectId":"b"}-->\n` +
      `<!--CARD:{"type":"project_card","projectId":"c"}-->`
    const res = checkResponse(text, names, cq())
    expect(res.violations.some(v => v.startsWith('PROJECT_LIMIT'))).toBe(true)
  })

  it('flags when 3 distinct project names are mentioned in prose', () => {
    const names = ['Alpha Heights', 'Beta Park', 'Gamma Greens']
    const text = `Alpha Heights, Beta Park, and Gamma Greens are all worth looking at.${CTA}`
    const res = checkResponse(text, names, cq())
    expect(res.violations.some(v => v.includes('3 distinct project names'))).toBe(true)
  })
})

describe('NO_MARKDOWN check (audit mirror)', () => {
  it('plain conversational prose passes', () => {
    const res = checkResponse('Here is a plain response with no formatting tricks.', [], cq())
    expect(res.violations.some(v => v.startsWith('NO_MARKDOWN'))).toBe(false)
  })
  it('bold **text** is flagged', () => {
    const res = checkResponse('This is **important** information.', [], cq())
    expect(res.violations.some(v => v.startsWith('NO_MARKDOWN'))).toBe(true)
  })
  it('dash bullet is flagged', () => {
    const res = checkResponse('Options:\n- first option\n- second option', [], cq())
    expect(res.violations.some(v => v.startsWith('NO_MARKDOWN'))).toBe(true)
  })
  it('# header is flagged', () => {
    const res = checkResponse('# Heading\nBody text.', [], cq())
    expect(res.violations.some(v => v.startsWith('NO_MARKDOWN'))).toBe(true)
  })
  it('code fences with backticks are not flagged (no backtick pattern)', () => {
    // The markdown regex intentionally skips backticks — the model is not
    // expected to emit code fences and we want to avoid false positives.
    const res = checkResponse('Inline `code` is fine in this context.', [], cq())
    expect(res.violations.some(v => v.startsWith('NO_MARKDOWN'))).toBe(false)
  })
})

describe('LANGUAGE_MATCH check', () => {
  it('English buyer -> English response passes', () => {
    const res = checkResponse(
      'This is a reasonable and straightforward English reply about the area.',
      [],
      cq(),
      'What options do you have in south bopal?'
    )
    expect(res.violations.some(v => v.includes('LANGUAGE_MISMATCH'))).toBe(false)
  })
  it('Hinglish buyer -> Hinglish response passes', () => {
    const res = checkResponse(
      'Dekho bhai, Shela mein abhi kya hai ki builder grade C hai par price bhi kam hai. Visit kar lo.',
      [],
      cq(),
      'bhai mujhe South Bopal mein ghar dekhna hai kya options hai'
    )
    expect(res.violations.some(v => v.includes('LANGUAGE_MISMATCH'))).toBe(false)
  })
  it('Hinglish buyer -> English response is flagged', () => {
    const res = checkResponse(
      'There are two options in the area with builder grade B and reasonable possession timelines for buyers.',
      [],
      cq(),
      'bhai mujhe batao kya hai options south bopal mein kaise ghar milega'
    )
    expect(res.violations.some(v => v.includes('LANGUAGE_MISMATCH'))).toBe(true)
  })
  it('Devanagari in response without buyer cue is flagged as NON_LATIN_SCRIPT', () => {
    const res = checkResponse(
      'आपके लिए अच्छा विकल्प है Alpha Heights.',
      [],
      cq(),
      'what options do you have'
    )
    expect(res.violations.some(v => v.includes('NON_LATIN_SCRIPT'))).toBe(true)
  })
})

describe('WORD_CAP check', () => {
  // 100-word prose fixture.
  const prose100 = Array.from({ length: 100 }, (_, i) => `word${i}`).join(' ')
  const prose140 = Array.from({ length: 140 }, (_, i) => `word${i}`).join(' ')
  const prose120 = Array.from({ length: 120 }, (_, i) => `word${i}`).join(' ')

  it('100 words passes under default threshold (130)', () => {
    const res = checkResponse(prose100, [], cq())
    expect(res.violations.some(v => v.startsWith('WORD_CAP'))).toBe(false)
  })
  it('140 words is flagged under default threshold', () => {
    const res = checkResponse(prose140, [], cq())
    expect(res.violations.some(v => v.startsWith('WORD_CAP'))).toBe(true)
  })
  it('140 words passes for premium persona (cap 160)', () => {
    const res = checkResponse(prose140, [], cq('premium'))
    expect(res.violations.some(v => v.startsWith('WORD_CAP'))).toBe(false)
  })
  it('120 words is flagged for value persona (cap 110)', () => {
    const res = checkResponse(prose120, [], cq('value'))
    expect(res.violations.some(v => v.startsWith('WORD_CAP'))).toBe(true)
  })
})

describe('CARD_DISCIPLINE check', () => {
  it('1 cost_breakdown + 1 project_card is a valid pair', () => {
    const text =
      `Total for Alpha works out around 95L all-in.${CTA}\n` +
      `<!--CARD:{"type":"cost_breakdown","projectId":"a"}-->\n` +
      `<!--CARD:{"type":"project_card","projectId":"a"}-->`
    const res = checkResponse(text, ['Alpha Heights'], cq())
    expect(res.violations.some(v => v.startsWith('CARD_DISCIPLINE'))).toBe(false)
  })
  it('duplicate cost_breakdown is flagged', () => {
    const text =
      `Cost breakdown for Alpha.${CTA}\n` +
      `<!--CARD:{"type":"cost_breakdown","projectId":"a"}-->\n` +
      `<!--CARD:{"type":"cost_breakdown","projectId":"a"}-->`
    const res = checkResponse(text, ['Alpha Heights'], cq())
    expect(res.violations.some(v => v.includes('duplicate cost_breakdown'))).toBe(true)
  })
  it('3 CARDs is flagged for exceeding 2-block hard limit', () => {
    const text =
      `Overview of Alpha, Beta, Gamma.${CTA}\n` +
      `<!--CARD:{"type":"project_card","projectId":"a"}-->\n` +
      `<!--CARD:{"type":"project_card","projectId":"b"}-->\n` +
      `<!--CARD:{"type":"project_card","projectId":"c"}-->`
    const res = checkResponse(text, ['Alpha Heights', 'Beta Park', 'Gamma Greens'], cq())
    expect(res.violations.some(v => v.includes('exceeds 2-block'))).toBe(true)
  })
  it('comparison + project_card is flagged (comparison must stand alone)', () => {
    const text =
      `Quick comparison of Alpha and Beta.${CTA}\n` +
      `<!--CARD:{"type":"comparison","projectIdA":"a","projectIdB":"b"}-->\n` +
      `<!--CARD:{"type":"project_card","projectId":"a"}-->`
    const res = checkResponse(text, ['Alpha Heights', 'Beta Park'], cq())
    expect(res.violations.some(v => v.includes('comparison must stand alone'))).toBe(true)
  })
})

describe('SOFT_SELL_PHRASE check', () => {
  it('"I recommend X" is flagged', () => {
    const res = checkResponse('I recommend Alpha Heights for your needs.', [], cq())
    expect(res.violations.some(v => v.startsWith('SOFT_SELL_PHRASE'))).toBe(true)
  })
  it('"stronger fit" passes', () => {
    const res = checkResponse(
      'For your priority, Alpha is the stronger fit than the alternative in the area.',
      [],
      cq()
    )
    expect(res.violations.some(v => v.startsWith('SOFT_SELL_PHRASE'))).toBe(false)
  })
})

describe('ORDINAL_RANKING check', () => {
  it('"1st choice" is flagged', () => {
    const res = checkResponse('Alpha is your 1st choice here.', [], cq())
    expect(res.violations.some(v => v.startsWith('ORDINAL_RANKING'))).toBe(true)
  })
  it('"consider this option" passes', () => {
    const res = checkResponse('Consider this option given your priorities and timeline.', [], cq())
    expect(res.violations.some(v => v.startsWith('ORDINAL_RANKING'))).toBe(false)
  })
})

describe('MISSING_CTA check (I27 — narrowed to PART 5 preconditions)', () => {
  const projectNames = ['Alpha Heights', 'Beta Park']

  it('generic general_query with project mention does NOT fire (narrowed)', () => {
    // Pre-I27 behavior fired whenever a project was named. PART 5 says we
    // should NOT push a visit this early — intent is chit-chat and there is
    // no visit signal. The narrowed rule correctly skips.
    const res = checkResponse(
      'Alpha Heights is located in South Bopal near the main road.',
      projectNames,
      cq('unknown', 'general_query'),
      'tell me about the area'
    )
    expect(res.violations.some(v => v.startsWith('MISSING_CTA'))).toBe(false)
  })

  it('comparison_query with project CARD and no CTA FIRES', () => {
    // Classic PART 5 precondition territory — buyer is comparing, response
    // is project-anchored, but there is no visit CTA in text or card.
    const text =
      'Alpha Heights and Beta Park both fit the brief but differ on possession.\n' +
      '<!--CARD:{"type":"project_card","projectId":"a"}-->'
    const res = checkResponse(
      text,
      projectNames,
      cq('unknown', 'comparison_query'),
      'compare alpha heights and beta park'
    )
    expect(res.violations.some(v => v.startsWith('MISSING_CTA'))).toBe(true)
  })

  it('comparison_query with inline "book a visit" CTA does NOT fire', () => {
    const text =
      'Alpha Heights is stronger on delivery, Beta Park on amenities. Want to book a visit to Alpha?\n' +
      '<!--CARD:{"type":"project_card","projectId":"a"}-->'
    const res = checkResponse(
      text,
      projectNames,
      cq('unknown', 'comparison_query'),
      'compare alpha heights and beta park'
    )
    expect(res.violations.some(v => v.startsWith('MISSING_CTA'))).toBe(false)
  })

  it('comparison_query with visit_prompt CARD satisfies CTA (no fire)', () => {
    const text =
      'Alpha Heights edges Beta Park on builder delivery for your timeline.\n' +
      '<!--CARD:{"type":"visit_prompt","projectId":"a","reason":"buyer ready"}-->'
    const res = checkResponse(
      text,
      projectNames,
      cq('unknown', 'comparison_query'),
      'compare alpha heights and beta park'
    )
    expect(res.violations.some(v => v.startsWith('MISSING_CTA'))).toBe(false)
  })

  it('general_query first-buyer message does NOT fire (intent_capture stage)', () => {
    // Buyer just landed with "hi" — we have no budget, no persona, no project
    // lock-in. PART 5 explicitly forbids a visit push here.
    const res = checkResponse(
      'Hi — welcome. Alpha Heights is one of the options in Shela. What is your budget?',
      projectNames,
      cq('unknown', 'general_query'),
      'hi'
    )
    expect(res.violations.some(v => v.startsWith('MISSING_CTA'))).toBe(false)
  })

  it('visit_query with project mention, no CARD, no CTA text FIRES', () => {
    // Buyer explicitly asked to book/see. Response fails to surface a CTA or
    // project anchor card — this is exactly when MISSING_CTA should fire.
    const res = checkResponse(
      'Alpha Heights has a 2030 possession timeline and is still early in construction.',
      projectNames,
      cq('unknown', 'visit_query'),
      'can i book a site visit for alpha heights'
    )
    expect(res.violations.some(v => v.startsWith('MISSING_CTA'))).toBe(true)
  })
})

describe('FAKE_BOOKING_CLAIM check (I25)', () => {
  it('flags visit-scheduled language with no visit_prompt card', () => {
    const res = checkResponse(
      'Great news — your visit is scheduled for tomorrow at 11am. See you then!',
      [],
      cq()
    )
    expect(res.violations.some(v => v.startsWith('FAKE_BOOKING_CLAIM'))).toBe(true)
  })

  it('passes when visit-setup language is accompanied by a visit_prompt card', () => {
    const text =
      `I'll set up the visit for tomorrow — pick a time on the widget and we are good.\n` +
      `<!--CARD:{"type":"visit_prompt","projectId":"a","reason":"Buyer ready to book"}-->`
    const res = checkResponse(text, [], cq())
    expect(res.violations.some(v => v.startsWith('FAKE_BOOKING_CLAIM'))).toBe(false)
  })

  it('flags OTP-sent language even without a timestamp', () => {
    const res = checkResponse('OTP will be sent shortly to your registered number.', [], cq())
    expect(res.violations.some(v => v.startsWith('FAKE_BOOKING_CLAIM'))).toBe(true)
  })
})

describe('FABRICATED_BUILDER check (I25)', () => {
  const allowlist = ['Venus Group', 'Riviera Builders']

  it('flags a builder name not in the allowlist', () => {
    const res = checkResponse(
      'Goyal & Co. has a strong track record in the area and is worth a look.',
      ['The Planet', 'Riviera Elite'],
      cq(),
      undefined,
      allowlist
    )
    expect(res.violations.some(v => v.startsWith('FABRICATED_BUILDER'))).toBe(true)
    expect(res.violations.some(v => v.includes('Goyal'))).toBe(true)
  })

  it('passes when the mentioned builder IS in the allowlist', () => {
    const res = checkResponse(
      'Venus Group has delivered several projects in the area with consistent possession timelines.',
      ['The Planet'],
      cq(),
      undefined,
      allowlist
    )
    expect(res.violations.some(v => v.startsWith('FABRICATED_BUILDER'))).toBe(false)
  })

  it('does not flag a known project name that happens to look like a builder', () => {
    // "Riviera Elite" is a project, not a builder — regex will not pick it up
    // (no builder suffix) and even if it did, the known-project guard skips it.
    const res = checkResponse(
      'Riviera Elite is further along on construction than other options in Shela.',
      ['Riviera Elite', 'The Planet'],
      cq(),
      undefined,
      allowlist
    )
    expect(res.violations.some(v => v.startsWith('FABRICATED_BUILDER'))).toBe(false)
  })
})

describe('FABRICATED_PRICE check (O sprint)', () => {
  const knownProjectNames = ['Riviera Bliss', 'The Planet']
  const knownBuilderNames = ['Riviera Builders', 'Venus Group']

  it('flags "basic rate ₹5,700/sqft"', () => {
    const res = checkResponse(
      'For this project, basic rate is ₹5,700/sqft including all charges.',
      knownProjectNames,
      cq(),
      undefined,
      knownBuilderNames
    )
    expect(res.violations.some(v => v.startsWith('FABRICATED_PRICE'))).toBe(true)
    expect(res.violations.some(v => v.includes('per_sqft_rate'))).toBe(true)
  })

  it('does NOT fire on "Pricing on request"', () => {
    const res = checkResponse(
      'Pricing on request — share your contact and the builder will revert with the cost sheet.',
      knownProjectNames,
      cq(),
      undefined,
      knownBuilderNames
    )
    expect(res.violations.some(v => v.startsWith('FABRICATED_PRICE'))).toBe(false)
  })

  it('does NOT fire on "Still being verified" / "verify nahi kar paya"', () => {
    const res1 = checkResponse(
      'Pricing for Riviera Bliss is still being verified — cost sheet aane ke baad share karenge.',
      knownProjectNames,
      cq(),
      undefined,
      knownBuilderNames
    )
    const res2 = checkResponse(
      'Abhi tak verify nahi kar paya hu, builder ke saath confirm karke batata hu.',
      knownProjectNames,
      cq(),
      undefined,
      knownBuilderNames
    )
    expect(res1.violations.some(v => v.startsWith('FABRICATED_PRICE'))).toBe(false)
    expect(res2.violations.some(v => v.startsWith('FABRICATED_PRICE'))).toBe(false)
  })

  it('does NOT fire on numbers inside CostBreakdownCard JSON artifact', () => {
    const text =
      `Cost details below.\n` +
      `<!--CARD:{"type":"cost_breakdown","projectId":"r1","data":{"basicRate":5700,"allIn":9500000,"emi":59000,"interestRate":8.75}}-->`
    const res = checkResponse(text, knownProjectNames, cq(), undefined, knownBuilderNames)
    expect(res.violations.some(v => v.startsWith('FABRICATED_PRICE'))).toBe(false)
  })

  it('flags EMI fabrication "₹59,000/month for 20 years at 8.75% per annum" — both EMI and interest tags', () => {
    const res = checkResponse(
      'Your EMI would be around ₹59,000/month for 20 years at 8.75% per annum.',
      knownProjectNames,
      cq(),
      undefined,
      knownBuilderNames
    )
    expect(res.violations.some(v => v.includes('FABRICATED_PRICE') && v.includes('emi_amount'))).toBe(true)
    expect(res.violations.some(v => v.includes('FABRICATED_PRICE') && v.includes('interest_rate'))).toBe(true)
  })
})

describe('FABRICATED_STAT check', () => {
  const knownProjectNames = ['The Planet', 'Riviera Elite']
  const knownBuilderNames = ['Venus Group', 'Riviera Builders']

  it('flags "250 projects delivered since 1971"', () => {
    const res = checkResponse(
      'Venus Group has 250 projects delivered since 1971 across Ahmedabad.',
      knownProjectNames,
      cq(),
      undefined,
      knownBuilderNames
    )
    expect(res.violations.some(v => v.startsWith('FABRICATED_STAT'))).toBe(true)
  })

  it('flags "40 years in business"', () => {
    const res = checkResponse(
      'Riviera Builders has 40 years in business with consistent delivery.',
      knownProjectNames,
      cq(),
      undefined,
      knownBuilderNames
    )
    expect(res.violations.some(v => v.startsWith('FABRICATED_STAT'))).toBe(true)
  })

  it('flags "founded in 1995"', () => {
    const res = checkResponse(
      'Venus Group was founded in 1995 and focuses on Shela.',
      knownProjectNames,
      cq(),
      undefined,
      knownBuilderNames
    )
    expect(res.violations.some(v => v.startsWith('FABRICATED_STAT'))).toBe(true)
  })

  it('does NOT fire on plain prose', () => {
    const res = checkResponse(
      'The project has strong fundamentals and a trusted builder.',
      knownProjectNames,
      cq(),
      undefined,
      knownBuilderNames
    )
    expect(res.violations.some(v => v.startsWith('FABRICATED_STAT'))).toBe(false)
  })
})

describe('Commission Option Z (P1-S3)', () => {
  // ae656d3 shipped Option Z: builder-side payment model with no fixed rate.
  // Canonical answers MUST pass checkResponse() without firing BUSINESS_LEAK,
  // while per-builder rate disclosure MUST still fire it. These regressions
  // protect the "honest AI" positioning end-to-end (not just the regex).
  const HINGLISH = 'Builder se commission leta hai — aapko kuch nahi dena. Amount per deal builder ke saath mutually decide hota hai.'
  const ENGLISH = 'Homesty AI earns from builders — not from you. Exact amount is negotiated per deal with the builder.'

  it('canonical Hinglish commission response does NOT trigger BUSINESS_LEAK', () => {
    const res = checkResponse(HINGLISH, [], cq(), 'aap ka commission kya hai? builder ko kya dena hai mujhe?')
    expect(res.violations.some(v => v.startsWith('BUSINESS_LEAK'))).toBe(false)
  })

  it('canonical English commission response does NOT trigger BUSINESS_LEAK', () => {
    const res = checkResponse(ENGLISH, [], cq(), 'what is your commission?')
    expect(res.violations.some(v => v.startsWith('BUSINESS_LEAK'))).toBe(false)
  })

  it('builder-specific rate disclosure DOES trigger BUSINESS_LEAK', () => {
    const res = checkResponse(
      'Goyal & Co. pays us 1.8% commission rate on every deal closed.',
      [],
      cq(),
      'kitna commission lete ho?'
    )
    expect(res.violations.some(v => v.startsWith('BUSINESS_LEAK'))).toBe(true)
  })
})

describe('FAKE_VISIT_CLAIM check (P1-S1)', () => {
  it('banned phrase + visit_confirmation artifact in text → ok', () => {
    const text =
      `Visit booked for tomorrow at 11am — see you then.\n` +
      `<!--CARD:{"type":"visit_confirmation","projectId":"a","token":"HST-1234"}-->`
    const res = checkResponse(text, [], cq())
    expect(res.violations.some(v => v.startsWith('FAKE_VISIT_CLAIM'))).toBe(false)
  })

  it('banned phrase alone in text → violated', () => {
    const res = checkResponse(
      'Visit confirmed for tomorrow at 11am.',
      [],
      cq()
    )
    expect(res.violations.some(v => v.startsWith('FAKE_VISIT_CLAIM'))).toBe(true)
  })

  it('no claim phrase → ok regardless of artifact', () => {
    const res = checkResponse(
      'Visit start karte hain — slot check karte hain aur Homesty AI team WhatsApp pe confirm karega.',
      [],
      cq()
    )
    expect(res.violations.some(v => v.startsWith('FAKE_VISIT_CLAIM'))).toBe(false)
  })
})

// Sprint 1 (2026-04-29): widened FAKE_VISIT_CLAIM + new PHONE_REQUEST_IN_PROSE
// rule. With STAGE_B_ENABLED=false (current production state), the AI must
// not parrot PART 5/6/7 trigger scripts in prose. These tests assert the
// exact Image 6 hallucination strings now flag the corresponding rule.
describe('Sprint 1 — Image 6 fabrication coverage', () => {
  beforeEach(() => {
    delete process.env.STAGE_B_ENABLED
  })
  afterEach(() => {
    delete process.env.STAGE_B_ENABLED
  })

  it('FAKE_VISIT_CLAIM (flag-off) flags Image 6 exact hallucination', () => {
    const text =
      'Aapka visit request note ho gaya. Project: The Planet. Preferred slot: Sunday 11 AM.'
    const res = checkResponse(text, [], cq())
    expect(res.violations.some(v => v.startsWith('FAKE_VISIT_CLAIM'))).toBe(true)
  })

  it('FAKE_VISIT_CLAIM (flag-off) flags "request note ho gaya" without artifact', () => {
    const text = 'Rohit Patel ka visit request note ho gaya — confirm shortly.'
    const res = checkResponse(text, [], cq())
    expect(res.violations.some(v => v.startsWith('FAKE_VISIT_CLAIM'))).toBe(true)
  })

  it('FAKE_VISIT_CLAIM (flag-on) is narrower — "request note ho gaya" is allowed legitimate phrase', () => {
    process.env.STAGE_B_ENABLED = 'true'
    const text = 'Rohit Patel ka visit request note ho gaya — confirm shortly.'
    const res = checkResponse(text, [], cq())
    // With Stage B on, "request note ho gaya" is the legitimate PART 7 Step 3
    // holding message — no HST- token expected at this point.
    expect(res.violations.some(v => v.startsWith('FAKE_VISIT_CLAIM'))).toBe(false)
  })

  it('FAKE_VISIT_CLAIM still respects HST- token escape hatch (flag-off)', () => {
    const text =
      'Visit booked ✓\n<!--CARD:{"type":"visit_confirmation","projectId":"a","token":"HST-9999"}-->'
    const res = checkResponse(text, [], cq())
    expect(res.violations.some(v => v.startsWith('FAKE_VISIT_CLAIM'))).toBe(false)
  })

  it('PHONE_REQUEST_IN_PROSE flags "Mobile number share karein — calculation unlock"', () => {
    const text =
      'Exact all-in breakdown ke liye mobile number share karein — calculation unlock ho jaayegi.'
    const res = checkResponse(text, [], cq())
    expect(res.violations.some(v => v.startsWith('PHONE_REQUEST_IN_PROSE'))).toBe(true)
  })

  it('PHONE_REQUEST_IN_PROSE is disabled when STAGE_B_ENABLED=true', () => {
    process.env.STAGE_B_ENABLED = 'true'
    const text =
      'Exact all-in breakdown ke liye mobile number share karein — calculation unlock ho jaayegi.'
    const res = checkResponse(text, [], cq())
    expect(res.violations.some(v => v.startsWith('PHONE_REQUEST_IN_PROSE'))).toBe(false)
  })

  it('clean recommendation (no phone-ask, no fake claim) does NOT flag either rule', () => {
    const text =
      'Aapke budget aur Shela family requirement ke hisaab se do strong options match karte hain. Visit karna chahenge ya pehle builder ke baare mein aur jaanna hai?\n' +
      '<!--CARD:{"type":"project_card","projectId":"a"}-->'
    const res = checkResponse(text, [], cq())
    expect(res.violations.some(v => v.startsWith('FAKE_VISIT_CLAIM'))).toBe(false)
    expect(res.violations.some(v => v.startsWith('PHONE_REQUEST_IN_PROSE'))).toBe(false)
  })
})

describe('HALLUCINATION amenity allowlist (P2-CRITICAL-8 Bug #4)', () => {
  // Sentry 2026-04-27: AI correctly named real LocationData amenities
  // ("Electrotherm Park", "Shaligram Oxygen Park", "AUDA Sky City")
  // but the propertyKeywords-based hallucination check flagged "Park"-
  // suffixed names as invented projects. KNOWN_AMENITIES allowlist defuses.
  it('does NOT flag verified amenity "Electrotherm Park"', () => {
    const text = 'Electrotherm Park aur Shaligram Oxygen Park dono walking distance pe hain.'
    const res = checkResponse(text, [], cq())
    expect(res.violations.some(v => v.startsWith('HALLUCINATION'))).toBe(false)
  })

  it('does NOT flag "AUDA Sky City"', () => {
    const text = 'AUDA Sky City paas hai — open green space.'
    const res = checkResponse(text, [], cq())
    expect(res.violations.some(v => v.startsWith('HALLUCINATION'))).toBe(false)
  })

  it('STILL flags an invented "Whisper Heights" not in any list', () => {
    const text = 'Whisper Heights ek strong option hai 85L mein.'
    const res = checkResponse(text, [], cq())
    expect(res.violations.some(v => v.startsWith('HALLUCINATION'))).toBe(true)
  })
})

describe('OTP_FABRICATION check (P2-CRITICAL-7 Bug #1)', () => {
  // Live smoke test 2026-04-27: model fabricated "OTP bheja hai 9999 pe" then
  // looped on "Kuch problem hui — dubara try karein" when buyer entered digits.
  // The model has NO tool to send or verify OTPs. Any phrase that simulates
  // an OTP send/verify flow is a fabrication and must be flagged.
  it('flags "OTP bheja hai 9999 pe"', () => {
    const res = checkResponse('OTP bheja hai 9999 pe. Enter karein confirm karne ke liye.', [], cq())
    expect(res.violations.some(v => v.startsWith('OTP_FABRICATION'))).toBe(true)
  })

  it('flags "Wrong OTP" / loop trap phrases', () => {
    const res1 = checkResponse('Wrong OTP — please try again.', [], cq())
    const res2 = checkResponse('OTP galat hai — dubara enter karein.', [], cq())
    expect(res1.violations.some(v => v.startsWith('OTP_FABRICATION'))).toBe(true)
    expect(res2.violations.some(v => v.startsWith('OTP_FABRICATION'))).toBe(true)
  })

  it('does NOT fire on the legal holding-message language', () => {
    // The PART 7 Step 3 holding message must pass — it explicitly avoids OTP
    // framing and just acknowledges the request. This is the ONLY response shape
    // allowed when buyer types name+phone.
    const text =
      'Rohit Patel ka visit request note ho gaya. Project: The Planet. Preferred slot: Sunday 11 AM.\n\n' +
      'Homesty AI team aapko WhatsApp pe shortly confirm karega. Tab tak site pe directly koi commitment mat karein.'
    const res = checkResponse(text, [], cq())
    expect(res.violations.some(v => v.startsWith('OTP_FABRICATION'))).toBe(false)
  })
})

describe('PRICE_FABRICATION check (Sprint 4, 2026-04-30)', () => {
  // Image 1 root cause: AI invented exact ₹/sqft + total + EMI + interest for
  // "The Planet" while the cost-breakdown widget showed "Pricing being verified."
  // Cross-contamination from Vishwanath Sarathya West's verified ₹4,000/sqft
  // (in RAG context) substituted as placeholder. PART 15 lock #7 forbids this
  // in prompt; CHECK 19 catches it programmatically.
  const knownNames = ['The Planet', 'Vishwanath Sarathya West']

  it('flags ₹/sqft near unverified project name (Image 1 string)', () => {
    const text = 'The Planet 3BHK ka basic rate ₹4,000/sqft hai based on Shela rates.'
    const res = checkResponse(text, knownNames, cq(), undefined, [], ['The Planet'])
    expect(res.violations.some(v => v.startsWith('PRICE_FABRICATION'))).toBe(true)
  })

  it('flags EMI + interest near unverified project name (Image 1 EMI string)', () => {
    const text = 'The Planet pe EMI around ₹48k/month for 20 years comes out reasonable.'
    const res = checkResponse(text, knownNames, cq(), undefined, [], ['The Planet'])
    expect(res.violations.some(v => v.startsWith('PRICE_FABRICATION'))).toBe(true)
  })

  it('does NOT fire when verified project quotes its own price', () => {
    // Vishwanath Sarathya West has minPrice > 0, so it is NOT in the unverified
    // list. Quoting its rate is legitimate.
    const text = 'Vishwanath Sarathya West ka rate ₹4,000/sqft hai — verified pricing.'
    const res = checkResponse(text, knownNames, cq(), undefined, [], ['The Planet'])
    expect(res.violations.some(v => v.startsWith('PRICE_FABRICATION'))).toBe(false)
  })

  it('does NOT fire on general market commentary not anchored to an unverified project', () => {
    // No unverified project name within 200 chars of the price band — should pass.
    const text = 'Shela mein 3BHK generally ₹4,000-5,800/sqft range mein milte hain — area dependent.'
    const res = checkResponse(text, knownNames, cq(), undefined, [], ['The Planet'])
    expect(res.violations.some(v => v.startsWith('PRICE_FABRICATION'))).toBe(false)
  })

  it('does NOT fire on the correct honest deflection (no numbers)', () => {
    const text = 'The Planet ka exact pricing abhi confirm ho raha hai — cost sheet aane ke baad share karunga.'
    const res = checkResponse(text, knownNames, cq(), undefined, [], ['The Planet'])
    expect(res.violations.some(v => v.startsWith('PRICE_FABRICATION'))).toBe(false)
  })
})

// Sprint 13.1.B (2026-05-05) — CHECK 20 FIRST_PERSON_HINDI.
// Closes audit C3: PART 0 Rule E forbids first-person Hindi but the
// rule was structurally unenforceable until now (PART 14 emotional
// scripts violated it openly + zero checker detection). With CHECK 20
// in place, future regressions surface in Sentry within seconds.
//
// Pattern strategy is conservative — catches unambiguous verb forms
// (X-ta hoon, karunga/karungi) + bare pronouns (mujhe/maine) +
// "main + verb" combinations. Deliberately skips bare "mera/mere"
// because the prompt itself instructs "mere paas nahi hai" as the
// canonical missing-data deflection — separate audit (C6) — flooding
// Sentry on every honest fallback would defeat the signal.
describe('CHECK 20 — FIRST_PERSON_HINDI (Sprint 13.1.B)', () => {
  it('catches "main samajhta hoon" (the most common offender)', () => {
    const res = checkResponse('Main samajhta hoon aap kya chahte hain.', [], cq())
    expect(res.violations.some(v => v.startsWith('FIRST_PERSON_HINDI'))).toBe(true)
  })

  it('catches bare "samajhta hoon" without preceding "main"', () => {
    const res = checkResponse('Samajhta hoon family pressure hai.', [], cq())
    expect(res.violations.some(v => v.startsWith('FIRST_PERSON_HINDI'))).toBe(true)
  })

  it('catches "bolta hoon"', () => {
    const res = checkResponse('Seedha bolta hoon — option A better hai.', [], cq())
    expect(res.violations.some(v => v.startsWith('FIRST_PERSON_HINDI'))).toBe(true)
  })

  it('catches "karunga" future tense', () => {
    const res = checkResponse('Visit verify karunga aapke liye.', [], cq())
    expect(res.violations.some(v => v.startsWith('FIRST_PERSON_HINDI'))).toBe(true)
  })

  it('catches "karungi" future tense (feminine)', () => {
    const res = checkResponse('Detail share karungi.', [], cq())
    expect(res.violations.some(v => v.startsWith('FIRST_PERSON_HINDI'))).toBe(true)
  })

  it('catches "mujhe" pronoun', () => {
    const res = checkResponse('Mujhe lagta hai yeh option better hai.', [], cq())
    expect(res.violations.some(v => v.startsWith('FIRST_PERSON_HINDI'))).toBe(true)
  })

  it('catches "maine" pronoun', () => {
    const res = checkResponse('Maine 250+ projects analyze kiye hain.', [], cq())
    expect(res.violations.some(v => v.startsWith('FIRST_PERSON_HINDI'))).toBe(true)
  })

  it('PASSES "Homesty AI" third-person reference', () => {
    const res = checkResponse('Homesty AI aapko honest analysis deta hai.', [], cq())
    expect(res.violations.some(v => v.startsWith('FIRST_PERSON_HINDI'))).toBe(false)
  })

  it('PASSES no-self-reference imperative form (the rewrite pattern)', () => {
    const res = checkResponse('Honest review: Riviera Bliss premium hai but possession 2029 mein hai.', [], cq())
    expect(res.violations.some(v => v.startsWith('FIRST_PERSON_HINDI'))).toBe(false)
  })

  it('PASSES English-only response (no Hindi at all)', () => {
    const res = checkResponse('Welcome to Homesty AI — honest property intelligence for South Bopal.', [], cq())
    expect(res.violations.some(v => v.startsWith('FIRST_PERSON_HINDI'))).toBe(false)
  })

  it('PASSES sanctioned "mere paas nahi hai" honesty fallback (Rule 5/6)', () => {
    // The prompt instructs this as the canonical missing-data answer —
    // CHECK 20 deliberately does NOT match "mera/mere" to avoid Sentry
    // flooding on every honest fallback. (Future audit C6 may reconcile.)
    const res = checkResponse('Yeh data mere paas nahi hai. Site visit pe directly puchho.', [], cq())
    expect(res.violations.some(v => v.startsWith('FIRST_PERSON_HINDI'))).toBe(false)
  })

  it('PASSES third-person verb forms (X-ta hai/hain, not hoon)', () => {
    const res = checkResponse('Builder commission leta hai — aap ko kuch nahi dena.', [], cq())
    expect(res.violations.some(v => v.startsWith('FIRST_PERSON_HINDI'))).toBe(false)
  })

  it('does NOT match English "main" (e.g., "main thing")', () => {
    const res = checkResponse('The main thing to verify is RERA approval.', [], cq())
    expect(res.violations.some(v => v.startsWith('FIRST_PERSON_HINDI'))).toBe(false)
  })
})

// Sprint 13.1.B PART 14 cleanliness — assert system-prompt has no
// first-person Hindi remaining in Scripts B/D/E/F (regression guard
// for the 6 rewritten lines). Mirrors response-checker pattern but at
// the source level — caught at test time, not just runtime.
describe('Sprint 13.1.B — PART 14 Scripts post-rewrite cleanliness', () => {
  it('PART 14 emotional scripts contain no first-person Hindi verb forms', async () => {
    const { buildSystemPrompt } = await import('./system-prompt')
    const prompt = buildSystemPrompt({
      projects: [],
      localities: [],
      infrastructure: [],
      dataAsOf: '2026-05-05',
    })
    // Locate Script A start to end of "WHY THIS WORKS" — that's the
    // window where Scripts A-F live. Assert no offending phrases remain.
    const start = prompt.indexOf('Script A — Wife / Partner Preference Case')
    const end = prompt.indexOf('STEP 5 — VISIT PUSH')
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    const window = prompt.slice(start, end)
    expect(window).not.toContain('Main samajhta hoon')
    expect(window).not.toContain('seedha bolta hoon')
    expect(window).not.toContain('Seedha bolta hoon')
    expect(window).not.toContain('push nahi karunga')
    // Replacement phrases ARE present.
    expect(window).toContain('Seedhi baat')
    expect(window).toContain('Aap kya chahte hain — yeh clear hai')
  })
})
