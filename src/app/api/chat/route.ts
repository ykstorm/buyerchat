import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { rateLimit } from '@/lib/rate-limit'
import { buildContextPayload, buildLocationGuardList } from '@/lib/context-builder'
import { buildSystemPrompt } from '@/lib/system-prompt'
import { SYSTEM_PROMPT_V2_LEGACY } from '@/lib/system-prompt-v2-archive'
import { retrieveChunks } from '@/lib/rag/retriever'
import { classifyIntent, detectHardCaptureIntent, STAGE_B_TRIGGER_SCRIPTS } from '@/lib/intent-classifier'
import { buildDecisionCard } from '@/lib/decision-engine/decision-card-builder'
import { checkResponse, CONTACT_LEAK_PATTERN, BUSINESS_LEAK_PATTERN, MARKDOWN_PATTERN } from '@/lib/response-checker'
import { sanitizeAdminInput } from '@/lib/sanitize'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { Resend } from 'resend'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'

const STREAM_ABORT_FALLBACK = 'Dekho, kuch problem hui. Dubara try karein.'
// P2-CRITICAL-8 Bug #3 — separate buyer-facing fallback for genuine stream
// errors (timeout, OpenAI 5xx, network blip). Distinct from leak/markdown
// abort fallback so the operator can tell them apart in Sentry.
const STREAM_TIMEOUT_FALLBACK =
  'Response thoda slow ho raha hai — sawaal dubara puchein ya thoda specific batayein.'
const CONTACT_LEAK_ABORT_MSG = 'Contact information leak detected'
const BUSINESS_LEAK_ABORT_MSG = 'Business information leak detected'
const MARKDOWN_ABORT_MSG = 'Markdown formatting detected'

const ChatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().max(2000),
  })).min(1).max(30),
  sessionId: z.string().nullish(),
})

const resend = new Resend(process.env.RESEND_API_KEY)
if (!process.env.ADMIN_EMAIL) {
  console.error('CRITICAL: ADMIN_EMAIL env var not set — admin routes are open to all users')
}

const INJECTION_KEYWORDS = [
  'ignore', 'pretend', 'jailbreak', 'dan', 'new rule',
  'from now on forget', 'act as if', 'no restrictions',
  'you are now', 'override', 'forget your instructions'
]

function detectStage(userMsg: string, aiResponse: string): string {
  const msg = userMsg.toLowerCase()
  const ai = aiResponse.toLowerCase()
  if (/visited|went to|site visit done|already visited|visit hua/i.test(msg)) return 'post_visit'
  if (/book.*token|otp.*visit|confirm.*visit|visit.*confirm/i.test(msg)) return 'pre_visit'
  if (/book|visit|otp|schedule|site pe|jaana hai/i.test(msg)) return 'visit_trigger'
  if (/finaliz|book.*flat|ready to buy|decision|le lenge|book kar|done deal/i.test(msg)) return 'decision'
  if (/compare|vs|versus|which is better|which one|dono mein/i.test(msg)) return 'comparison'
  if (/budget|afford|price|cost|loan|emi|kitne mein|kitna budget/i.test(msg)) return 'qualification'
  if (/tell me more|details|about|explain|aur batao|project ke baare/i.test(msg)) return 'project_disclosure'
  if (ai.includes('project_card') || ai.includes('strong buy') || ai.includes('honest concern')) return 'project_disclosure'
  return 'intent_capture'
}

