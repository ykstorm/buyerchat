# Intent + Persona Alignment (Sprint I11)

How `classifyIntent` emits two signals — a coarse `QueryIntent` and a `Persona`
— and how each is consumed downstream in the system prompt and the
response-checker. Before Sprint I11, persona was referenced in the system
prompt but was never computed anywhere in the pipeline; intent was computed
but never read by the checker. Both signals now flow end-to-end.

## Output shape

`src/lib/intent-classifier.ts` exports:

```ts
export interface ClassifiedQuery {
  intent: QueryIntent
  persona: Persona
}

export type QueryIntent =
  | 'budget_query'
  | 'location_query'
  | 'builder_query'
  | 'comparison_query'
  | 'visit_query'
  | 'legal_query'
  | 'investment_query'
  | 'general_query'

export type Persona = 'family' | 'investor' | 'value' | 'premium' | 'unknown'
```

## The 8 intent types — trigger words

| Intent | Triggered when lowercased query matches |
|---|---|
| `budget_query` | `budget`, `price`, `cost`, `afford`, `crore`, `lakh`, `₹`, `rs.`, `cheap`, `expensive` |
| `location_query` | `shela`, `south bopal`, `location`, `area`, `nearby`, `distance`, `school`, `hospital` |
| `builder_query` | `builder`, `developer`, `trust`, `reliable`, `reputation`, `track record` |
| `comparison_query` | `compare`, `vs`, `versus`, `difference`, `better`, `which one` |
| `visit_query` | `visit`, `site`, `appointment`, `book`, `schedule`, `see`, `view` |
| `legal_query` | `rera`, `stamp duty`, `registration`, `legal`, `document`, `agreement` |
| `investment_query` | `invest`, `return`, `appreciation`, `rental`, `roi`, `growth` |
| `general_query` | fallback — no match |

Intents are tested in the order above; the first match wins. Intents are
coarse-grained and route the buyer's *question type*, not their *profile*.

## Persona inference rules

Personas are evaluated after intent, also in priority order. The first
matching persona wins. Priority is **investor > premium > value > family >
unknown** — rarer, more actionable signals are detected first so they are
not lost to a noisier earlier match.

| Persona | Signal (regex over lowercased query) |
|---|---|
| `investor` | `\b(roi\|rental\|yield\|appreciation\|resale\|flip\|returns?)\b` |
| `premium` | `\b(luxury\|luxurious\|high[- ]end\|premium\|4\s*bhk\|4bhk\|duplex\|penthouse\|top floor)\b` |
| `value` | `\b(budget\|cheap\|affordable\|best deal\|value for money\|sasta)\b` or `under <digit>` / `below <digit>` |
| `family` | `\b(school\|schools\|hospital\|hospitals\|children\|kids\|family\|safety\|society\|club\|amenit(y\|ies))\b` |
| `unknown` | fallback — no signal matched |

This is a single-turn classifier. The buyer's long-running persona is still
tracked separately on `ChatSession.buyerPersona` (set by the onFinish hook
in `/api/chat`) — that field stores only `family` or `investor` today to
match pre-existing database semantics. The richer 5-persona set drives the
per-turn prompt and checker; it does not need to persist.

## System prompt PARTs that branch on persona

`src/lib/system-prompt.ts` accepts `persona: Persona = 'unknown'` as its
5th parameter. A new **PART 18 — ACTIVE PERSONA** block is appended to the
prompt only when `persona !== 'unknown'`. When persona is `unknown`, the
prompt is byte-identical to the pre-I11 output.

PART 18 has four disjoint 3-line blocks — one per persona — that each
override tone and emphasis for the current turn:

| Persona | What PART 18 tells the model |
|---|---|
| `family` | Lead with liveability (schools, carpet area, builder reliability). Skip ROI. Use the family framing when triggering a visit (PART 5). |
| `investor` | Lead with possession certainty and builder delivery. Show score + life translation. Never promise yield or appreciation. |
| `value` | Lead with all-in cost (per-sqft + stamp duty + registration + parking + interiors). Don't upsell above budget. Use the value framing when triggering a visit. |
| `premium` | Lead with micro-location, density, and spec. Don't over-qualify on budget. Use the premium framing when triggering a visit. |

The older PART 5 (VISIT PSYCHOLOGY) already carried per-persona framing
paragraphs as *flavour text*, but the model was guessing which one to use.
PART 18 makes the choice explicit.

## response-checker rules that use persona

`src/lib/response-checker.ts` now takes `classified: ClassifiedQuery`
instead of the dead `intent: string` parameter. The previously unused
parameter is now read:

- **CHECK 4b — Persona-aware guarantee tightening.** When
  `classified.persona === 'investor'`, an additional set of soft-sell
  phrases (`sure to grow`, `solid returns`, `will appreciate`, `safe bet`,
  etc.) is flagged as `INVESTMENT_GUARANTEE`. For non-investor personas
  these phrases are noisy and would create false positives, so the rule is
  scoped.

All other checks (hallucination, missing CTA, contact leak, out-of-area,
core guarantee phrases) remain persona-agnostic.

## Example flow

Buyer: *"What's a good 4BHK penthouse under 2Cr in Shela with schools nearby?"*

1. `classifyIntent` → `intent: 'budget_query'` (first matcher wins on `price`/`under`/`cr`), `persona: 'premium'` (investor has no match; premium's `penthouse` + `4bhk` matches before family's `schools`).
2. `/api/chat` threads `persona = 'premium'` into `buildSystemPrompt` → PART 18 premium block is rendered. Model is told to lead with micro-location + spec, not price.
3. `/api/chat` threads `classified` into `checkResponse` after the stream completes. Because persona is `premium` (not `investor`), the CHECK 4b soft-sell detector is skipped.

Buyer: *"Is this a safe bet for rental yield?"*

1. `classifyIntent` → `intent: 'investment_query'`, `persona: 'investor'` (`yield` + `rental` both match).
2. PART 18 investor block is active — model is reminded not to promise yield.
3. If the model drifts and says *"this is a safe bet"*, CHECK 4b fires
   `INVESTMENT_GUARANTEE` post-stream.

## Files touched in Sprint I11

- `src/lib/intent-classifier.ts` — return shape widened from `QueryIntent` to `ClassifiedQuery`.
- `src/lib/system-prompt.ts` — new `persona` param + PART 18 block.
- `src/lib/response-checker.ts` — `intent: string` → `classified: ClassifiedQuery`; new CHECK 4b.
- `src/app/api/chat/route.ts` — single call-site updated to thread both signals.
- `docs/intent-alignment.md` — this file.
