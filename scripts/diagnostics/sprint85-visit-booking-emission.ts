// Sprint 8.5 STEP D — inspect recent visit-booking flow sessions to determine
// whether visit_booking CARD blocks made it into messages + artifactHistory.
import { PrismaClient } from '@prisma/client'
import { PrismaNeonHttp } from '@prisma/adapter-neon'

const adapter = new PrismaNeonHttp(process.env.DATABASE_URL!, {})
const prisma = new PrismaClient({ adapter })

async function main() {
  const sessions = await prisma.chatSession.findMany({
    where: {
      OR: [
        { userMessage: { contains: 'Visit book karna hai', mode: 'insensitive' } },
        { messages: { some: { content: { contains: 'Visit book karna hai', mode: 'insensitive' } } } },
      ],
    },
    orderBy: { lastMessageAt: 'desc' },
    take: 8,
    select: {
      id: true,
      lastMessageAt: true,
      userId: true,
      artifactHistory: true,
      messages: {
        select: { role: true, content: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  for (const s of sessions) {
    const hist = Array.isArray(s.artifactHistory) ? (s.artifactHistory as any[]) : []
    const histTypes = hist.map(a => a?.type).filter(Boolean)
    const assistantMessages = s.messages.filter(m => m.role === 'assistant')
    const cardBlocksInMessages: string[] = []
    for (const am of assistantMessages) {
      const matches = am.content?.matchAll(/<!--CARD:(\{[^}]+\})-->/g) ?? []
      for (const m of matches) {
        try {
          const parsed = JSON.parse(m[1])
          cardBlocksInMessages.push(parsed.type)
        } catch { /* malformed */ }
      }
    }
    const visitBookKickoff = s.messages.find(m =>
      m.role === 'user' && m.content?.startsWith('Visit book karna hai')
    )
    const aiResponseAfter = visitBookKickoff
      ? s.messages.find(m =>
          m.role === 'assistant' && m.createdAt > visitBookKickoff.createdAt
        )
      : null
    console.log(JSON.stringify({
      sessionId: s.id.slice(0, 12),
      lastMessageAt: s.lastMessageAt.toISOString(),
      signedIn: !!s.userId,
      visitBookKickoffAt: visitBookKickoff?.createdAt.toISOString() ?? null,
      kickoffMsg: visitBookKickoff?.content?.slice(0, 80) ?? null,
      aiResponsePreview: aiResponseAfter?.content?.slice(0, 200) ?? null,
      cardBlocksInAllMessages: cardBlocksInMessages,
      artifactHistoryTypes: histTypes,
      hasVisitBookingInHistory: histTypes.includes('visit_booking'),
      hasVisitBookingInMessages: cardBlocksInMessages.includes('visit_booking'),
    }))
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
