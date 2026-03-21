import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { rateLimit } from '@/lib/rate-limit'
import { buildContextPayload } from '@/lib/context-builder'
import { buildSystemPrompt } from '@/lib/system-prompt'
import { classifyIntent } from '@/lib/intent-classifier'
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
  if (!rateLimit(ip, 10, 60 * 1000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a minute.' },
      { status: 429 }
    )
  }

  const session = await auth()
  const body = await req.json()
  const messages = body.messages

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
  const lowerMsg = latestMsg.toLowerCase()
  const hasInjection = INJECTION_KEYWORDS.some(kw => lowerMsg.includes(kw))
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
  const context = await buildContextPayload()
  const systemPrompt = buildSystemPrompt(context)

  // Session ID for logging
  const sessionId = body.sessionId ?? randomUUID()

  const result = streamText({
    model: openai('gpt-4o'),
    system: systemPrompt,
    messages: cappedMessages,
    temperature: 0.3,
    maxOutputTokens: 500,
    onFinish: async ({ text, usage }) => {
      try {
        const projectNames = context.projects.map((p: any) => p.name)
        const { passed, violations } = checkResponse(text, projectNames, intent)

        // Save chat session
        await prisma.chatSession.create({
          data: {
            sessionId,
            userId: session?.user?.id ?? null,
            userMessage: sanitizedMsg,
            aiResponse: text,
            intent,
            tokensUsed: usage.totalTokens,
            projectsMentioned: projectNames.filter((n: string) =>
              text.toLowerCase().includes(n.toLowerCase())
            ),
            responsePassedChecks: passed,
            violations,
          }
        })

        // Alert on critical violations
        const isCritical = violations.some(v =>
          v.includes('HALLUCINATION') || v.includes('CONTACT_LEAK')
        )
        if (isCritical) {
          await resend.emails.send({
            to: process.env.ADMIN_EMAIL!,
            from: process.env.FROM_EMAIL!,
            subject: `CRITICAL: BuyerChat AI violation — ${violations[0]}`,
            text: [
              `Session: ${sessionId}`,
              `Violations: ${violations.join(' | ')}`,
              `User message: ${sanitizedMsg}`,
              `AI response (first 500 chars): ${text.slice(0, 500)}`,
            ].join('\n')
          })
        }
      } catch (err) {
        console.error('onFinish error:', err)
      }
    }
  })

  return result.toTextStreamResponse()
}