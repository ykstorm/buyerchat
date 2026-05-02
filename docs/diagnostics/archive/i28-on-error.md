# I28 — Diagnostic: `result.onError` Sentry event on `POST /api/chat`

**Date:** 2026-04-21 (Sprint I28, read-only diagnostic)
**Trigger:** 1 Sentry event in the last ~2h, generic `result.onError` name, single occurrence, unclear root cause.
**Agent mode:** Read-only. No code edits, no commits. Deliverable is this markdown doc.
**Sentry MCP:** Not configured (`.claude/mcp-servers.json` only wires Docker gateway) — investigation worked from code alone.

---

## 1. Summary

A single `result.onError` event in Sentry is almost certainly **expected noise**, not a live regression. The AI SDK v6 `streamText` API contract invokes the `onError: ({ error }) => ...` callback on *every* stream-halting error, including the **intentional leak aborts** we `throw` from inside `onChunk` (see `src/app/api/chat/route.ts:248, 253`). Our `onError` handler (`src/app/api/chat/route.ts:266–281`) calls `Sentry.captureException(error, { tags: { context: 'streaming_abort', leak_abort: <bool>, markdown_abort: <bool> } })` **unconditionally**. That means every protective `CONTACT_LEAK` / `BUSINESS_LEAK` abort produces a Sentry **exception** event (in addition to the `Sentry.captureMessage(...)` warning emitted alongside it at lines 247/252). Sentry groups by stacktrace, so the first time this fires after a deploy it lands under a generic `Error: Contact information leak detected` / `Business information leak detected` issue with no distinguishing tag in the event title — which matches the described symptom ("generic name, unclear root cause, one occurrence").

The second plausible source is the outer `ReadableStream` wrapper's `catch` block (`route.ts:492–499`), which also calls `Sentry.captureException` with `tags: { context: 'streaming_abort', stage: 'stream_wrapper' }`. If an `onChunk` throw propagates into the wrapper's `reader.read()` loop, **the same underlying error is captured twice** — once by `onError`, once by the wrapper catch.

No evidence of a new regression from I25/I26. The `onFinish` audit-dispatch loop is wrapped in a single `try { ... } catch (err) { console.error(...) }` at `route.ts:282 / 467`, so Prisma writes failing inside `onFinish` do *not* propagate to Sentry as `result.onError` — they only `console.error`. That path is ruled out as the source of this specific event name.

**Verdict:** SILENCE (known-abort noise; minimum-diff guard). Confidence: **HIGH** for the hypothesis, **MEDIUM** for ordering between the two hypotheses (a vs b1 vs b2).

---

## 2. Stream pipeline architecture (as of HEAD = `bf0c494`)

```
POST /api/chat
  └─ rate limit                           route.ts:64
  └─ auth() + Zod validate + sanitize     route.ts:71-116
  └─ classifyIntent → {intent, persona}   route.ts:120-122
  └─ buildContextPayload (catch→503)      route.ts:125-127
  └─ retrieveChunks (own 600ms timeout,   route.ts:132
     .catch(() => []))
  └─ decisionCard if comparison           route.ts:137-155
  └─ upsert ChatSession                   route.ts:158-171
  └─ buyerMemory / postVisitContext       route.ts:174-211
  └─ streamText({                         route.ts:230
        model, system, messages,
        abortSignal: AbortSignal.timeout(15_000),
        onChunk,    ← leak regex + streamBuffer accumulator
        onError,    ← Sentry.captureException unconditionally
        onFinish,   ← audit dispatch loop + Prisma writes
     })
  └─ new ReadableStream<Uint8Array>       route.ts:478
        .start(controller) {
           while (reader.read()) ...      ← can catch onChunk throw
           catch { Sentry.captureException }
           if aborted: enqueue fallback
        }
  └─ return new Response(wrapped)         route.ts:507
```

Key flags:
- `streamAbortedByLeak` (`let`, line 217) — flipped by `onChunk` on CONTACT/BUSINESS match.
- `streamAbortedByMarkdown` (`const false`, line 224) — **dead code** since hotfix `7a1b12c`; all branches still present but unreachable.
- `streamBuffer` (`let ''`, line 228) — accumulates deltas cross-chunk. Currently only used for potential future logging; no post-assembly check runs on it.

---

## 3. Error paths enumerated

Every path that could produce a Sentry event shaped like "result.onError", with catch behavior:

### Path A — `onChunk` throws (intentional leak abort)
**Location:** `route.ts:248` (`throw new Error(CONTACT_LEAK_ABORT_MSG)`), `route.ts:253` (`throw new Error(BUSINESS_LEAK_ABORT_MSG)`).
**Caught by:**
1. AI SDK v6's internal stream pipeline → invokes `onError({ error })` at `route.ts:266–281`. **Captures to Sentry as exception** with `tags.leak_abort = 'true'`.
2. After `onError`, the thrown error surfaces from `reader.read()` in the wrapper → caught at `route.ts:492–499`. **Captures to Sentry as exception** with `tags.stage = 'stream_wrapper'`.