function detectQualification(userMsg: string, aiResponse: string): boolean {
  return /budget|afford|lakh|crore|loan|emi/i.test(userMsg)
}

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
  if (!await rateLimit(ip, 30, 60 * 1000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a minute.' },
      { status: 429 }
    )
  }

  const session = await auth()
  const body = await req.json()
  const parsed = ChatRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }
  const messages = parsed.data.messages
  const incomingSessionId: string | null = parsed.data.sessionId ?? null
  // Filter out empty assistant turns — these come from prior client-side failures
  // and corrupt OpenAI's conversation interpretation, causing cascading empty responses.
  // Defense in depth: client should also filter, but this protects against malicious
  // or buggy clients that send malformed history.
  const cleanedMessages = messages.filter(m =>
    m.role !== 'assistant' || (m.content && m.content.trim().length > 0)
  )
  // Cap message history — VULN-06 token overflow protection
  const cappedMessages = cleanedMessages.slice(-15)

  // Get latest user message
  const latestMsg = cappedMessages[cappedMessages.length - 1]?.content ?? ''

  // Cap message length — VULN-07 token cost attack protection
  if (latestMsg.length > 800) {
    return NextResponse.json(
      { error: 'Message too long. Please keep questions under 800 characters.' },
      { status: 400 }
    )
  }

  // Injection detection — VULN-01 prompt injection
  const normalized = latestMsg
  .normalize('NFKC')
  .replace(/[\u200B-\u200D\uFEFF]/g, '')
  .replace(/\s+/g, ' ')
  .toLowerCase()

