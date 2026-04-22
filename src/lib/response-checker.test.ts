import { describe, it, expect } from 'vitest'
import {
  checkResponse,
  CONTACT_LEAK_PATTERN,
  BUSINESS_LEAK_PATTERN,
  MARKDOWN_PATTERN,
} from './response-checker'
import type { ClassifiedQuery } from './intent-classifier'

// Helper: build a ClassifiedQuery with sensible defaults for a given persona.
function cq(persona: ClassifiedQuery['persona'] = 'unknown'): ClassifiedQuery {
  return { intent: 'general_query', persona }
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