**Net Sentry cost per leak abort:** 1 `captureMessage` warning (inside `onChunk` before throw) + 2 `captureException` exceptions (onError + wrapper). **Three events per incident.** This is almost certainly the source of the diagnostic.

### Path B — `onChunk` throws for any non-leak, non-markdown reason
**Location:** Shouldn't happen today. Only two `throw` sites inside `onChunk` and both set `streamAbortedByLeak=true`. No other code path in `onChunk` can throw synchronously (it reads `chunk.type`, does regex tests, appends to a string buffer). An exception would only occur if `chunk.type` were missing or `text` were an unexpected shape — but `?? ''` guards cover that.
**Caught by:** Same as Path A (`onError` + wrapper). But with `tags.leak_abort='false'` and `tags.markdown_abort='false'` — would land under a *different* Sentry group. Low confidence as source.

### Path C — Upstream `streamText` error (OpenAI API / network / timeout)
**Location:** OpenAI returns 4xx/5xx, or `AbortSignal.timeout(15_000)` fires mid-stream, or socket drops.
**Caught by:** `onError` at `route.ts:266–281`. **Captures to Sentry as exception** with `tags.leak_abort='false'`, `tags.markdown_abort='false'`. The wrapper's `reader.read()` loop will also reject → caught at `route.ts:492–499`, **second capture.**
**Note:** The AI SDK v6 contract (`StreamTextOnErrorCallback`) explicitly says this callback fires "when an error occurs during streaming" — it is the designated place to log, not a bug.

### Path D — `onFinish` throws (Prisma / Resend / DB)
**Location:** All Prisma `.update/.create/.findUnique` calls inside `onFinish` (`route.ts:293–444`).
**Caught by:** Outer `try { ... } catch (err) { console.error('onFinish error:', err) }` at `route.ts:282 / 467`. **Does NOT reach Sentry.** Prisma failures inside `onFinish` are currently invisible to Sentry.
**Verdict:** Ruled out as source of `result.onError` Sentry event. Separately worth noting as a gap.

### Path E — `result.toTextStreamResponse()` throws synchronously
**Location:** `route.ts:477`. Not wrapped in try/catch.
**Caught by:** Nothing at this handler — would propagate as 500 to Next.js, caught by Next.js error instrumentation (`Sentry.captureRequestError` in `src/instrumentation.ts:13`). Would show up with `context=nextjs-api-route` tagging, not `context=streaming_abort`.
**Verdict:** Ruled out — tag shape doesn't match "result.onError".

### Path F — `ReadableStream` wrapper catch on a non-onChunk-throw reason
**Location:** `route.ts:492–499`. Catches anything from the `while (reader.read())` loop.
**Caught by:** Self. Captures with `tags.stage='stream_wrapper'`. Logs to Sentry. No fallback for the buyer unless `streamAbortedByLeak` was also flipped — if the wrapper catches an unrelated error (say, OpenAI socket drop mid-stream), the fallback Hinglish message is **not** enqueued (the `if (streamAbortedByLeak || streamAbortedByMarkdown)` guard at line 500 fails) and the buyer gets a truncated response with no fallback. That is a real but separate gap.

---

## 4. Sentry event hypothesis (ranked)

### (a) Double/triple-counting on an intentional leak abort — HIGH confidence
The `result.onError` name comes from AI SDK v6 calling our `onError` callback (which itself does `Sentry.captureException`) after we threw in `onChunk`. For a single buyer message that tripped `CONTACT_LEAK_PATTERN` or `BUSINESS_LEAK_PATTERN`, Sentry receives:
- 1 warning message (from `onChunk` before throw — line 247/252)
- 1 exception from `onError` (line 271)
- 1 exception from the wrapper catch (line 496)
= 3 events. Grouped by stacktrace, exception events land under `Error: Contact information leak detected` or `Error: Business information leak detected`. The "generic name" descriptor in the issue ticket is consistent with Sentry auto-grouping by the thrown `Error` without including our tags in the title.

**Why only one event in 2h?** Because leak aborts are rare — the patterns are narrow (phone regex, email regex, `commission rate|partner status|commission %`). One leak fire per 2h is plausible normal operation.

### (b) Upstream OpenAI transient error — MEDIUM confidence
GPT-4o occasionally drops connections or times out. The AI SDK v6 contract requires `onError` to be called, and ours dutifully captures. The 15s `abortSignal` or OpenAI's own 5xx could be the source. No tags in our capture call would distinguish this from Path A at the title level — it also groups as a generic error.