const hasInjection = INJECTION_KEYWORDS.some(kw => normalized.includes(kw))
if (hasInjection) {
  return NextResponse.json(
    { error: 'I can only help with South Bopal and Shela property questions.' },
    { status: 400 }
  )
}

  // Sanitize user message
  const sanitizedMsg = sanitizeAdminInput(latestMsg)

  // Classify intent + persona in one pass. Persona feeds PART 18 of the
  // system prompt and an investor-specific rule in response-checker.
  const classified = classifyIntent(sanitizedMsg)
  const intent = classified.intent
  const persona = classified.persona

  // Stage B hard-capture gate (Agent G — feature-flagged dark by default).
  // Mama 2026-04-28 lock: do nothing unless STAGE_B_ENABLED='true'. When on,
  // a hard-capture intent on an un-verified session short-circuits the stream
  // and returns a JSON {type:'capture_required',intent,message}. visit_booking_
  // attempt is detected for parity but skipped here — visits use the existing
  // VisitBooking flow.
  if (process.env.STAGE_B_ENABLED === 'true') {
    const hardIntent = detectHardCaptureIntent(sanitizedMsg)
    if (hardIntent && hardIntent !== 'visit_booking_attempt') {
      let stageBSession = incomingSessionId
        ? await prisma.chatSession.findUnique({
            where: { id: incomingSessionId },
            select: { id: true, captureStage: true },
          }).catch(() => null)
        : null
      if (!stageBSession) {
        stageBSession = await prisma.chatSession.create({
          data: {
            sessionId: randomUUID(),
            userId: session?.user?.id ?? null,
            userMessage: sanitizedMsg,
            aiResponse: '',
            intent,
          },
          select: { id: true, captureStage: true },
        })
      }
      if (stageBSession.captureStage !== 'verified') {
        try {
          await prisma.cRMEvent.create({
            data: {
              sessionId: stageBSession.id,
              kind: 'stage_b_triggered',
              channel: 'in_app',
              payload: { intent: hardIntent, query: sanitizedMsg.slice(0, 200) },
            },
          })
        } catch (err) { console.error('[STAGE_B] CRMEvent persist failed:', err) }
        return NextResponse.json(
          {
            type: 'capture_required',
            intent: hardIntent,
            message: STAGE_B_TRIGGER_SCRIPTS[hardIntent],
          },
          { headers: { 'x-session-id': stageBSession.id } }
        )
      }
    }
  }

  // Build context
  let context
  try { context = await buildContextPayload() }
  catch (err) { console.error('Context build error:', err); return NextResponse.json({ error: 'Service temporarily unavailable.' }, { status: 503 }) }

  // RAG retrieval — non-blocking: retriever has built-in 600ms timeout,
  // 0.30 cosine-similarity floor, and returns [] on any failure (including
  // unapplied migration / missing pgvector). Chat flow continues on empty.
  const retrieved = await retrieveChunks(sanitizedMsg, 6).catch(() => [])
  if (retrieved.length > 0) {
    console.log(`[RAG] Retrieved ${retrieved.length} chunks`)
  }

  // Amenity GUARD_LIST — runs a scoped LocationData lookup when the buyer's
  // query contains a category keyword (park/hospital/atm/bank/school/mall/
  // club/temple/transport). Returns empty string otherwise. Injected into
  // PART 11 of the system prompt to block hallucinated amenity names
  // (Sentry JS-NEXTJS-K — "Auda Garden", "CIMS Hospital", "Bopal Lake Park").
  const locationGuardList = await buildLocationGuardList(sanitizedMsg).catch((err) => {
    console.error('[GUARD_LIST] build failed:', err)
    return ''
  })

  const isComparison = /compare|vs|versus|which is better|which one/i.test(sanitizedMsg)
  let decisionCard = null
  if (isComparison && context.projects.length >= 2) {
    try {
      const lower = sanitizedMsg.toLowerCase()
      const allMessages = cappedMessages.map((m: any) => m.content).join(' ').toLowerCase()
      const mentioned = context.projects.filter((p: any) =>
        lower.includes((p.name ?? '').toLowerCase()) ||
        allMessages.includes((p.name ?? '').toLowerCase())
      )
      const pA = mentioned[0] ?? context.projects[0]
      const pB = mentioned[1] ?? context.projects[1]
      if (pA.id !== pB.id) {
        decisionCard = buildDecisionCard(sanitizedMsg, pA, pB)
      }
    } catch (e) {
      console.error('Decision engine failed:', e)
    }
  }

  // Create or find ChatSession upfront so we can return its ID in response headers
  let chatSession = incomingSessionId
    ? await prisma.chatSession.findUnique({ where: { id: incomingSessionId } })
    : null
  if (!chatSession) {
    chatSession = await prisma.chatSession.create({
      data: {
        sessionId: randomUUID(),
        userId: session?.user?.id ?? null,
        userMessage: sanitizedMsg,
        aiResponse: '',
        intent,
      }
    })
  }

  // Fetch buyer history for return memory
  let buyerMemory: string | null = null
  if (session?.user?.id && !incomingSessionId) {
    try {
      const prevSessions = await prisma.chatSession.findMany({
        where: { userId: session.user.id, NOT: { id: chatSession!.id } },
        orderBy: { lastMessageAt: 'desc' },
        take: 3,
        select: { buyerBudget: true, buyerConfig: true, buyerPersona: true, buyerStage: true, buyerPurpose: true }
      })
      if (prevSessions.length > 0) {
        const s = prevSessions[0]
        const parts = [
          s.buyerConfig && `looking at ${s.buyerConfig}`,
          s.buyerBudget && `budget ₹${Math.round(s.buyerBudget/100000)}L`,
          s.buyerPurpose && `for ${s.buyerPurpose}`,
          s.buyerPersona && s.buyerPersona !== 'unknown' && `persona: ${s.buyerPersona}`,
        ].filter(Boolean)
        if (parts.length > 0) buyerMemory = `Returning buyer. Last session: ${parts.join(', ')}. Stage reached: ${s.buyerStage}.`
      }
    } catch (err) { console.error('Buyer memory fetch error:', err) }
  }

  // Check if buyer has a completed visit needing feedback
  let postVisitContext: string | null = null
  if (session?.user?.id) {
    try {
      const completedVisit = await prisma.siteVisit.findFirst({
        where: { userId: session.user.id, visitCompleted: true },
        include: { project: { select: { projectName: true } } },
        orderBy: { createdAt: 'desc' }
      })
      if (completedVisit) {
        postVisitContext = `IMPORTANT: This buyer has completed a site visit to ${completedVisit.project.projectName}. If this is their first message after the visit, warmly ask how the visit went, what they liked/disliked, and whether they are ready to move forward. Be conversational and supportive, not pushy.`
      }
    } catch (err) { console.error('Post-visit context fetch error:', err) }
  }

  const finalMemory = postVisitContext ?? buyerMemory

  // Tracks whether the stream was aborted mid-response because a leak pattern
  // matched in onChunk. When true, onFinish should skip persistence of the
  // partial/empty assistant message and the response wrapper will deliver the
  // Hinglish fallback instead of the (possibly leaky) partial content.
  let streamAbortedByLeak = false
  // P2-CRITICAL-8 Bug #3 — track non-leak stream errors (timeout, OpenAI
  // 5xx, network) so the wrapper can serve a Hinglish fallback to the buyer
  // instead of an empty body. Without this, Sentry's onError fires AND the
  // wrapper's reader.read() throws, double-counting the same incident.
  let streamHadError = false
  let streamErrorKind: 'leak' | 'markdown' | 'timeout' | 'unknown' | null = null
  // Separate flag for markdown abort — same behavior (fallback + skip persist)
  // but a distinct Sentry tag so admins can distinguish format drift from
  // the stricter contact/business leak aborts.
  // Retained as const false after demoting NO_MARKDOWN from onChunk to
  // audit-only. Kept to preserve the existing onFinish / wrapper branches
  // without a larger refactor — they become dead branches but compile clean.
  const streamAbortedByMarkdown = false
  // Buffer assembled from text-delta chunks so multi-chunk markdown patterns
  // (e.g. `**bol` + `d**`) still match. The onChunk regex needs cross-delta
  // context; a per-delta test would miss patterns that straddle deltas.
  let streamBuffer = ''

  // Resolve system prompt version. Env override (SYSTEM_PROMPT_VERSION) wins
  // over the per-session field. Default is v3 — the 14-PART Mama spec with
  // Emotional Decision Engine. v2 is the legacy 18-PART body, kept for A/B
  // and replay of historical sessions.
  const envPromptVersion = process.env.SYSTEM_PROMPT_VERSION?.trim()
  const sessionPromptVersion = (chatSession as { systemPromptVersion?: string }).systemPromptVersion
  const resolvedPromptVersion = envPromptVersion || sessionPromptVersion || 'v3'
  const promptBuilder = resolvedPromptVersion === 'v2' ? SYSTEM_PROMPT_V2_LEGACY : buildSystemPrompt

  const result = streamText({
    model: openai('gpt-4o'),
    system: promptBuilder({ ...context, locationGuardList }, decisionCard, finalMemory, retrieved, persona),
    messages: cappedMessages,
    temperature: 0.3,
    maxOutputTokens: 500,
    // P2-CRITICAL-8 Bug #3 — bumped 15s → 25s. Cold gpt-4o + ~12K-token
    // system prompt (PART 0 + 14 numbered parts + RAG block + persona +
    // FINAL REMINDER) regularly takes 8-14s for first token. The old 15s
    // ceiling was firing on legit cost-breakdown / "kal 10" turns and
    // surfacing as result.onError noise in Sentry. 25s is enough headroom
    // for cold + slow turns without leaving truly stuck requests pinned.
    abortSignal: AbortSignal.timeout(25_000),
    onChunk: async ({ chunk }) => {
      if (chunk.type === 'text-delta') {
        // In AI SDK v6 the text-delta shape carries the string on `text`.
        // Keep the fallback to `delta` guarded in case the runtime shape
        // differs from the typings.
        const text = (chunk as { text?: string; delta?: string }).text
          ?? (chunk as { delta?: string }).delta
          ?? ''
        if (CONTACT_LEAK_PATTERN.test(text)) {
          streamAbortedByLeak = true
          Sentry.captureMessage('[CONTACT_LEAK_DETECTED] Streaming halted mid-response', 'warning')
          throw new Error(CONTACT_LEAK_ABORT_MSG)
        }
        if (BUSINESS_LEAK_PATTERN.test(text)) {
          streamAbortedByLeak = true
          Sentry.captureMessage('[BUSINESS_LEAK_DETECTED] Streaming halted mid-response', 'warning')
          throw new Error(BUSINESS_LEAK_ABORT_MSG)
        }
        // NO_MARKDOWN — DEMOTED from onChunk abort to audit-only after a
        // production incident where bullet-style replies ("\n* **Name**")
        // tripped the regex mid-stream and the fallback was concatenated
        // directly onto partial tokens ("...WestDekho, kuch problem hui").
        // Markdown drift is a formatting polish issue, not a safety issue
        // like CONTACT_LEAK / BUSINESS_LEAK — not worth truncating a
        // response in-flight. Kept post-stream audit in response-checker.
        // Buffer retained for potential future logging; not acted on here.
        streamBuffer += text
      }
    },
    onError: ({ error }) => {
      const message = error instanceof Error ? error.message : String(error)
      const isLeakAbort =
        message === CONTACT_LEAK_ABORT_MSG || message === BUSINESS_LEAK_ABORT_MSG
      const isMarkdownAbort = message === MARKDOWN_ABORT_MSG
      // P2-CRITICAL-8 Bug #3 — recognise AbortSignal timeouts so the wrapper
      // can serve the Hinglish "thoda slow" fallback. AbortError name is
      // emitted by AbortSignal.timeout when the deadline fires.
      const isTimeout =
        (error instanceof Error && error.name === 'AbortError') ||
        message.toLowerCase().includes('aborted') ||
        message.toLowerCase().includes('timeout')
      streamHadError = true
      streamErrorKind = isLeakAbort
        ? 'leak'
        : isMarkdownAbort
          ? 'markdown'
          : isTimeout
            ? 'timeout'
            : 'unknown'
      Sentry.captureException(error, {
        tags: {
          context: 'streaming_abort',
          leak_abort: String(isLeakAbort),
          markdown_abort: String(isMarkdownAbort),
          timeout: String(isTimeout),
        },
      })
      if (!isLeakAbort && !isMarkdownAbort) {
        console.error('streamText onError:', error)
      }
    },
    onFinish: async ({ text, usage }) => {
      try {
        // If the stream was aborted by a leak OR markdown drift, do NOT
        // persist the partial assistant message. We still record the
        // violation on the session so admins can audit the attempt.
        if (streamAbortedByLeak || streamAbortedByMarkdown) {
          const abortTag = streamAbortedByLeak
            ? 'CONTACT_LEAK_OR_BUSINESS_LEAK: stream aborted mid-response — CRITICAL'
            : 'NO_MARKDOWN: stream aborted mid-response — format drift'
          try {
            await prisma.chatSession.update({
              where: { id: chatSession!.id },
              data: {
                userMessage: sanitizedMsg,
                aiResponse: '',
                intent,
                responsePassedChecks: false,
                violations: [abortTag],
              }
            })
            await prisma.chatMessageLog.create({
              data: { sessionId: chatSession!.id, role: 'user', content: sanitizedMsg }
            })
          } catch (err) {
            console.error('onFinish (stream-abort) persistence error:', err)
          }
          return
        }

        const projectNames = context.projects.map((p: any) => p.name)
        // I25 — thread the in-context builder allowlist so FABRICATED_BUILDER
        // can distinguish "Venus Group" (known) from "Goyal & Co." (invented).
        const knownBuilderNames = Array.from(
          new Set(
            (context.projects as any[])
              .map(p => p.builderName)
              .filter((b: unknown): b is string => typeof b === 'string' && b.trim().length > 0)
          )
        )
        const { passed, violations } = checkResponse(
          text,
          projectNames,
          classified,
          sanitizedMsg,
          knownBuilderNames
        )

        // I26 — forward every audit violation to Sentry as a 'warning' event
        // with a stable tag schema so admins can filter by rule/persona.
        // CONTACT_LEAK / BUSINESS_LEAK are already captured inside onChunk
        // (stream was aborted mid-response) — skip them here to avoid double
        // counting. HALLUCINATION also already triggers an email alert but
        // has no Sentry coverage, so it's included.
        for (const v of violations) {
          // Rule name is the prefix before the first colon, e.g.
          // "PROJECT_LIMIT: 3 project_card CARDs exceeds 2-project limit"
          const ruleName = (v.split(':')[0] ?? 'UNKNOWN').trim()
          if (ruleName === 'CONTACT_LEAK' || ruleName === 'BUSINESS_LEAK') {
            // Already captured from onChunk with richer context; skip.
            continue
          }
          Sentry.captureMessage(`[${ruleName}] ${v}`, {
            level: 'warning',
            tags: {
              audit_violation: 'true',
              rule: ruleName.toLowerCase(),
              persona: classified.persona,
              intent: classified.intent,
            },
          })
        }

        // Update chat session with full response data
        const savedSession = await prisma.chatSession.update({
          where: { id: chatSession!.id },
          data: {
            userMessage: sanitizedMsg,
            aiResponse: text,
            intent,
            tokensUsed: usage.totalTokens,
            projectsMentioned: context.projects
              .filter((p: any) => text.toLowerCase().includes((p.name ?? '').toLowerCase()))
              .map((p: any) => p.id),
            responsePassedChecks: passed,
            violations,
          }
        })
    
        // Log messages to ChatMessageLog
        await prisma.chatMessageLog.create({
          data: { sessionId: savedSession.id, role: 'user', content: sanitizedMsg }
        })
        // Strip CARD HTML comment blocks before persisting — these are machinery
        // for the client artifact pipeline, not content the user should ever see.
        const cleanedAssistantContent = text.replace(/<!--CARD:[\s\S]*?-->/g, '').trimEnd()
        await prisma.chatMessageLog.create({
          data: {
            sessionId: savedSession.id,
            role: 'assistant',
            content: cleanedAssistantContent,
            tokensUsed: usage.totalTokens,
          }
        })
    
        // Extract buyer signals and update session metadata
        const budgetMatch = sanitizedMsg.match(/(\d+)\s*(lakh|L|Cr|crore)/i)
        const configMatch = sanitizedMsg.match(/([2345])\s*bhk/i)
        const investorMatch = /invest|rental|resale|returns|roi/i.test(sanitizedMsg)
        const familyMatch = /family|school|kids|children|end.use|self.use|ghar|home/i.test(sanitizedMsg)
        const purposeMatch = investorMatch ? 'investment' : familyMatch ? 'self-use' : null
        const qualDone = detectQualification(sanitizedMsg, text)
        await prisma.chatSession.update({
          where: { id: savedSession.id },
          data: {
            lastMessageAt: new Date(),
            buyerStage: detectStage(sanitizedMsg, text),
            ...(qualDone && { qualificationDone: true }),
            ...(budgetMatch && (() => {
              const raw = parseInt(budgetMatch[1])
              const multiplier = budgetMatch[2].toLowerCase().startsWith('cr') ? 10000000 : 100000
              const budget = raw * multiplier
              return budget <= 5000000000 ? { buyerBudget: budget } : {}
            })()),
            ...(configMatch && { buyerConfig: configMatch[1] + 'BHK' }),
            ...(investorMatch && { buyerPersona: 'investor' }),
            ...(familyMatch && !investorMatch && { buyerPersona: 'family' }),
            ...(purposeMatch && { buyerPurpose: purposeMatch }),
          }
        })

        // Track which projects were disclosed in this response
        try {
          const disclosedNames = (context.projects as any[])
            .filter((p: any) => p.name && text.toLowerCase().includes(p.name.toLowerCase()))
            .map((p: any) => p.id)
          if (disclosedNames.length > 0) {
            const current = await prisma.chatSession.findUnique({
              where: { id: savedSession.id },
              select: { projectsDisclosed: true }
            })
            const existing = current?.projectsDisclosed ?? []
            const merged = [...new Set([...existing, ...disclosedNames])]
            if (merged.length > existing.length) {
              await prisma.chatSession.update({
                where: { id: savedSession.id },
                data: { projectsDisclosed: merged }
              })
            }
          }
        } catch (err) { console.error('Projects disclosed tracking error:', err) }

        // Auto-name session from first meaningful message
        if (!chatSession?.customName && messages.length <= 2) {
          const autoName = sanitizedMsg.length > 6
            ? sanitizedMsg.slice(0, 40).replace(/[^\w\s₹]/g, '').trim()
            : null
          if (autoName) {
            await prisma.chatSession.update({
              where: { id: savedSession.id },
              data: { customName: autoName }
            })
          }
        }

        // Alert on critical violations
        const isCritical = violations.some(v =>
          v.includes('HALLUCINATION') || v.includes('CONTACT_LEAK')
        )
        if (isCritical) {
          if (process.env.ADMIN_EMAIL && process.env.FROM_EMAIL) {
            await resend.emails.send({
              to: process.env.ADMIN_EMAIL,
              from: process.env.FROM_EMAIL,
              subject: `CRITICAL: Homesty AI violation — ${violations[0]}`,
              text: [
                `Session: ${chatSession?.id ?? 'unknown'}`,
                `Violations: ${violations.join(' | ')}`,
                `User message: ${sanitizedMsg}`,
                `AI response (first 500 chars): ${text.slice(0, 500)}`,
              ].join('\n')
            })
          } else {
            console.error('ADMIN_EMAIL or FROM_EMAIL not set — alert not sent:', violations)
          }
        }
      } catch (err) {
        console.error('onFinish error:', err)
      }
    }
    })
    
  // Wrap the underlying text stream so we can convert a leak-abort into a
  // graceful Hinglish fallback instead of surfacing a truncated/leaky
  // response to the buyer. Pass-through for the happy path.
  const encoder = new TextEncoder()
  const source = result.toTextStreamResponse()
  const wrapped = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = source.body?.getReader()
      if (!reader) {
        controller.close()
        return
      }
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (streamAbortedByLeak || streamAbortedByMarkdown) break
          if (value) controller.enqueue(value)
        }
      } catch (err) {
        // P2-CRITICAL-8 Bug #3 — onError already captured + tagged. Re-
        // capturing here doubled Sentry events on every timeout. Skip the
        // duplicate when onError already saw the error; only capture for
        // truly novel wrapper-stage failures (which set neither flag).
        if (!streamAbortedByLeak && !streamAbortedByMarkdown && !streamHadError) {
          Sentry.captureException(err, {
            tags: { context: 'streaming_abort', stage: 'stream_wrapper' },
          })
        }
        // Mark as errored so the fallback branch below picks it up.
        streamHadError = true
        if (streamErrorKind === null) streamErrorKind = 'unknown'
      }
      // Buyer-facing fallback selection. Leak/markdown got the existing
      // STREAM_ABORT_FALLBACK; timeout / unknown errors get the gentler
      // "response slow" copy so the buyer knows to retry instead of
      // staring at "Kuch problem hui" with no guidance.
      if (streamAbortedByLeak || streamAbortedByMarkdown) {
        controller.enqueue(encoder.encode(STREAM_ABORT_FALLBACK))
      } else if (streamHadError) {
        const fallback =
          streamErrorKind === 'timeout' ? STREAM_TIMEOUT_FALLBACK : STREAM_ABORT_FALLBACK
        controller.enqueue(encoder.encode(fallback))
      }
      controller.close()
    },
  })

  return new Response(wrapped, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'x-session-id': chatSession.id,
    }
  })
}