# PART 0 — Why our chatbot stopped pretending to send OTPs

A buyer typed her phone number into our chat. The model replied,
*"OTP bheja hai 9999 pe — please confirm."* She typed `9999`. The model
replied, *"That OTP is incorrect — please try again."*

The model has no OTP-sending tool. It has no OTP-verifying tool. It had
simulated the entire two-message verification flow because the system
prompt mentioned the word "OTP" inside an unrelated visit-booking
script. We caught it on a smoke test on 2026-04-27 and patched it the
same day.

This post is about the structural fix that closed eight more
hallucination classes in the same sprint, and the five-layer detection
pattern that makes it stick.

## Why prompt prose collapses under load

The pre-fix system prompt was prose — long, well-organized, full of
"never do X" sentences. GPT-4o follows prose rules just fine for the
first two or three turns. Then conversational context fills the
window, the buyer's questions drift, and the model starts treating the
prompt as flavor rather than as contract. It latches onto patterns
mentioned anywhere in context — even in a paragraph that begins "if
the buyer asks about visiting" — and confidently simulates capabilities
it doesn't have.

The OTP incident wasn't a model deficiency. It was an emergent
behavior of long-context generation against a prompt where the
constraint sat eight paragraphs in, surrounded by examples that
*mentioned* OTPs. The model didn't ignore the rule. The rule, as
prose, never carried enough structural weight to override pattern
completion under conversational drift.

The mechanism is worth naming because it shapes the fix. A long
system prompt has positional weight — the model attends most
strongly to the very top, less to the middle, and rebuilds attention
around the most recent few turns. Prohibitions buried in the middle
of a 1000-line prompt do not lose their semantic meaning, but they
lose their priority. When the conversation surface area is large —
multiple buyer turns, retrieved context, decision-card analysis,
visit-booking sub-flow — middle-of-prompt constraints get
out-competed by surface patterns the buyer just typed. "OTP" appears
in a single line of an example five paragraphs deep; the buyer asks
about scheduling a visit; the model completes the pattern.

## The fix is structural, not prose

We restructured the system prompt around a new section called PART 0.
It sits before everything else — before the persona, before the
examples, before the disclosure protocol. Seven numbered rules, A
through G, hard-stop language, no qualifiers.

```
PART 0 — ABSOLUTE RULES (READ BEFORE EVERYTHING)
```
— `src/lib/system-prompt.ts:146`

Rule C is the OTP one:

> NEVER say (in any language): "OTP bheja hai", "OTP sent", "Enter the OTP",
> "verify karein", "OTP diya", or any phrasing that simulates sending or
> verifying a one-time password. The model has no tool to do either.
> The visit-booking flow ends with a holding message — Homesty AI team
> confirms via WhatsApp out-of-band.

