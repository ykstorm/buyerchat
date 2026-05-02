// Sprint 8.5 STEP D follow-up — inspect actual artifactHistory payload shape
// for Lakshya's recent visit-booking session to determine if hydrateArtifacts
// can join the persisted projectId back to a project.
import { PrismaClient } from '@prisma/client'
import { PrismaNeonHttp } from '@prisma/adapter-neon'

const adapter = new PrismaNeonHttp(process.env.DATABASE_URL!, {})
const prisma = new PrismaClient({ adapter })

async function main() {
  const session = await prisma.chatSession.findFirst({
    where: { id: { startsWith: 'cmonh82o2' } },
    select: { id: true, artifactHistory: true },
  })
  if (!session) {
    // Try the other recent one
    const alt = await prisma.chatSession.findFirst({
      where: { id: { startsWith: 'cmonh27t4' } },
      select: { id: true, artifactHistory: true },
    })
    console.log('alt session:', alt?.id)
    console.log('payloads:', JSON.stringify(alt?.artifactHistory, null, 2))
    return
  }
  console.log('session:', session.id)
  console.log('payloads:', JSON.stringify(session.artifactHistory, null, 2))

  const projects = await prisma.project.findMany({
    where: { projectName: 'Riviera Bliss' },
    select: { id: true, projectName: true, isActive: true, minPrice: true },
  })
  console.log('Riviera Bliss in DB:')
  for (const p of projects) console.log('  ', p)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
