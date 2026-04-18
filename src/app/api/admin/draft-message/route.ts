import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { sessionId } = await req.json()

    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 5 } }
    })

    if (!chatSession) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const context = `
Buyer stage: ${chatSession.buyerStage}
Budget: ${chatSession.buyerBudget ? '₹' + Math.round(chatSession.buyerBudget/100000) + 'L' : 'unknown'}
Config: ${chatSession.buyerConfig ?? 'unknown'}
Persona: ${chatSession.buyerPersona ?? 'unknown'}
Purpose: ${chatSession.buyerPurpose ?? 'unknown'}
Days silent: calculated from last message
Last messages: ${chatSession.messages.map(m => m.role + ': ' + m.content.slice(0, 100)).join('\n')}
`

    const stageActions: Record<string, string> = {
      post_visit: 'Write a warm post-visit follow-up. Ask how they felt about the project. Keep it personal and short.',
      qualification: 'Write a message to send a personalised shortlist. Mention their budget and config.',
      comparison: 'Write a message asking which project felt stronger to them.',
      visit_trigger: 'Write a message to confirm their site visit interest and offer to book.',
      pre_visit: 'Write a pre-visit briefing message. What to check, what questions to ask.',
      decision: 'Write a supportive message helping them finalize. Address any concerns.',
      project_disclosure: 'Write a curiosity hook message to re-engage the buyer.',
      intent_capture: 'Write a qualifying message to understand their purpose and budget.',
    }

    const instruction = stageActions[chatSession.buyerStage] ?? 'Write a friendly re-engagement message.'

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 150,
      messages: [{
        role: 'system',
        content: `You are Balvir Singh, a trusted property advisor at Homesty.ai, Ahmedabad. Mirror the buyer's language — English if they wrote English, Hinglish if they wrote Hinglish, Hindi if they wrote Hindi. Keep it warm, personal, under 100 words. Never mention commission. Never share builder phone numbers. Sign off as "Balvir bhai" or similar.`
      }, {
        role: 'user',
        content: `Buyer context:\n${context}\n\nTask: ${instruction}`
      }]
    })

    const draft = completion.choices[0]?.message?.content ?? ''
    return NextResponse.json({ draft })
  } catch (err: any) {
    console.error('Draft message error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed to generate draft' }, { status: 500 })
  }
}