Each rule is repeated at the bottom of the prompt in a FINAL REMINDER
block. Each rule has a corresponding self-check item in the few-shot
section ("Does your response contain 'OTP', 'OTP bheja', 'OTP ke
baad', 'Enter karein' in an OTP context, or 'verify karein'? DELETE
that sentence entirely." — `src/lib/system-prompt.ts:1168`).

But the prompt change alone wouldn't be enough. Models drift. New
few-shots get added. The same rule, in the same prose, can lose weight
six months later when surrounding examples shift. Prose-only rules are
vibes — they need code-level enforcement to stay honest.

So PART 0 Rule C also exists in `src/lib/response-checker.ts:522`:

```ts
// CHECK 17a — OTP_FABRICATION (audit-only, P2-CRITICAL-7 Bug #1).
// smoke test on 2026-04-27 caught: "OTP bheja hai 9999 pe" → buyer's input
const OTP_FABRICATION_PATTERN = /…/
const otpMatch = aiResponse.match(OTP_FABRICATION_PATTERN)
if (otpMatch) {
  violations.push(`OTP_FABRICATION: "${phrase}" (model has no tool to send or verify OTPs)`)
  Sentry.captureMessage('[OTP_FABRICATION] Model simulated OTP send/verify flow', {
    level: 'warning',
    tags: { audit_violation: 'true', rule: 'OTP_FABRICATION', match: phrase },
  })
}
```

The regex runs on every completed response. It is audit-only — it
does not block tokens, because the buyer has already seen them by the
time `onFinish` fires (a known gap, tracked under HIGH in
`CLAUDE.md`'s Known Open Issues). What it does is tag the violation to
Sentry with a route-specific tag so on-call can slice by `rule:OTP_FABRICATION` and
catch a regression within minutes of deploy.

## What this bought us

- **8+ hallucination classes closed** between commits `706feb3` (OTP
  fabrication ban + zero-bullets rule + visit-booking holding message),
  `54561c1` (NUCLEAR PART 0 reordering + EXAMPLE 17/18 first), and
  the surrounding response-checker patches. Each commit message names
  the class. Sources documented one-by-one in
  `docs/diagnostics/sentry-resolution-log-2026-04-26.md`.
- **0 P0/P1 Sentry classes open** as of 2026-04-29. The five
  historical classes (JS-NEXTJS-K, E, J cluster) all carry "Closed
  by" SHAs in the same resolution log.
- **162 → 207 unit tests** passing through the P1-R2 sprint days 2-6
  (+45 across six commits). Per-day deltas: Day 2 +8 (auditWrite), Day
  3 +5 (bulk-upload), Day 4 +6 (RERA cache), Day 5 +22 (builder wizard
  reducer + builders POST + manualPayload), Day 6 +4 (healthcheck +
  with-sentry). Each commit listed in
  `docs/diagnostics/p1-week1/HANDOFF.md`.

We are not claiming "95% reduction in hallucinations." We did not
measure that. We can claim what is in the logs and the commit history,
and not more.

What we *can* say with the receipts in hand: every closed class has a
specific commit SHA, every commit has tests locking the regression
shape, and every Sentry resolution row carries a "what to watch"
section that names the layer we expect to catch the next regression
before it reaches a buyer. That is a different claim than "we made
hallucinations rare." It is the claim "if a hallucination happens, we
have a path to find out within hours, not weeks."

## The deeper lesson — rules need both visibility and enforcement

Prompt rules without code enforcement are vibes. Code enforcement
without prompt visibility is fragile — when the regex fires three
months from now, the next person to touch the prompt has no idea why
that constraint matters. They will weaken it, the regex will start
flagging legitimate output, and the natural fix will be to weaken the
regex too.

The pattern that works:

1. **Rule lives at the top of the prompt** as numbered hard-stop language.
2. **Rule is repeated in a FINAL REMINDER block at the bottom** so the
   model encounters it twice in the same forward pass.
3. **Rule has a code-level checker** that runs audit-only on every
   response, tagged to Sentry with the rule name.
4. **Rule has at least one few-shot example** demonstrating the
   correct shape ("the holding message is the entire response. STOP.").
5. **The PR that added the rule** carries the original failure mode
   in the commit message. Future readers grep for the phrase and find
   the receipt.

System prompts are interfaces. Interfaces need contracts. Contracts
need enforcement. The interesting thing is not that this is a clever
insight — it isn't. The interesting thing is that the fix only worked
when we did all five steps. We had tried subsets before and watched
the regression come back.

A worked example: we had previously added a single prose rule against
"OTP bheja hai" early in the prompt. It held for two weeks. Then a
new few-shot example was added (unrelated, for a different intent)
that included the phrase inside dialogue. Within a day the model was
back to simulating the OTP send. The fix that stuck was not adding
*more* prose. It was the audit-only regex in `response-checker.ts`,
which fires regardless of what the prompt says. The regex's job is not
to block bad output — by the time `onFinish` runs, tokens have
streamed. The regex's job is to surface drift inside an hour, before
a hundred buyers see it. The PART 0 reordering and the FINAL REMINDER
block reduce the rate of drift; the regex makes drift visible. Both
are needed.

## The five layers, end-to-end

PART 0 is one of five overlapping layers that catch buyer-facing or
operator-facing bugs in production. Each layer covers what the prior
one missed:

1. **PART 0 hard-stop rules** in the system prompt — front-loaded,
   code-enforced, repeated in FINAL REMINDER. (This post.)
2. **`onChunk` markdown abort** — early-exit guard for the streaming
   path; flips the response to a NO_MARKDOWN flag the moment a
   bullet token shows up. (`src/lib/system-prompt.ts:1166` +
   chat route handlers.)
3. **17-class regex audit** in `src/lib/response-checker.ts`,
   running on `onFinish` after every completed response. Each class
   tags to Sentry with `rule:<NAME>` for slice-by-tag triage.
4. **Source-provenance API blockade** —
   `src/lib/project-content-source.ts` blocks any AI-generated write
   from reaching `Project.analystNote` / `Project.honestConcern`,
   the two buyer-facing free-text trust fields. AI-only writes are
   Sentry-warned at the call site.
5. **GUARD_LIST RAG grounding** — amenity-style queries run through
   the RAG retriever; PART 8.5 rule #8 blocks the model from naming
   projects that aren't in the retrieved or structured context.

Each layer is independently auditable. Each layer ships with tests
locking its invariants. The full architecture diagram and on-call
runbook live in [`docs/observability.md`](../observability.md).

## What this didn't fix

Honesty about scope: the response-checker is **audit-only**. By the
time it runs, the buyer has seen the response. We have not closed the
gap where a one-time critical leak — say, a contact-leak phrase that
slips past prompt rules and hasn't been added to the regex set yet —
reaches a single buyer in a single session. That gap is tracked as
HIGH in `CLAUDE.md`'s Known Open Issues. The fix is to migrate
`CONTACT_LEAK` and `BUSINESS_LEAK` checks from `onFinish` to `onChunk`
or to a pre-stream pass — partial enforcement at the cost of higher
latency on legitimate responses. We have not done it yet because the
trade-off needs measurement, and the measurement needs a baseline of
how often each class fires in production. As of 2026-04-29, those
classes have fired zero times in the resolution-log window. We are
watching, not patching speculatively.

A second uncovered class: 13 of the prompt's PART 8.5 rules have no
regex counterpart in the response-checker yet. Drift goes undetected
for those. Examples: the "2-project hard limit," the "100-word cap,"
the "no 1st/2nd/3rd ranking language" rule. If the model starts
violating any of them, today we'd find out from a buyer, not from the
audit log. Closing that gap is the next sprint after the WellVerse
polish lands.

## Closing

The product is live at **homesty.ai**. The full agent-discipline doc
that drove this sprint — including the
duplicate-surface check, the Neon-HTTP transaction rule, and the
report-back format — is at
[`docs/AGENT_DISCIPLINE.md`](../AGENT_DISCIPLINE.md). The
issue-by-issue receipts live in
[`docs/diagnostics/sentry-resolution-log-2026-04-26.md`](../diagnostics/sentry-resolution-log-2026-04-26.md).

If you've shipped an LLM-backed product and watched a similar emergent
behavior bite you, we'd genuinely like to hear the failure mode.
Reply on the homesty.ai blog or open an issue against the repo.

---

*All numbers in this writeup reference commit `<DAY-7-SHA>` of
github.com/ykstorm/buyerchat at 2026-04-29. Update SHA + date when
republished externally.*
