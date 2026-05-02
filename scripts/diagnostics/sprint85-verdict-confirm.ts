// Sprint 8.5 verdict confirmation — find Lakshya's most recent
// "Visit book karna hai — Riviera Bliss" session and report whether
// artifactHistory got the visit_booking entry. Distinguishes Case C
// (entry present, live render dropped) from Case A/B (entry missing).
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
      user: { email: 'raolakshyaraj22@gmail.com' },
    },
    orderBy: { lastMessageAt: 'desc' },
    take: 5,
    select: {
      id: true,
      lastMessageAt: true,
      userMessage: true,
      artifactHistory: true,
      messages: {
        where: {
          OR: [
            { content: { contains: 'Visit book karna hai' } },
            { content: { contains: 'Visit set kar dete' } },
            { content: { contains: 'niche slot select' } },
          ],
        },
        orderBy: { createdAt: 'asc' },
        select: { role: true, content: true, createdAt: true },
      },
    },
  })
  for (const s of sessions) {
    const hist = Array.isArray(s.artifactHistory) ? (s.artifactHistory as any[]) : []
    const visitBookingEntries = hist.filter(a => a?.type === 'visit_booking')
    console.log(JSON.stringify({
      sessionId: s.id.slice(0, 12),
      lastMessageAt: s.lastMessageAt.toISOString(),
      kickoffMsg: s.userMessage?.slice(0, 80) ?? null,
      artifactHistoryTypes: hist.map(a => a?.type).filter(Boolean),
      visitBookingCount: visitBookingEntries.length,
      visitBookingProjectIds: visitBookingEntries.map(a => a?.projectId).filter(Boolean),
      relevantMessages: s.messages.map(m => ({
        role: m.role,
        preview: m.content?.slice(0, 100),
      })),
    }, null, 2))
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
