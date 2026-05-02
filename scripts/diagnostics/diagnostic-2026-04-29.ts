import { prisma } from '@/lib/prisma'
import { retrieveChunks } from '@/lib/rag/retriever'

async function main() {
  console.log('=== B1 Embedding stats ===')
  const total = await prisma.embedding.count()
  const bySource = await prisma.embedding.groupBy({ by: ['sourceType'], _count: { _all: true } })
  const newest = await prisma.embedding.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true, sourceType: true } })
  const oldest = await prisma.embedding.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } })
  console.log('total:', total)
  console.log('bySource:', JSON.stringify(bySource))
  console.log('newest:', JSON.stringify(newest))
  console.log('oldest:', JSON.stringify(oldest))

  console.log('\n=== B3 RAG smoke ===')
  const queries = ['total kitna padega for The Planet', '3BHK Shela family budget', 'show me a project', 'amenity park near Shela']
  for (const q of queries) {
    try {
      const chunks = await retrieveChunks(q)
      console.log(q, '->', chunks.length, 'chunks; topSim=', chunks[0]?.similarity?.toFixed(3), 'sources=', chunks.map(c => c.sourceType).join(','))
    } catch (e) {
      console.log(q, '-> ERR', String(e))
    }
  }

  console.log('\n=== C2 prod pattern hits (ChatMessageLog) ===')
  const patterns = ['visit request note ho gaya', 'mobile number share karein', 'calculation unlock', 'request note ho gaya', 'OTP bheja hai', 'OTP enter', 'Preferred slot']
  for (const p of patterns) {
    const hits = await prisma.chatMessageLog.count({ where: { role: 'assistant', content: { contains: p } } })
    console.log(p, '->', hits)
  }

  console.log('\n=== D4 SavedProject ===')
  const totalSaves = await prisma.savedProject.count()
  const distinctUsers = await prisma.savedProject.groupBy({ by: ['userId'], _count: { _all: true } })
  const latest = await prisma.savedProject.findFirst({ orderBy: { createdAt: 'desc' }, include: { project: { select: { id: true, projectName: true, minPrice: true, builderName: true, decisionTag: true } } } })
  console.log('total saves:', totalSaves)
  console.log('distinct users:', distinctUsers.length)
  console.log('latest:', JSON.stringify(latest, null, 2))

  console.log('\n=== E2 OtpCode ===')
  const otpRows = await prisma.otpCode.count()
  console.log('OtpCode rows:', otpRows)

  console.log('\n=== F2 session distribution ===')
  const sessions = await prisma.chatSession.findMany({ orderBy: { createdAt: 'desc' }, take: 50, select: { buyerStage: true, buyerPersona: true } })
  const stages: Record<string, number> = {}
  const personas: Record<string, number> = {}
  for (const s of sessions) {
    stages[s.buyerStage || 'null'] = (stages[s.buyerStage || 'null'] || 0) + 1
    personas[s.buyerPersona || 'null'] = (personas[s.buyerPersona || 'null'] || 0) + 1
  }
  console.log('count:', sessions.length)
  console.log('buyerStage:', JSON.stringify(stages))
  console.log('buyerPersona:', JSON.stringify(personas))

  await prisma.$disconnect()
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1) })
