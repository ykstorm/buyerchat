// Sprint 7.5 STEP D — capture distribution for raolakshyaraj22@gmail.com.
import { PrismaClient } from '@prisma/client'
import { PrismaNeonHttp } from '@prisma/adapter-neon'

const adapter = new PrismaNeonHttp(process.env.DATABASE_URL!, {})
const prisma = new PrismaClient({ adapter })

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'raolakshyaraj22@gmail.com' },
    select: { id: true },
  })
  if (!user) { console.log('no user'); return }

  const sessions = await prisma.chatSession.findMany({
    where: { userId: user.id },
    orderBy: { lastMessageAt: 'desc' },
    take: 20,
    select: {
      id: true,
      createdAt: true,
      lastMessageAt: true,
      captureStage: true,
      capturedName: true,
      capturedPhone: true,
      _count: { select: { messages: true } },
    },
  })

  const counts: Record<string, number> = { null: 0, soft: 0, skipped: 0, verified: 0 }
  for (const s of sessions) counts[s.captureStage ?? 'null']++

  console.log('Total sessions for this user:', sessions.length)
  console.log('captureStage distribution:', counts)
  console.log('Sessions with messages > 3 but captureStage=null:')
  for (const s of sessions) {
    if (s.captureStage === null && s._count.messages > 3) {
      console.log('  ', s.id.slice(0, 12), 'msgs:', s._count.messages,
                  'created:', s.createdAt.toISOString())
    }
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
