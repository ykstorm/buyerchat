export interface CheckResult {
  passed: boolean
  violations: string[]
}

const KNOWN_AREAS = [
  'prahlad nagar', 'satellite', 'south bopal', 'shela', 'bopal',
  'vastrapur', 'maninagar', 'gota', 'chandkheda', 'new ranip',
  'ahmedabad', 'gujarat', 'india', 'magicbricks', 'buyerchat'
]

export function checkResponse(
  aiResponse: string,
  knownProjectNames: string[],
  intent: string
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
    return looksLikeProject && !isKnown && !isKnownArea
  })
  if (hallucinated.length > 0) {
    violations.push(`HALLUCINATION: invented names — ${hallucinated.join(', ')}`)
  }

  // CHECK 2 — Missing CTA: project mentioned but no site visit suggestion
  const mentionsProject = knownProjectNames.some(p =>
    lower.includes(p.toLowerCase())
  )
  const hasCTA = lower.includes('site visit') ||
                 lower.includes('book a visit') ||
                 lower.includes('schedule a visit') ||
                 lower.includes('30 seconds')
  if (mentionsProject && !hasCTA) {
    violations.push('MISSING_CTA: project mentioned without site visit CTA')
  }

  // CHECK 3 — Contact data leak: phone number or email in response
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

  // CHECK 5 — Out-of-area response
  const outOfArea = [
    'satellite', 'prahlad nagar', 'bopal gaon', 'vastrapur',
    'maninagar', 'new ranip', 'chandkheda'
  ]
  const mentionedOutOfArea = outOfArea.filter(a => lower.includes(a))
  if (mentionedOutOfArea.length > 0) {
    violations.push(`OUT_OF_AREA: mentioned ${mentionedOutOfArea.join(', ')}`)
  }

  return { passed: violations.length === 0, violations }
}