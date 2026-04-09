import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import { createRequire } from 'module'
import ws from 'ws'

const require = createRequire(import.meta.url)
const dotenv = require('dotenv')
dotenv.config()
neonConfig.webSocketConstructor = ws
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const fixes = [
  { name: 'Riviera Elite', date: new Date('2023-06-30'), flag: 'green' },
  { name: 'Riviera Woods', date: new Date('2024-06-30'), flag: 'green' },
  { name: 'Sky Villa', date: new Date('2024-03-31'), flag: 'green' },
  { name: 'Floris Villa', date: new Date('2019-03-31'), flag: 'green' },
  { name: 'Arcus Villa', date: new Date('2019-03-31'), flag: 'green' },
  { name: 'Vernis Villa', date: new Date('2019-03-31'), flag: 'green' },
  { name: 'Shaligram Prestige', date: new Date('2025-07-14'), flag: 'red' },
]

for (const fix of fixes) {
  await prisma.project.updateMany({
    where: { projectName: fix.name },
    data: { possessionDate: fix.date, possessionFlag: fix.flag }
  })
  console.log(`✅ Fixed: ${fix.name}`)
}

await prisma.$disconnect()
console.log('Done.')
