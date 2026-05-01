// Sprint 8 (2026-05-02) — bare-keyword pre-check.
//
// Buyers occasionally send a single-word vague intent without a target
// ("slot", "book", "visit", "yes", "ok", "haan", "confirm", "do it").
// Before this check existed, those inputs reached the model, the model
// either fabricated a target or returned an unfocused stream that
// tripped onError, and the buyer saw the generic
// "Dekho, kuch problem hui. Dubara try karein." with no signal what was
// missing. This pure helper decides whether to short-circuit the chat
// pipeline and reply with a sharper clarification ask before the model
// is even invoked.
//
// Pure function so it's unit-testable without spinning up the full
// /api/chat route harness (no test infra exists for that route today).

const BARE_KEYWORDS = new Set([
  'slot',
  'book',
  'visit',
  'yes',
  'ok',
  'okay',
  'haan',
  'haa',
  'confirm',
  'do it',
  'kar do',
])

export function isBareKeywordInput(input: string): boolean {
  if (!input) return false
  const trimmed = input.trim().toLowerCase()
  if (!trimmed) return false
  // Strip trailing punctuation a buyer might add ("yes!", "slot?").
  const stripped = trimmed.replace(/[.!?…,]+$/g, '').trim()
  if (!stripped) return false
  return BARE_KEYWORDS.has(stripped)
}

// Buyer-facing clarification message. Echoes the input so the buyer
// knows exactly what was unclear, names the missing context, and gives
// 2 specific next-step examples — far more useful than the legacy
// generic abort fallback.
export function bareKeywordClarification(input: string): string {
  const echo = input.trim().slice(0, 40)
  return (
    `Aapne '${echo}' bola — main pura context samjha nahi. ` +
    `Visit book karna chahte hain? Niche cards se project select karein, ` +
    `ya exact slot batayein (e.g., 'Sunday 11 AM').`
  )
}