### (c) Real regression from I26 (audit dispatch loop) — LOW confidence
I26 added a for-loop that calls `Sentry.captureMessage` per violation (`route.ts:335–352`), all inside `onFinish`'s outer try/catch. `captureMessage` itself should not throw (Sentry is designed to be crash-safe), and even if it did, the `try { ... } catch (err) { console.error('onFinish error:', err) }` swallows it silently. **Does not produce a Sentry `result.onError` event.** Also, I26 landed in `3f066fe` dated 2026-04-23 — that's in the future relative to "today" (2026-04-21 per the environment context), so I26 may not yet be the deployed code. Worth confirming with the actual deploy hash.

### (d) Prisma write gap in `onFinish` — RULED OUT
Prisma failures inside `onFinish` are swallowed by the outer try/catch at `route.ts:282 / 467`. They never reach Sentry. Orthogonal gap worth filing but not the source of this event.

---

## 5. Recommendation: **SILENCE** (monitor first; code-fix if threshold breached)

**Reasoning.** The most likely root cause is Sentry noise inherent to our protective-leak pattern — `onChunk` throws → AI SDK calls `onError` → `onError` captures as exception, and the wrapper also catches → a second exception. Neither is a bug; both are load-bearing callbacks doing their jobs. But together they produce **3 Sentry events for 1 incident**, and the top-level grouping hides our `tags.leak_abort='true'` discriminator behind a generic error name.

Two distinct actions, in order of preference:

### 5a. Monitor first (no code change)
For the next 48h:
- If `result.onError`-shaped events stay at **≤ 2 per day** — this is expected noise. Leave alone.
- If **> 5 events in any 1h window** — escalate to a real fix (Path B/C worth a dedicated sprint).
- Specifically check whether the events carry `tags.leak_abort='true'`. If yes, Path A confirmed. If no, Path C (OpenAI transient) is more likely and deserves a dedicated retry-logic sprint.

### 5b. Minimum-diff silence (if threshold breached, or now if preferred)
Two concrete options, each a single-commit change:

**Option 1 — suppress duplicate capture in `onError`:**
```ts
// route.ts:266
onError: ({ error }) => {
  const message = error instanceof Error ? error.message : String(error)
  const isLeakAbort =
    message === CONTACT_LEAK_ABORT_MSG || message === BUSINESS_LEAK_ABORT_MSG
  const isMarkdownAbort = message === MARKDOWN_ABORT_MSG
  // Known-abort cases: captureMessage already fired inside onChunk. Skip
  // the Sentry.captureException to avoid double-counting.
  if (!isLeakAbort && !isMarkdownAbort) {
    Sentry.captureException(error, {
      tags: { context: 'streaming_abort', leak_abort: 'false', markdown_abort: 'false' },
    })
    console.error('streamText onError:', error)
  }
}
```

**Option 2 — suppress duplicate capture in the wrapper:**
```ts
// route.ts:492
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err)
  const isKnownAbort =
    msg === CONTACT_LEAK_ABORT_MSG ||
    msg === BUSINESS_LEAK_ABORT_MSG ||
    msg === MARKDOWN_ABORT_MSG
  if (!isKnownAbort) {
    Sentry.captureException(err, {
      tags: { context: 'streaming_abort', stage: 'stream_wrapper' },
    })
  }
}
```

Doing **both** is cleanest (1 event per incident: the `captureMessage` warning from `onChunk`), but even doing either one halves the event volume. Option 2 is slightly preferred because the `onError` callback is still useful for capturing genuine upstream errors (Path C) where the buyer-visible impact is real and debugging the stacktrace matters.

### 5c. Optional telemetry improvement (non-blocking)
Rename the message in `onError` to make Sentry's auto-grouping informative:
```ts
Sentry.captureException(error, {
  tags: { context: 'streaming_abort', ...},
  // Prepend tag to message so Sentry's issue title includes it:
  fingerprint: ['streaming_abort', isLeakAbort ? 'leak' : isMarkdownAbort ? 'markdown' : 'other'],
})
```
This doesn't reduce event volume but makes the Sentry dashboard readable at a glance — each category gets its own issue.

---

## 6. If FIX is preferred (follow-up sprint prompt)

Use this prompt for I29 (or whichever sprint number takes it):

