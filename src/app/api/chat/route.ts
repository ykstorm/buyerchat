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

const resend = new Resend(process.env.RESEND_API_KEY)

const INJECTION_KEYWORDS = [
  'ignore', 'pretend', 'jailbreak', 'dan', 'new rule',
  'from now on forget', 'act as if', 'no restrictions',
  'you are now', 'override', 'forget your instructions'
]

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
  if (!await rateLimit(ip, 10, 60 * 1000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a minute.' },
      { status: 429 }
    )
  }

  const session = await auth()
  const body = await req.json()
  const messages = body.messages
  const incomingSessionId: string | null = body.sessionId ?? null

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

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
  catch { return NextResponse.json({ error: 'Service temporarily unavailable.' }, { status: 503 }) }
  const isComparison = /compare|vs|versus|which is better|which one/i.test(sanitizedMsg)
  let decisionCard = null
  if (isComparison) {
    try {
      const result = await buildDecisionCard({
        budget: session?.buyerBudget ?? undefined,
        persona: session?.buyerPersona ?? undefined,
        projects: context.projects,
        userMessage: sanitizedMsg
      })
      decisionCard = result
    } catch (e) { console.error('Decision engine failed:', e) }
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

  const result = streamText({
    model: openai('gpt-4o'),
    system: buildSystemPrompt(context, decisionCard),
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
        await prisma.chatMessageLog.create({
          data: {
            sessionId: savedSession.id,
            role: 'assistant',
            content: text,
            tokensUsed: usage.totalTokens,
          }
        })
    
        // Extract buyer signals and update session metadata
        const budgetMatch = sanitizedMsg.match(/(\d+)\s*(lakh|L|Cr|crore)/i)
        const configMatch = sanitizedMsg.match(/([234])\s*bhk/i)
        const investorMatch = /invest|rental|resale|returns|roi/i.test(sanitizedMsg)
        const familyMatch = /family|school|kids|children|end.use|self.use/i.test(sanitizedMsg)
        await prisma.chatSession.update({
          where: { id: savedSession.id },
          data: {
            lastMessageAt: new Date(),
            ...(budgetMatch && { buyerBudget: parseInt(budgetMatch[1]) * (budgetMatch[2].toLowerCase().startsWith('cr') ? 10000000 : 100000) }),
            ...(configMatch && { buyerConfig: configMatch[1] + 'BHK' }),
            ...(investorMatch && { buyerPersona: 'investor' }),
            ...(familyMatch && !investorMatch && { buyerPersona: 'family' }),
          }
        })
    
        // Alert on critical violations
        const isCritical = violations.some(v =>
          v.includes('HALLUCINATION') || v.includes('CONTACT_LEAK')
        )
        if (isCritical) {
          if (process.env.ADMIN_EMAIL && process.env.FROM_EMAIL) {
            await resend.emails.send({
              to: process.env.ADMIN_EMAIL,
              from: process.env.FROM_EMAIL,
              subject: `CRITICAL: BuyerChat AI violation — ${violations[0]}`,
              text: [
                `Session: ${sessionId}`,
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