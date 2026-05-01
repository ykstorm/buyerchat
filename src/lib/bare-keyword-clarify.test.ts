import { describe, it, expect } from 'vitest'
import {
  isBareKeywordInput,
  bareKeywordClarification,
} from './bare-keyword-clarify'

describe('isBareKeywordInput (Sprint 8 — bare-keyword pre-check)', () => {
  it('matches each canonical bare keyword', () => {
    for (const kw of [
      'slot',
      'book',
      'visit',
      'yes',
      'ok',
      'okay',
      'haan',
      'confirm',
      'do it',
      'kar do',
    ]) {
      expect(isBareKeywordInput(kw)).toBe(true)
    }
  })

  it('matches case-insensitively', () => {
    expect(isBareKeywordInput('Slot')).toBe(true)
    expect(isBareKeywordInput('YES')).toBe(true)
    expect(isBareKeywordInput('Confirm')).toBe(true)
  })

  it('strips trailing punctuation a buyer might add', () => {
    expect(isBareKeywordInput('yes!')).toBe(true)
    expect(isBareKeywordInput('slot?')).toBe(true)
    expect(isBareKeywordInput('book.')).toBe(true)
  })

  it('does NOT match empty or whitespace-only input', () => {
    expect(isBareKeywordInput('')).toBe(false)
    expect(isBareKeywordInput('   ')).toBe(false)
    expect(isBareKeywordInput('\n\t')).toBe(false)
  })

  it('does NOT match multi-keyword phrases that include legitimate context', () => {
    // "book a visit" has multiple tokens — buyer is providing context, route
    // it to the model normally so PART 7 visit-booking flow can handle it.
    expect(isBareKeywordInput('book a visit')).toBe(false)
    expect(isBareKeywordInput('yes I want to book')).toBe(false)
    expect(isBareKeywordInput('confirm the slot')).toBe(false)
    expect(isBareKeywordInput('slot for sunday')).toBe(false)
  })

  it('does NOT match keyword followed by a project name', () => {
    expect(isBareKeywordInput('book Riviera Bliss')).toBe(false)
    expect(isBareKeywordInput('visit The Planet')).toBe(false)
  })

  it('does NOT match unrelated single words', () => {
    expect(isBareKeywordInput('hello')).toBe(false)
    expect(isBareKeywordInput('namaste')).toBe(false)
    expect(isBareKeywordInput('budget')).toBe(false)
    expect(isBareKeywordInput('shela')).toBe(false)
  })
})

describe('bareKeywordClarification message shape', () => {
  it('echoes the buyer input verbatim', () => {
    const msg = bareKeywordClarification('slot')
    expect(msg).toContain("'slot'")
  })

  it('asks for the missing target with two specific next-step examples', () => {
    const msg = bareKeywordClarification('slot')
    expect(msg.toLowerCase()).toMatch(/visit book/)
    expect(msg.toLowerCase()).toMatch(/select|cards|exact slot/)
  })

  it('does NOT contain the legacy generic copy', () => {
    const msg = bareKeywordClarification('yes')
    expect(msg.toLowerCase()).not.toContain('kuch problem hui')
    expect(msg.toLowerCase()).not.toContain('dubara try karein')
  })

  it('truncates obnoxiously long inputs at 40 chars in the echo', () => {
    const longInput = 'a'.repeat(200)
    const msg = bareKeywordClarification(longInput)
    // The echo segment is the FIRST quoted span — non-greedy match.
    // The message later contains a second quoted span (the "Sunday 11 AM"
    // example) so a greedy regex would span the whole message.
    const match = msg.match(/'(.+?)'/)
    expect(match).not.toBeNull()
    expect((match![1] ?? '').length).toBeLessThanOrEqual(40)
  })
})
