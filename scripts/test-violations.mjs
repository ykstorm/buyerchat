#!/usr/bin/env node
// I26 — one-shot local verifier for response-checker audit rules.
//
// Usage:
//   node scripts/test-violations.mjs
//
// Runs a table of synthetic responses designed to trip each of the audit-only
// rules wired to Sentry in src/app/api/chat/route.ts. Prints a PASS/FAIL row
// per rule so the operator can confirm the checker still fires expected
// violations locally without sending chat messages.
//
// This does NOT touch Sentry — it only exercises `checkResponse`. The Sentry
// wiring is in the route handler; run a real /api/chat request if you want to
// see events land in Sentry.
//
// Requirements:
//   - Node >= 22.6 (uses --experimental-strip-types). Node 24+ strips types
//     automatically without the flag. The wrapper re-execs with the flag if
//     we're on an older Node where it isn't implicit.
//
// To add a rule fixture:
//   1. Pick a rule prefix that appears in response-checker.ts (e.g. "WORD_CAP")
//   2. Add a case to CASES below with a response string that should trip it
//   3. Re-run the script

import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const NODE_MAJOR = Number(process.versions.node.split('.')[0])
const NEEDS_FLAG =
  NODE_MAJOR < 24 && !process.execArgv.includes('--experimental-strip-types')
if (NEEDS_FLAG) {
  const result = spawnSync(
    process.execPath,
    ['--experimental-strip-types', ...process.argv.slice(1)],
    { stdio: 'inherit' }
  )
  process.exit(result.status ?? 1)
}

const { checkResponse } = await import(
  pathToFileURL(resolve('src/lib/response-checker.ts')).href
)

// Minimal ClassifiedQuery factory — mirrors the test helper in
// src/lib/response-checker.test.ts.
const cq = (persona = 'unknown', intent = 'general_query') => ({ persona, intent })

// Fixed CTA phrase so we satisfy MISSING_CTA when mentioning a project.
const CTA = ' Want to book a site visit?'

const CASES = [
  {
    rule: 'PROJECT_LIMIT',
    response:
      `Alpha Heights, Beta Park, and Gamma Greens all fit.${CTA}\n` +
      `<!--CARD:{"type":"project_card","projectId":"a"}-->\n` +
      `<!--CARD:{"type":"project_card","projectId":"b"}-->\n` +
      `<!--CARD:{"type":"project_card","projectId":"c"}-->`,
    projects: ['Alpha Heights', 'Beta Park', 'Gamma Greens'],
    buyer: 'compare projects',
    classified: cq(),
  },
  {
    rule: 'NO_MARKDOWN',
    response: 'Options for you:\n- Alpha Heights\n- Beta Park',
    projects: [],
    buyer: 'what do you have',
    classified: cq(),
  },
  {
    rule: 'LANGUAGE_MISMATCH',
    response:
      'There are two options with builder grade B and reasonable possession timelines for buyers in the area right now.',
    projects: [],
    buyer: 'bhai mujhe batao kya hai options south bopal mein kaise ghar milega',
    classified: cq(),
  },
  {
    rule: 'WORD_CAP',
    response: Array.from({ length: 200 }, (_, i) => `word${i}`).join(' '),
    projects: [],
    buyer: 'tell me everything',
    classified: cq(),
  },
  {
    rule: 'CARD_DISCIPLINE',
    response:
      `Cost breakdown for Alpha.${CTA}\n` +
      `<!--CARD:{"type":"cost_breakdown","projectId":"a"}-->\n` +
      `<!--CARD:{"type":"cost_breakdown","projectId":"a"}-->`,
    projects: ['Alpha Heights'],
    buyer: 'cost breakdown',
    classified: cq(),
  },
  {
    rule: 'SOFT_SELL_PHRASE',
    response: 'I recommend Alpha Heights for your budget and needs.',
    projects: [],
    buyer: 'suggest something',
    classified: cq(),
  },
  {
    rule: 'ORDINAL_RANKING',
    response: 'Alpha is your 1st choice given the priorities you mentioned.',
    projects: [],
    buyer: 'pick one',
    classified: cq(),
  },
]

// ANSI color helpers — fall back to bare output when NO_COLOR is set.
const color = process.env.NO_COLOR
  ? { green: (s) => s, red: (s) => s, dim: (s) => s, bold: (s) => s }
  : {
      green: (s) => `\x1b[32m${s}\x1b[0m`,
      red: (s) => `\x1b[31m${s}\x1b[0m`,
      dim: (s) => `\x1b[2m${s}\x1b[0m`,
      bold: (s) => `\x1b[1m${s}\x1b[0m`,
    }

let failures = 0
console.log(color.bold('\nI26 response-checker audit-rule verifier\n'))
console.log(color.dim('Expected: every row triggers its target rule prefix.\n'))

const header = `${'RULE'.padEnd(22)}  ${'TRIGGERED'.padEnd(10)}  DETAIL`
console.log(header)
console.log('-'.repeat(header.length))

for (const c of CASES) {
  const { violations } = checkResponse(
    c.response,
    c.projects,
    c.classified,
    c.buyer
  )
  const hit = violations.some((v) => v.startsWith(c.rule))
  if (hit) {
    const matched = violations.find((v) => v.startsWith(c.rule))
    console.log(
      `${c.rule.padEnd(22)}  ${color.green('YES'.padEnd(10))}  ${color.dim(matched)}`
    )
  } else {
    failures += 1
    console.log(
      `${c.rule.padEnd(22)}  ${color.red('NO'.padEnd(10))}  ${color.dim(
        'other violations: ' + (violations.join('; ') || '(none)')
      )}`
    )
  }
}

console.log()
if (failures === 0) {
  console.log(color.green(color.bold(`All ${CASES.length} rules triggered as expected.`)))
  process.exit(0)
} else {
  console.log(
    color.red(color.bold(`${failures} of ${CASES.length} rules did NOT trigger — check response-checker.ts`))
  )
  process.exit(1)
}
