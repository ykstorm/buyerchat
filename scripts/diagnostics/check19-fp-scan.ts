// Sprint 4 false-positive scan — runs CHECK 19 logic against last 200
// ChatMessageLog rows and reports the FP rate. One-shot diagnostic.
import { PrismaClient } from '@prisma/client'
import { PrismaNeonHttp } from '@prisma/adapter-neon'

const adapter = new PrismaNeonHttp(process.env.DATABASE_URL!, {})
const prisma = new PrismaClient({ adapter })

// Mirror the regex in response-checker.ts CHECK 19
const NUMERIC_PRICE_PATTERN =
  /₹\s*\d[\d,]*\s*(?:\/sqft|\/sq\.?\s*ft|L|Cr|lakh|crore|k\/month|k per month|%)|\d+\.?\d*\s*%/i

async function main() {
  const allProjects = await prisma.project.findMany({
    where: { isActive: true },
    select: { projectName: true, minPrice: true },
  })
  const unverifiedNames = allProjects
    .filter(p => !(p.minPrice && p.minPrice > 0))
    .map(p => p.projectName)

  console.log(`Unverified projects (minPrice <= 0): ${unverifiedNames.length}`)
  console.log(unverifiedNames.slice(0, 10).map(n => `  - ${n}`).join('\n'))

  const logs = await prisma.chatMessageLog.findMany({
    where: { role: 'assistant' },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: { id: true, content: true },
  })

  let scanned = 0
  let flagged = 0
  const samples: Array<{ id: string; project: string; phrase: string; snippet: string }> = []

  for (const log of logs) {
    if (!log.content) continue
    scanned++
    for (const projectName of unverifiedNames) {
      if (!projectName?.trim()) continue
      const escaped = projectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const namePattern = new RegExp(escaped, 'i')
      const nameMatch = log.content.match(namePattern)
      if (!nameMatch || nameMatch.index === undefined) continue
      const nameIndex = nameMatch.index
      const window200 = log.content.slice(
        Math.max(0, nameIndex - 100),
        Math.min(log.content.length, nameIndex + projectName.length + 200)
      )
      const priceMatch = window200.match(NUMERIC_PRICE_PATTERN)
      if (priceMatch) {
        flagged++
        if (samples.length < 8) {
          samples.push({
            id: log.id,
            project: projectName,
            phrase: priceMatch[0],
            snippet: window200.slice(0, 200).replace(/\s+/g, ' ').trim(),
          })
        }
        break
      }
    }
  }

  const rate = scanned > 0 ? ((flagged / scanned) * 100).toFixed(1) : '0.0'
  console.log(`\nScanned: ${scanned} assistant messages`)
  console.log(`Flagged: ${flagged} (${rate}%)`)
  console.log(`Threshold for ship-as-is: <5%. ${parseFloat(rate) < 5 ? '[OK] Ship.' : '[NARROW] Tune in Sprint 5.'}`)
  if (samples.length > 0) {
    console.log('\nSample flagged messages:')
    for (const s of samples) {
      console.log(`  - ${s.id}: "${s.project}" near "${s.phrase}"`)
      console.log(`      snippet: ${s.snippet}`)
    }
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
