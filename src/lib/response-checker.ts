// CONTACT_LEAK, BUSINESS_LEAK, and NO_MARKDOWN detection run in real time via
// `onChunk` inside `src/app/api/chat/route.ts` — the stream is hard-aborted
// mid-response when a pattern matches a delta, so the buyer never sees the
// leaked / malformatted content.
//
// The remaining checks in checkResponse() still run post-stream as audit-only:
// by the time they catch a violation the tokens have already been sent. To
// harden additional checks, integrate them into the same onChunk hook or a
// proxy-based content filter.

import type { ClassifiedQuery } from './intent-classifier'
import * as Sentry from '@sentry/nextjs'

// Exported for real-time streaming checks in /api/chat
export const CONTACT_LEAK_PATTERN = /\d{10}|\+91\s?\d{10}|\d{3}[-\s]\d{3}[-\s]\d{4}|@[a-zA-Z0-9]+\.[a-zA-Z]{2,}/
// Exported for real-time streaming checks in /api/chat
export const BUSINESS_LEAK_PATTERN = /commission rate|partner status|commission %/i
// Exported for real-time streaming checks in /api/chat — PART 8/PART 2 rule:
// NO markdown bold / headers / bullets. Intentionally does NOT match code fences
// (``` backticks), which the model is not expected to emit.
// Covers: line-leading dash/star/plus bullets, `#`–`######` headers,
// `**bold**` emphasis, `__underline__` emphasis.
export const MARKDOWN_PATTERN = /(?:^|\n)\s*[-*+]\s|^#{1,6}\s|\*\*[^*]+\*\*|__[^_]+__/m

export interface CheckResult {
  passed: boolean
  violations: string[]
}

const KNOWN_AREAS = [
  'prahlad nagar', 'satellite', 'south bopal', 'shela', 'bopal',
  'vastrapur', 'maninagar', 'gota', 'chandkheda', 'new ranip',
  'ahmedabad', 'gujarat', 'india', 'magicbricks', 'buyerchat'
]

// KNOWN_AMENITIES — verified real names from LocationData / RAG knowledge base.
// Used to suppress HALLUCINATION false positives: when the model surfaces a
// real amenity name that happens to share a propertyKeywords suffix ("Park",
// "Garden", "Heights"), it must NOT be flagged as an invented project.
// Names below appear verbatim in seed data, embed backfill, or operator-
// reviewed location docs. Lower-cased on compare. Add new verified names here
// as they become canonical (do NOT add unverified guesses).
const KNOWN_AMENITIES = [
  // Hospitals
  'krishna shalby', 'krishna shalby hospital', 'saraswati hospital',
  'tej hospital', 'hcg', 'apollo international', 'cims',
  // Schools / colleges
  'dps bopal', 'dps east', 'shanti asiatic', 'shanti asiatic school',
  'mica', 'anant national university', 'nirma university',
  // Parks / open spaces (the Sentry false-positive class)
  'electrotherm park', 'shaligram oxygen park', 'auda sky city',
  'auda garden', 'bopal lake park',
  // Malls / retail
  'dmart', 'trp mall', 'sobo centre', 'sobo center', 'palladium',
  // Clubs
  'club o7', 'gala gymkhana', 'karnavati club', 'rajpath club',
  // Transit
  'bopal brts', 'iskcon cross roads',
  // Temples
  'shri bhidbhanjan hanumanji', 'iskcon temple',
  // Banks (named branches surface as <Brand> Bank)
  'hdfc', 'icici', 'sbi', 'axis', 'kotak', 'union bank',
  'yes bank', 'bob', 'bank of baroda',
]

// Lexical markers used by the language-match check. Not a real language
// detector — just a cheap hint. If buyer density >> response density we
// assume the model drifted back to English.
const HINGLISH_MARKERS = new Set([
  'hai', 'kya', 'kar', 'kaise', 'kaha', 'mein', 'ka', 'ki', 'ke',
  'ko', 'se', 'par', 'bhi', 'nahi', 'haan', 'dekh', 'dekho', 'sach',
  'bhai', 'bas', 'sirf', 'matra'
])