> **I29 — Sentry capture dedup on known stream aborts**
>
> Source: I28 diagnostic (`docs/diagnostics/i28-on-error.md`) identified that every `CONTACT_LEAK` / `BUSINESS_LEAK` stream abort produces 3 Sentry events — 1 intentional `captureMessage` warning (`onChunk`) + 2 `captureException` duplicates (`onError` at `route.ts:271`, wrapper catch at `route.ts:496`). Goal: collapse to a single event per incident while preserving genuine error visibility.
>
> **Changes (single file, `src/app/api/chat/route.ts`):**
> 1. In `onError` (lines 266–281), guard the `Sentry.captureException` call so it only fires when `!isLeakAbort && !isMarkdownAbort`.
> 2. In the wrapper `catch` block (lines 492–499), check if the error's `.message` matches any of `CONTACT_LEAK_ABORT_MSG` / `BUSINESS_LEAK_ABORT_MSG` / `MARKDOWN_ABORT_MSG`; if so, skip the `Sentry.captureException`. Non-abort errors (OpenAI upstream / socket / timeout) still capture with `tags.stage='stream_wrapper'`.
> 3. No change to the `captureMessage` calls at lines 247/252 — those remain the single source of truth for leak-abort events.
>
> **Verification:**
> - `npm run build` — target passes, /chat bundle unchanged.
> - `npm test` — 70/70 passing (no test coverage on route.ts currently, but sanity-check the existing response-checker tests still pass).
> - Dry-run manually: post a message containing a 10-digit phone number pattern; verify Sentry receives exactly 1 event (the `[CONTACT_LEAK_DETECTED]` warning), not 3.
> - After deploy, confirm Sentry `streaming_abort` issue volume drops by ~2/3 over 24h.

---

## 7. Monitor-only threshold (if SILENCE chosen today)

Alert to this doc again if any of the following trigger:
- Sentry `result.onError`-shaped events exceed **5 in any 1h window**.
- Event title includes `tags.leak_abort='false'` AND `tags.markdown_abort='false'` — this rules out known-abort noise and suggests Path C (OpenAI upstream) or Path B (unexpected onChunk throw).
- Event title mentions `stream_wrapper` stage without a matching `onChunk` captureMessage within the same second — would indicate the wrapper is catching errors that `onError` missed, i.e. Path F (non-onChunk wrapper exception without fallback for the buyer).

---

## 8. Cited files

- `src/app/api/chat/route.ts` — stream pipeline, all error paths
  - Line 217: `streamAbortedByLeak` flag
  - Line 224: `streamAbortedByMarkdown` dead const
  - Line 228: `streamBuffer` accumulator
  - Line 237–265: `onChunk` handler with leak throws + buffer
  - Line 247: `Sentry.captureMessage('[CONTACT_LEAK_DETECTED]', 'warning')`
  - Line 248: `throw new Error(CONTACT_LEAK_ABORT_MSG)`
  - Line 252: `Sentry.captureMessage('[BUSINESS_LEAK_DETECTED]', 'warning')`
  - Line 253: `throw new Error(BUSINESS_LEAK_ABORT_MSG)`
  - Line 266–281: `onError` handler with unconditional `captureException`
  - Line 282–470: `onFinish` handler wrapped in try/catch — all Prisma/Resend errors swallowed
  - Line 335–352: I26 audit-violation loop (`captureMessage` per rule)
  - Line 478–505: `ReadableStream` wrapper with `reader.read()` loop and `catch` block
  - Line 496: second `Sentry.captureException` — source of double-count
- `src/lib/response-checker.ts` — exports `CONTACT_LEAK_PATTERN`, `BUSINESS_LEAK_PATTERN`, `MARKDOWN_PATTERN` used in `onChunk`
- `sentry.server.config.ts` — `Sentry.init` config. `enableLogs: true`, `tracesSampleRate: 0.1`, no `beforeSend` filter.
- `src/instrumentation.ts` — `export const onRequestError = Sentry.captureRequestError` (catches Next.js-level errors, not in-stream callbacks)
- `node_modules/ai/dist/index.d.ts:2702–2704` — AI SDK v6 `StreamTextOnErrorCallback` type contract: `(event: { error: unknown }) => PromiseLike<void> | void`. Confirms `result.onError` is the designated public API, not an internal crash.

---

## 9. Commits reviewed

- `c5ba4f0` (I8+I10) — introduced `onChunk` leak-abort + throw + `Sentry.captureMessage` warning. Both capture points (`onError`, wrapper catch) were introduced here simultaneously. **Double-counting has existed since I8** — not an I25/I26 regression.
- `7a1b12c` (HOTFIX NO_MARKDOWN) — demoted markdown abort from `onChunk` throw to audit-only. Did not change the `onError`/wrapper capture behavior. `streamAbortedByMarkdown` became dead `const false`. No new error paths added.
- `3f066fe` (I25+I26) — added audit-dispatch loop in `onFinish` (`route.ts:335–352`). All inside existing outer try/catch, so no new uncaught throws. I26 does NOT regress error handling.
- `007ee96` (HOTFIX-X anti-fabrication) — prompt-only (PART 8.5 hard locks). Zero lines changed in `route.ts`. Confirmed no stream-surface impact.

The double-count pattern predates the recent sprints by roughly 15 commits. If this is the first time a `result.onError` event has surfaced as unclear, the more likely change is **Sentry event volume** from elsewhere making this one more noticeable, not a code regression.
