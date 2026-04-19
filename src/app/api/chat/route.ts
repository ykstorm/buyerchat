import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { rateLimit } from '@/lib/rate-limit'
import { buildContextPayload } from '@/lib/context-builder'
import { buildSystemPrompt } from '@/lib/system-prompt'
import { classifyIntent } from '@/lib/intent-classifier'
import { buildDecisionCard } from '@/lib/decision-engine/decision-card-builder'
import { checkResponse } from '@/lib/response-checker'
import { sanitizeAdminInput } from '@/lib/sanitize'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { Resend } from 'resend'
import { randomUUID } from 'crypto'
import { z } from 'zod'

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

  // Cap message history — VULN-06 token overflow protection
  const cappedMessages = messages.slice(-15)

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

  // Classify intent
  const intent = classifyIntent(sanitizedMsg)

  // Build context
  let context
  try { context = await buildContextPayload() }
  catch (err) { console.error('Context build error:', err); return NextResponse.json({ error: 'Service temporarily unavailable.' }, { status: 503 }) }
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

  const result = streamText({
    model: openai('gpt-4o'),
    system: buildSystemPrompt(context, decisionCard, finalMemory),
    messages: cappedMessages,
    temperature: 0.3,
    maxOutputTokens: 500,
    onFinish: async ({ text, usage }) => {
      try {
        const projectNames = context.projects.map((p: any) => p.name)
        const { passed, violations } = checkResponse(text, projectNames, intent)
    
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
    
  const stream = result.toTextStreamResponse()
  return new Response(stream.body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'x-session-id': chatSession.id,
    }
  })
}