function hinglishDensity(text: string): number {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 0
  const hits = words.filter(w => {
    const stripped = w.replace(/[^a-z]/g, '')
    return HINGLISH_MARKERS.has(stripped)
  }).length
  return hits / words.length
}

// Persona-aware word cap thresholds. Default from PART 6 rule
// ("~100 WORDS MAX") with headroom for natural variance; premium buyers
// tolerate longer spec-heavy replies, value buyers want terse.
function wordCapFor(persona: ClassifiedQuery['persona']): number {
  if (persona === 'premium') return 160
  if (persona === 'value') return 110
  return 130
}

// Parse CARD JSON payloads out of the response. Silently skips malformed
// JSON so a bad single card never blocks the rest of the check.
interface ParsedCard {
  type: string
  projectId?: string
  projectIdA?: string
  projectIdB?: string
}

function parseCards(text: string): ParsedCard[] {
  const cards: ParsedCard[] = []
  const re = /<!--CARD:(\{[\s\S]*?\})-->/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(m[1]) as ParsedCard
      if (parsed && typeof parsed.type === 'string') cards.push(parsed)
    } catch {
      // ignore malformed card JSON
    }
  }
  return cards
}

// Valid card configurations from PART 15 / PART 8:
//   - 1 project_card alone
//   - 2 project_card alone (alternatives pivot)
//   - 1 comparison alone
//   - 1 cost_breakdown [+ 1 project_card]
//   - 1 visit_prompt [+ 1 project_card]
//   - 1 builder_trust [+ 1 project_card]
// Anything else is flagged as CARD_DISCIPLINE violation. The 2-total cap
// is a separate failure tag so the admin can see which rule fired.
function checkCardDiscipline(cards: ParsedCard[]): string[] {
  const violations: string[] = []
  if (cards.length === 0) return violations

  if (cards.length > 2) {
    violations.push(`CARD_DISCIPLINE: ${cards.length} CARDs exceeds 2-block hard limit`)
  }

  const counts: Record<string, number> = {}
  for (const c of cards) counts[c.type] = (counts[c.type] ?? 0) + 1

  const types = Object.keys(counts)
  const pc = counts['project_card'] ?? 0
  const cmp = counts['comparison'] ?? 0
  const cost = counts['cost_breakdown'] ?? 0
  const visit = counts['visit_prompt'] ?? 0
  const trust = counts['builder_trust'] ?? 0

  // Duplicates of non-project_card types are never allowed.
  for (const t of ['comparison', 'cost_breakdown', 'visit_prompt', 'builder_trust']) {
    if ((counts[t] ?? 0) > 1) {
      violations.push(`CARD_DISCIPLINE: duplicate ${t} card (${counts[t]} found)`)
    }
  }

  // Reject ambiguous combos. project_card may pair with cost/visit/trust
  // (one of them), but comparison must stand alone, and cost/visit/trust
  // must not co-occur with each other.
  const specialtyCount = (cmp > 0 ? 1 : 0) + (cost > 0 ? 1 : 0) + (visit > 0 ? 1 : 0) + (trust > 0 ? 1 : 0)
  if (cmp > 0 && pc > 0) {
    violations.push('CARD_DISCIPLINE: comparison must stand alone (no project_card alongside)')
  }
  if (specialtyCount > 1 && !(specialtyCount === 1)) {
    // Two different specialty types together (e.g., cost_breakdown + visit_prompt)
    const specialties = [
      cmp > 0 && 'comparison',
      cost > 0 && 'cost_breakdown',
      visit > 0 && 'visit_prompt',
      trust > 0 && 'builder_trust',
    ].filter(Boolean) as string[]
    if (specialties.length > 1) {
      violations.push(`CARD_DISCIPLINE: multiple specialty cards (${specialties.join(' + ')})`)
    }
  }

  // Sanity — unknown card type
  const KNOWN_TYPES = new Set(['project_card', 'comparison', 'cost_breakdown', 'visit_prompt', 'builder_trust'])
  const unknown = types.filter(t => !KNOWN_TYPES.has(t))
  if (unknown.length > 0) {
    violations.push(`CARD_DISCIPLINE: unknown card type(s) ${unknown.join(', ')}`)
  }

  return violations
}

