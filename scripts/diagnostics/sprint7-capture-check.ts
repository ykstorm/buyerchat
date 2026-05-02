// Sprint 7 STEP 7.D — read-only DB check on capture state across recent sessions.
import { PrismaClient } from '@prisma/client'
import { PrismaNeonHttp } from '@prisma/adapter-neon'

const adapter = new PrismaNeonHttp(process.env.DATABASE_URL!, {})
const prisma = new PrismaClient({ adapter })

async function main() {
  const recent = await prisma.chatSession.findMany({
    orderBy: { lastMessageAt: 'desc' },
    take: 10,
    select: {
      id: true,
      createdAt: true,
      lastMessageAt: true,
      userId: true,
      captureStage: true,
      capturedName: true,
      capturedPhone: true,
      artifactHistory: true,
      user: { select: { name: true, email: true } },
    },
  })
  for (const s of recent) {
    const hist = Array.isArray(s.artifactHistory) ? (s.artifactHistory as any[]) : []
    const types = hist.map(a => a?.type).filter(Boolean)
    console.log(JSON.stringify({
      id: s.id.slice(0, 12),
      lastMessageAt: s.lastMessageAt.toISOString(),
      signedIn: !!s.userId,
      userEmail: s.user?.email ?? null,
      captureStage: s.captureStage,
      capturedName: s.capturedName,
      capturedPhone: s.capturedPhone ? `${s.capturedPhone.slice(0, 4)}...${s.capturedPhone.slice(-2)}` : null,
      artifactCount: hist.length,
      artifactTypes: types,
    }))
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