export function checkResponse(
  aiResponse: string,
  knownProjectNames: string[],
  classified: ClassifiedQuery,
  buyerMessage?: string,
  knownBuilderNames: string[] = []
): CheckResult {
  const violations: string[] = []
  const lower = aiResponse.toLowerCase()

  // CHECK 1 — Hallucination: project name in response not in database
  const propertyKeywords = [
    'phase', 'heights', 'park', 'residency', 'greens', 'tower',
    'garden', 'ville', 'enclave', 'plaza', 'square', 'valley',
    'nagar', 'homes', 'estate', 'manor', 'suites', 'lifestyle', 'living'
  ]
  const candidates = aiResponse.match(/[A-Z][a-zA-Z]+(\s[A-Z][a-zA-Z]+){1,4}/g) ?? []
  const hallucinated = candidates.filter(name => {
    const l = name.toLowerCase()
    const looksLikeProject = propertyKeywords.some(k => l.includes(k))
    const isKnown = knownProjectNames.some(p => p.toLowerCase() === l)
    const isKnownArea = KNOWN_AREAS.some(a => l.includes(a))
    // Allowlist real LocationData amenity names that share propertyKeywords
    // suffixes (e.g., "Electrotherm Park", "Shaligram Oxygen Park",
    // "AUDA Sky City"). False-positive class observed in Sentry on
    // 2026-04-27 (P2-CRITICAL-8 Bug #4). Match by exact or substring on
    // either direction so plural/abbreviated forms also pass.
    const isKnownAmenity = KNOWN_AMENITIES.some(a => l === a || l.includes(a) || a.includes(l))
    return looksLikeProject && !isKnown && !isKnownArea && !isKnownAmenity
  })
  if (hallucinated.length > 0) {
    violations.push(`HALLUCINATION: invented names — ${hallucinated.join(', ')}`)
  }

  // CHECK 2 — MISSING_CTA (audit-only, narrowed in I27).
  //
  // PART 5 of the system prompt forbids pushing a visit until ALL FOUR of:
  //   1. Buyer has seen at least 2 project disclosures (layers 1–3 done)
  //   2. Purpose AND budget are known
  //   3. At least 2 projects compared in narrative
  //   4. Buyer expressed positive interest — not just browsing
  // The previous implementation fired whenever ANY project was mentioned
  // without a CTA phrase, which contradicts PART 5 and caused ~2/hr false
  // positives in production Sentry. The narrowed rule approximates PART 5's
  // gating with two necessary-but-not-sufficient signals:
  //   (a) intent is a project-facing one (project / comparison / visit),
  //       never intent_capture / qualification-stage chit-chat;
  //   (b) the buyer's current message shows visit readiness, OR the response
  //       is clearly anchored on a specific project (has a project-type
  //       CARD block).
  // When both are true but the response omits a visit CTA, we flag.
  const ctaIntents = new Set<ClassifiedQuery['intent']>([
    'comparison_query',
    'visit_query',
    'builder_query',
  ])
  const mentionsProject = knownProjectNames.some(p =>
    p && lower.includes(p.toLowerCase())
  )
  // Detect project-anchored response: any CARD that references a specific
  // project (project_card / cost_breakdown / visit_prompt / builder_trust all
  // qualify; comparison stands alone but still signals project anchoring).
  const projectAnchorCard = /<!--CARD:\{[^}]*"type":"(?:project_card|cost_breakdown|visit_prompt|builder_trust|comparison)"/.test(aiResponse)
  // Detect visit-readiness signal from the buyer's own message. Covers
  // English ("visit", "schedule", "book", "see") and common Hinglish
  // phrasings ("dikha", "dekhne jaana"). Cheap heuristic, not a model call.
  const visitSignal = !!buyerMessage && /(visit|schedule|book|tour|see the project|dikha|dekhne|ghar dekhna)/i.test(buyerMessage)
  const intentIsProjectFacing = ctaIntents.has(classified.intent)
  const preconditionsPlausible =
    intentIsProjectFacing && (visitSignal || projectAnchorCard)
  const hasCTA = lower.includes('site visit') ||
                 lower.includes('book a visit') ||
                 lower.includes('schedule a visit') ||
                 lower.includes('30 seconds') ||
                 /<!--CARD:\{[^}]*"type":"visit_prompt"/.test(aiResponse)
  if (preconditionsPlausible && mentionsProject && !hasCTA) {
    violations.push('MISSING_CTA: project-anchored response without visit CTA')
  }

  // CHECK 3 — Contact data leak: phone number or email in response
  // NOTE: This audit-only branch mirrors CONTACT_LEAK_PATTERN above so
  // post-stream logging still works if the onChunk guard is ever bypassed.
  if (/\d{10}|\+91\s?\d{10}|\d{3}[-\s]\d{3}[-\s]\d{4}/.test(aiResponse)) {
    violations.push('CONTACT_LEAK: phone number pattern detected — CRITICAL')
  }
  if (/@[a-zA-Z0-9]+\.[a-zA-Z]{2,}/.test(aiResponse)) {
    violations.push('CONTACT_LEAK: email address pattern detected — CRITICAL')
  }

  // CHECK 3b — Business data leak
  const businessLeakWords = ['commission rate', 'partner status', 'commission %']
  if (businessLeakWords.some(w => lower.includes(w))) {
    violations.push('BUSINESS_LEAK: commission or partner status mentioned — CRITICAL')
  }

  // CHECK 4 — Investment guarantee: legally problematic language
  const guaranteeWords = [
    'guaranteed', 'will definitely', 'certain to appreciate',
    'assured return', '100% safe', 'no risk', 'cannot lose',
    'promise you', 'guaranteed returns'
  ]
  if (guaranteeWords.some(w => lower.includes(w))) {
    violations.push('INVESTMENT_GUARANTEE: unqualified financial promise in response')
  }

  // CHECK 4b — Persona-aware guarantee tightening.
  if (classified.persona === 'investor') {
    const softGuarantees = [
      'sure to grow', 'sure to appreciate', 'solid returns',
      'will appreciate', 'guaranteed yield', 'safe bet'
    ]
    if (softGuarantees.some(w => lower.includes(w))) {
      violations.push('INVESTMENT_GUARANTEE: soft-sell yield language to investor persona')
    }
  }

  // CHECK 5 — Out-of-area response
  const outOfArea = [
    'satellite', 'prahlad nagar', 'bopal gaon', 'vastrapur',
    'maninagar', 'new ranip', 'chandkheda'
  ]
  const mentionedOutOfArea = outOfArea.filter(a => lower.includes(a))
  if (mentionedOutOfArea.length > 0) {
    violations.push(`OUT_OF_AREA: mentioned ${mentionedOutOfArea.join(', ')}`)
  }

  // CHECK 6 — PROJECT_LIMIT (audit-only).
  // PART 5 line ~163 / PART 15 line ~370: never mention more than 2 projects
  // and never emit more than 2 project-card CARDs per response.
  // Mid-stream counting is unreliable, so this runs post-stream only.
  const allCards = parseCards(aiResponse)
  const projectCardCount = allCards.filter(c => c.type === 'project_card').length
  const mentionedProjectNames = knownProjectNames.filter(p =>
    p && lower.includes(p.toLowerCase())
  )
  if (projectCardCount > 2) {
    violations.push(`PROJECT_LIMIT: ${projectCardCount} project_card CARDs exceeds 2-project limit`)
  }
  if (mentionedProjectNames.length > 2) {
    violations.push(`PROJECT_LIMIT: ${mentionedProjectNames.length} distinct project names mentioned (cap 2)`)
  }

  // CHECK 7 — NO_MARKDOWN (audit mirror; onChunk aborts live streams).
  // Protects against markdown drift even when onChunk is bypassed.
  if (MARKDOWN_PATTERN.test(aiResponse)) {
    violations.push('NO_MARKDOWN: markdown bullets / bold / headers detected')
  }

  // CHECK 8 — LANGUAGE_MATCH (audit-only).
  // PART 13 / lines ~125-140 / ~295-299: match buyer's language. Real
  // failure mode is buyer Hinglish -> model replies pure English.
  // Also check for accidental Gujarati/Devanagari leaking when buyer
  // never used non-Latin script — flag as NON_LATIN_SCRIPT separately.
  if (buyerMessage) {
    const buyerDensity = hinglishDensity(buyerMessage)
    const responseDensity = hinglishDensity(aiResponse)
    if (buyerDensity > 0.15 && responseDensity < 0.05) {
      violations.push(
        `LANGUAGE_MISMATCH: buyer wrote Hinglish (density ${(buyerDensity * 100).toFixed(0)}%) ` +
        `but response dropped to English (density ${(responseDensity * 100).toFixed(0)}%)`
      )
    }
  }
  // Non-Latin script in response: Devanagari U+0900-U+097F or Gujarati U+0A80-U+0AFF.
  // Only flag if the buyer did NOT use that script — matching the buyer's own
  // Devanagari input is explicitly allowed by PART 10.
  const buyerHasNonLatin = !!buyerMessage && /[ऀ-ॿ઀-૿]/.test(buyerMessage)
  if (!buyerHasNonLatin && /[ऀ-ॿ઀-૿]/.test(aiResponse)) {
    violations.push('NON_LATIN_SCRIPT: response contains Devanagari / Gujarati characters with no buyer cue')
  }

  // CHECK 9 — WORD_CAP (audit-only, persona-aware).
  // PART 6 line ~164: "~100 WORDS MAX".
  // Strip CARD blocks before counting — they are metadata, not buyer-facing prose.
  const prose = aiResponse.replace(/<!--CARD:[\s\S]*?-->/g, '').trim()
  const wordCount = prose.split(/\s+/).filter(Boolean).length
  const cap = wordCapFor(classified.persona)
  if (wordCount > cap) {
    violations.push(`WORD_CAP: ${wordCount} words exceeds ${cap}-word cap for persona=${classified.persona}`)
  }

  // CHECK 10 — CARD_DISCIPLINE (audit-only).
  // PART 15 ~line 370: max 2 CARD blocks, one per type with a small set of
  // valid combinations. Unknown types and bad combos are flagged individually.
  violations.push(...checkCardDiscipline(allCards))

  // CHECK 11 — SOFT_SELL_PHRASE (audit-only, HIGH drift).
  // PART 8 line ~287: "NEVER say 'I recommend X'".
  if (/\b(i recommend|i suggest|you should (?:choose|go for|pick)|best project|top choice|ideal for you)\b/i.test(aiResponse)) {
    violations.push('SOFT_SELL_PHRASE: recommendation language ("I recommend" / "best project" / "ideal for you")')
  }

  // CHECK 12 — ORDINAL_RANKING (audit-only, HIGH drift).
  // PART 7 RULE 3: "Never rank projects 1st/2nd/3rd".
  if (/\b(1st|2nd|3rd|first choice|second choice|third choice|number one|#1 pick)\b/i.test(aiResponse)) {
    violations.push('ORDINAL_RANKING: numbered/ordinal ranking language')
  }

  // CHECK 13 — FAKE_BOOKING_CLAIM (audit-only, I25).
  // PART 8.5 rules 1 & 2: never claim a visit/booking/OTP is confirmed unless
  // a visit_prompt CARD is emitted in the SAME response. Patterns below target
  // the confirmation-language drift that caused the Apr-2026 fake-booking
  // incident. Post-stream only — per I18-final, only leak/safety justifies
  // mid-stream abort.
  const FAKE_BOOKING_PATTERNS: Array<{ re: RegExp; label: string }> = [
    { re: /(visit|appointment).{0,40}(scheduled|booked|confirmed|arranged|set up|set\s*up)/i, label: 'visit_claim' },
    { re: /otp.{0,30}(sent|on its way|will be sent|coming|dispatched)/i, label: 'otp_claim' },
    { re: /booking.{0,15}(confirmed|complete|done|successful)/i, label: 'booking_claim' },
    { re: /your (visit|booking|appointment) is (now|all|set|confirmed)/i, label: 'direct_confirm' },
  ]
  const hasVisitPromptCard = allCards.some(c => c.type === 'visit_prompt')
  if (!hasVisitPromptCard) {
    for (const { re, label } of FAKE_BOOKING_PATTERNS) {
      const m = aiResponse.match(re)
      if (m) {
        const phrase = m[0].length > 80 ? m[0].slice(0, 77) + '...' : m[0]
        violations.push(`FAKE_BOOKING_CLAIM: ${label} — "${phrase}" (no visit_prompt CARD in response)`)
        try {
          Sentry.captureMessage('[FAKE_BOOKING_CLAIM] Booking-confirmation language without visit_prompt card', {
            level: 'warning',
            tags: { audit_violation: 'true', rule: 'FAKE_BOOKING_CLAIM', pattern: label },
          })
        } catch {
          // Sentry init may be absent in test/local env — never throw from the checker.
        }
        break
      }
    }
  }

  // CHECK 14 — FABRICATED_BUILDER (audit-only, I25).
  // PART 8.5 rule 3: never name a builder not in PROJECT_JSON. Conservative
  // regex on proper-noun stem + builder-ish suffix ("Group", "Properties",
  // "Builders", "Developers", "Constructions", "Realty", "LLP", "Pvt",
  // "Estate", "Co."). The stem may be one-or-more capitalized words with
  // optional `&` glue (so "Venus Group", "Shree Balaji Constructions", and
  // "Goyal & Co." all match). Designed to under-flag rather than
  // false-positive on place names — skips allowlisted builders and known
  // project names (avoid double-flag with HALLUCINATION check).
  if (knownBuilderNames.length > 0) {
    const GENERIC_SOLO = new Set(['Group', 'Properties', 'Builders', 'LLP', 'Developers', 'Realty'])
    const knownBuilderLower = knownBuilderNames
      .filter(b => b && b.trim().length > 0)
      .map(b => b.toLowerCase().trim())
    const knownProjectLower = knownProjectNames.map(p => (p ?? '').toLowerCase().trim())
    // Group 1 captures the stem (1+ cap words w/ optional `&` glue).
    // The `(?:&\s*)?` between stem and suffix catches the "& Co." / "& Co"
    // single-letter-company pattern seen with Indian family businesses.
    const BUILDER_CANDIDATE_RE = /\b([A-Z][a-z]+(?:\s+(?:&\s+)?[A-Z][a-z]+)*)\s+(?:&\s*)?(Group|Properties|Builders|Developers|Constructions|Realty|LLP|Pvt|Estate|Co\.?)\b/g
    const seen = new Set<string>()
    let bm: RegExpExecArray | null
    while ((bm = BUILDER_CANDIDATE_RE.exec(aiResponse)) !== null) {
      const fullMatch = bm[0].trim().replace(/\s+/g, ' ')
      const stem = bm[1].trim()
      if (seen.has(fullMatch.toLowerCase())) continue
      seen.add(fullMatch.toLowerCase())
      // Skip lone generic suffix words ("Group" / "Properties" alone).
      if (GENERIC_SOLO.has(stem)) continue
      // Skip if the candidate IS a known builder (allowlisted).
      const fullLower = fullMatch.toLowerCase()
      const stemLower = stem.toLowerCase()
      const isKnown = knownBuilderLower.some(k =>
        k === fullLower || k === stemLower || fullLower.includes(k) || k.includes(stemLower)
      )
      if (isKnown) continue
      // Skip if the candidate is a known project name (avoid flagging
      // "Riviera Elite" as a builder when it's a project).
      const isProject = knownProjectLower.some(p =>
        p && (p === fullLower || p === stemLower || fullLower.includes(p) || p.includes(stemLower))
      )
      if (isProject) continue
      violations.push(`FABRICATED_BUILDER: "${fullMatch}" not in known builder allowlist`)
      try {
        Sentry.captureMessage('[FABRICATED_BUILDER] Builder name not in allowlist', {
          level: 'warning',
          tags: { audit_violation: 'true', rule: 'FABRICATED_BUILDER', candidate: fullMatch },
        })
      } catch {
        // Sentry init may be absent in test/local env — never throw from the checker.
      }
    }
  }

  // CHECK 16 — FABRICATED_PRICE (audit-only, O sprint).
  // PART 8.5 rule 7: never state per-sqft rates, all-in costs, EMI amounts,
  // or interest rates in prose unless the project has pricePerSqft > 0 AND
  // a ProjectPricing row exists in PROJECT_JSON. Numbers inside CARD JSON
  // artifacts come from server-computed data and are exempt — strip CARD
  // payloads before scanning prose so we only flag freeform fabrication.
  const proseOnly = aiResponse.replace(/<!--CARD:[\s\S]*?-->/g, '')
  const FABRICATED_PRICE_PATTERNS: Array<{ re: RegExp; label: string }> = [
    { re: /basic\s+rate\s+(is\s+)?₹\s*[\d,]+(?:\s*\/\s*sqft|\s*\/\s*sq\.?\s*ft\.?)/gi, label: 'per_sqft_rate' },
    { re: /all[\s-]?in\s+(cost|price|total)?\s*(comes\s+to\s+|is\s+|hoga\s+|hogi\s+)?(approximately\s+|~)?₹\s*[\d.]+\s*(L|Cr|lakh|crore)/gi, label: 'all_in_cost' },
    { re: /EMI\s+(would\s+be\s+|is\s+|comes\s+to\s+|hogi\s+|hoga\s+)?(around\s+|approximately\s+)?₹\s*[\d,]+\s*(\/\s*month|per\s+month|pm|monthly)/gi, label: 'emi_amount' },
    { re: /(at\s+|@\s*)[\d.]+\s*%\s*(interest|per\s+annum|p\.?a\.?|annual)/gi, label: 'interest_rate' },
  ]
  for (const { re, label } of FABRICATED_PRICE_PATTERNS) {
    let pm: RegExpExecArray | null
    while ((pm = re.exec(proseOnly)) !== null) {
      const phrase = pm[0].length > 80 ? pm[0].slice(0, 77) + '...' : pm[0]
      violations.push(`FABRICATED_PRICE: ${label} — "${phrase}"`)
      try {
        Sentry.captureMessage('[FABRICATED_PRICE] Price/EMI/interest stated without source pricing row', {
          level: 'warning',
          tags: { audit_violation: 'true', rule: 'FABRICATED_PRICE', pattern: label, match: phrase },
        })
      } catch {
        // Sentry init may be absent in test/local env — never throw from the checker.
      }
    }
  }

  // CHECK 15 — FABRICATED_STAT (audit-only, Sprint B Bug #2).
  // PART 8.5 rule 6: never state numerical facts about builders / projects /
  // RERA timelines unless the exact fact appears verbatim in PROJECT_JSON or
  // BUILDER_JSON. The model has a bad habit of inventing plausible-sounding
  // stats ("250 projects delivered since 1971", "40 years in business") when
  // a builder's NAME is real but the stats aren't in our schema. Three regex
  // patterns cover the common shapes; audit-only so we never abort the stream.
  const FABRICATED_STAT_PATTERNS: Array<{ re: RegExp; label: string }> = [
    { re: /(\d{2,4})\s+(projects|units|flats|apartments|homes|towers)\s+(delivered|completed|built|sold)/gi, label: 'delivered_count' },
    { re: /(since|established|founded|from)\s+(in\s+)?(\d{4})/gi, label: 'founding_year' },
    { re: /(\d+)\s+(years?|decades?)\s+(in|of)\s+(business|experience)/gi, label: 'years_in_business' },
  ]
  for (const { re, label } of FABRICATED_STAT_PATTERNS) {
    let sm: RegExpExecArray | null
    while ((sm = re.exec(aiResponse)) !== null) {
      const phrase = sm[0].length > 80 ? sm[0].slice(0, 77) + '...' : sm[0]
      violations.push(`FABRICATED_STAT: ${label} — "${phrase}"`)
      try {
        Sentry.captureMessage('[FABRICATED_STAT] Numerical builder/project stat without source', {
          level: 'warning',
          tags: { audit_violation: 'true', rule: 'FABRICATED_STAT', pattern: label, match: phrase },
        })
      } catch {
        // Sentry init may be absent in test/local env — never throw from the checker.
      }
    }
  }

  // CHECK 17a — OTP_FABRICATION (audit-only, P2-CRITICAL-7 Bug #1).
  // PART 8.5 rule #2 (strengthened): the model has no tool to send or verify OTPs,
  // so any phrase that simulates an OTP send/verify flow is a fabrication. Live
  // smoke test on 2026-04-27 caught: "OTP bheja hai 9999 pe" → buyer's input
  // rejected with "Kuch problem hui dubara try karein" → trust-destroying loop.
  // Audit-only (per I18-final, only leak/safety justifies mid-stream abort).
  const OTP_FABRICATION_PATTERN =
    /\b(otp|code)\s+(bheja|sent|send|share|diya|aaya|on its way|dispatched)\b|\benter\s+(the\s+)?otp\b|\botp\s+(daalein|enter)\b|\bwrong\s+otp\b|\botp\s+(incorrect|galat)\b|\bresend\s+otp\b|\botp\s+resend\b/i
  const otpMatch = aiResponse.match(OTP_FABRICATION_PATTERN)
  if (otpMatch) {
    const phrase = otpMatch[0].length > 80 ? otpMatch[0].slice(0, 77) + '...' : otpMatch[0]
    violations.push(`OTP_FABRICATION: "${phrase}" (model has no tool to send or verify OTPs)`)
    try {
      Sentry.captureMessage('[OTP_FABRICATION] Model simulated OTP send/verify flow', {
        level: 'warning',
        tags: { audit_violation: 'true', rule: 'OTP_FABRICATION', match: phrase },
      })
    } catch {
      // Sentry init may be absent in test/local env — never throw from the checker.
    }
  }

  // CHECK 17 — FAKE_VISIT_CLAIM (audit-only, P1-S1).
  // PART 8.5 rule 9: never claim a visit is booked/confirmed/scheduled in
  // prose unless a VISIT_CONFIRMATION artifact with an HST-XXXX token has
  // been emitted in the SAME response. Pre-OTP/verify, only soft phrasing
  // ("visit start karte hain", "slot check karte hain") is allowed.
  //
  // Text-only inspection: artifacts ship inline as HTML comments in the
  // streamed text, so the marker `<!--CARD:{"type":"visit_confirmation"...`
  // with `"token":"HST-...` is sufficient evidence the artifact was emitted.
  // No signature change to checkResponse() needed.
  const FAKE_VISIT_CLAIM_PATTERN = /(visit|slot)\s+(book(?:ed)?|confirm(?:ed)?|scheduled|locked|done)/i
  const claimMatch = aiResponse.match(FAKE_VISIT_CLAIM_PATTERN)
  if (claimMatch) {
    const visitConfirmationMarker = /<!--CARD:\{[^}]*"type":\s*"visit_confirmation"[^}]*"token":\s*"HST-/i
    const hasVisitConfirmation = visitConfirmationMarker.test(aiResponse)
    if (!hasVisitConfirmation) {
      const phrase = claimMatch[0].length > 80 ? claimMatch[0].slice(0, 77) + '...' : claimMatch[0]
      violations.push(`FAKE_VISIT_CLAIM: "${phrase}" (no visit_confirmation artifact with HST- token in response)`)
      try {
        Sentry.captureMessage('[FAKE_VISIT_CLAIM] Visit-confirmation language without visit_confirmation artifact', {
          level: 'warning',
          tags: { audit_violation: 'true', rule: 'FAKE_VISIT_CLAIM', match: phrase },
        })
      } catch {
        // Sentry init may be absent in test/local env — never throw from the checker.
      }
    }
  }

  return { passed: violations.length === 0, violations }
}
