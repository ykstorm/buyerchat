/**
 * Seeds LocationData from the operator's verified Bopal/Shela insights doc.
 * Each row represents a ground-truth amenity the AI is allowed to name.
 *
 * Idempotent: uses @@unique(category, name, microMarket) for upsert.
 *
 * Ground truth categories: park, hospital, atm, bank, school, mall,
 * club, temple, transport.
 *
 * Usage:  node scripts/seed-location-data.mjs
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaNeonHttp } from '@prisma/adapter-neon'

const adapter = new PrismaNeonHttp(process.env.DATABASE_URL, {})
const prisma = new PrismaClient({ adapter })

// Operator's location insights doc — canonical seed for GUARD_LIST.
// microMarket values match Project.microMarket ('SBopal' | 'Shela' | 'Bopal').
// When an amenity serves both SBopal and Shela, we duplicate across both
// micromarkets so the per-area lookup in context-builder finds it regardless
// of how the buyer phrases the query.
const SEED = [
  // ── Parks ──────────────────────────────────────────────────────────────
  { category: 'park', name: 'Shaligram Oxygen Park', microMarket: 'SBopal', notes: 'Opened Jan 2025' },
  { category: 'park', name: 'Shaligram Oxygen Park', microMarket: 'Shela',  notes: 'Opened Jan 2025' },
  { category: 'park', name: 'Electrotherm Park',     microMarket: 'SBopal', notes: 'Opened Dec 2025, 11,600 sqmt' },
  { category: 'park', name: 'Electrotherm Park',     microMarket: 'Shela',  notes: 'Opened Dec 2025, 11,600 sqmt' },
  { category: 'park', name: 'AUDA Sky City',         microMarket: 'SBopal', notes: null },
  { category: 'park', name: 'AUDA Sky City',         microMarket: 'Shela',  notes: null },

  // ── Hospitals ──────────────────────────────────────────────────────────
  { category: 'hospital', name: 'Krishna Shalby Hospital', microMarket: 'SBopal', notes: '210-bed NABH accredited' },
  { category: 'hospital', name: 'Krishna Shalby Hospital', microMarket: 'Shela',  notes: '210-bed NABH accredited' },
  { category: 'hospital', name: 'Saraswati Hospital',      microMarket: 'SBopal', notes: null },
  { category: 'hospital', name: 'Saraswati Hospital',      microMarket: 'Shela',  notes: null },
  { category: 'hospital', name: 'Tej Hospital',            microMarket: 'SBopal', notes: null },
  { category: 'hospital', name: 'Tej Hospital',            microMarket: 'Shela',  notes: null },
  { category: 'hospital', name: 'HCG',                     microMarket: 'SBopal', notes: 'Oncology specialty' },
  { category: 'hospital', name: 'HCG',                     microMarket: 'Shela',  notes: 'Oncology specialty' },

  // ── Banks (treated as both bank and atm category — buyers use both terms) ─
  { category: 'bank', name: 'HDFC Bank',  microMarket: 'SBopal', notes: null },
  { category: 'bank', name: 'HDFC Bank',  microMarket: 'Shela',  notes: null },
  { category: 'bank', name: 'ICICI Bank', microMarket: 'SBopal', notes: null },
  { category: 'bank', name: 'ICICI Bank', microMarket: 'Shela',  notes: null },
  { category: 'bank', name: 'SBI',        microMarket: 'SBopal', notes: null },
  { category: 'bank', name: 'SBI',        microMarket: 'Shela',  notes: null },
  { category: 'bank', name: 'Axis Bank',  microMarket: 'SBopal', notes: null },
  { category: 'bank', name: 'Axis Bank',  microMarket: 'Shela',  notes: null },
  { category: 'bank', name: 'Kotak Bank', microMarket: 'SBopal', notes: null },
  { category: 'bank', name: 'Kotak Bank', microMarket: 'Shela',  notes: null },
  { category: 'bank', name: 'Union Bank', microMarket: 'SBopal', notes: null },
  { category: 'bank', name: 'Union Bank', microMarket: 'Shela',  notes: null },
  { category: 'bank', name: 'Bank of Baroda', microMarket: 'SBopal', notes: null },
  { category: 'bank', name: 'Bank of Baroda', microMarket: 'Shela',  notes: null },
  { category: 'bank', name: 'Yes Bank',   microMarket: 'SBopal', notes: null },
  { category: 'bank', name: 'Yes Bank',   microMarket: 'Shela',  notes: null },

  { category: 'atm', name: 'HDFC ATM',  microMarket: 'SBopal', notes: null },
  { category: 'atm', name: 'HDFC ATM',  microMarket: 'Shela',  notes: null },
  { category: 'atm', name: 'ICICI ATM', microMarket: 'SBopal', notes: null },
  { category: 'atm', name: 'ICICI ATM', microMarket: 'Shela',  notes: null },
  { category: 'atm', name: 'SBI ATM',   microMarket: 'SBopal', notes: null },
  { category: 'atm', name: 'SBI ATM',   microMarket: 'Shela',  notes: null },
  { category: 'atm', name: 'Axis ATM',  microMarket: 'SBopal', notes: null },
  { category: 'atm', name: 'Axis ATM',  microMarket: 'Shela',  notes: null },
  { category: 'atm', name: 'Kotak ATM', microMarket: 'SBopal', notes: null },
  { category: 'atm', name: 'Kotak ATM', microMarket: 'Shela',  notes: null },
  { category: 'atm', name: 'Union Bank ATM', microMarket: 'SBopal', notes: null },
  { category: 'atm', name: 'Union Bank ATM', microMarket: 'Shela',  notes: null },
  { category: 'atm', name: 'Bank of Baroda ATM', microMarket: 'SBopal', notes: null },
  { category: 'atm', name: 'Bank of Baroda ATM', microMarket: 'Shela',  notes: null },
  { category: 'atm', name: 'Yes Bank ATM', microMarket: 'SBopal', notes: null },
  { category: 'atm', name: 'Yes Bank ATM', microMarket: 'Shela',  notes: null },

  // ── Schools ────────────────────────────────────────────────────────────
  { category: 'school', name: 'Apollo International School', microMarket: 'SBopal', notes: 'CBSE, KG-12, near Marigold Circle' },
  { category: 'school', name: 'Apollo International School', microMarket: 'Shela',  notes: 'CBSE, KG-12' },
  { category: 'school', name: 'DPS Bopal',                   microMarket: 'Bopal',  notes: 'CBSE, KG-12' },
  { category: 'school', name: 'DPS Bopal',                   microMarket: 'SBopal', notes: 'CBSE, KG-12, ~0.8km from South Bopal' },
  { category: 'school', name: 'Shanti Asiatic School',       microMarket: 'Shela',  notes: 'CBSE, 1-12, off 200 Ft Ring Road' },
  { category: 'school', name: 'Shanti Asiatic School',       microMarket: 'SBopal', notes: 'CBSE, 1-12' },
  { category: 'school', name: 'Anant National University',   microMarket: 'Shela',  notes: null },
  { category: 'school', name: 'Anant National University',   microMarket: 'SBopal', notes: null },
  { category: 'school', name: 'MICA',                        microMarket: 'Shela',  notes: 'Management institute' },
  { category: 'school', name: 'MICA',                        microMarket: 'SBopal', notes: 'Management institute' },

  // ── Malls / shopping ───────────────────────────────────────────────────
  { category: 'mall', name: 'DMart Bopal',  microMarket: 'Bopal',  notes: null },
  { category: 'mall', name: 'DMart Bopal',  microMarket: 'SBopal', notes: null },
  { category: 'mall', name: 'TRP Mall',     microMarket: 'SBopal', notes: null },
  { category: 'mall', name: 'TRP Mall',     microMarket: 'Shela',  notes: null },
  { category: 'mall', name: 'SoBo Centre',  microMarket: 'SBopal', notes: null },
  { category: 'mall', name: 'SoBo Centre',  microMarket: 'Shela',  notes: null },
  { category: 'mall', name: 'Palladium',    microMarket: 'SBopal', notes: null },
  { category: 'mall', name: 'Palladium',    microMarket: 'Shela',  notes: null },

  // ── Clubs / gyms / sports ──────────────────────────────────────────────
  { category: 'club', name: 'Gala Gymkhana',     microMarket: 'SBopal', notes: null },
  { category: 'club', name: 'Gala Gymkhana',     microMarket: 'Shela',  notes: null },
  { category: 'club', name: 'Club O7',           microMarket: 'Shela',  notes: null },
  { category: 'club', name: 'Club O7',           microMarket: 'SBopal', notes: null },
  { category: 'club', name: 'Karnavati Club',    microMarket: 'SBopal', notes: null },
  { category: 'club', name: 'Karnavati Club',    microMarket: 'Shela',  notes: null },
  { category: 'club', name: 'Rajpath Club',      microMarket: 'SBopal', notes: null },
  { category: 'club', name: 'Rajpath Club',      microMarket: 'Shela',  notes: null },

  // ── Temples ────────────────────────────────────────────────────────────
  { category: 'temple', name: 'Shri Bhidbhanjan Hanumanji Temple', microMarket: 'SBopal', notes: null },
  { category: 'temple', name: 'Shri Bhidbhanjan Hanumanji Temple', microMarket: 'Shela',  notes: null },
  { category: 'temple', name: 'Shri Bhidbhanjan Hanumanji Temple', microMarket: 'Bopal',  notes: null },

  // ── Transport ──────────────────────────────────────────────────────────
  { category: 'transport', name: 'Bopal BRTS',                   microMarket: 'Bopal',  notes: 'BRTS stop, every 8-12 min' },
  { category: 'transport', name: 'Bopal BRTS',                   microMarket: 'SBopal', notes: 'BRTS stop, every 8-12 min' },
  { category: 'transport', name: 'Bopal BRTS',                   microMarket: 'Shela',  notes: 'BRTS stop, every 8-12 min' },
  { category: 'transport', name: 'Metro Bopal Station',          microMarket: 'Bopal',  notes: '~1.2km, 2027 expected' },
  { category: 'transport', name: 'Metro Bopal Station',          microMarket: 'SBopal', notes: '~1.2km, 2027 expected' },
  { category: 'transport', name: 'Metro Bopal Station',          microMarket: 'Shela',  notes: '~1.2km, 2027 expected' },
]

async function main() {
  console.log(`[seed-location-data] Seeding ${SEED.length} rows into LocationData...`)

  // Snapshot BEFORE state for audit
  const before = await prisma.locationData.findMany({
    where: { microMarket: { in: ['SBopal', 'Shela', 'Bopal'] } },
    select: { category: true, name: true, microMarket: true },
  })
  console.log(`[seed-location-data] Current rows: ${before.length}`)

  let inserted = 0
  let updated = 0
  for (const row of SEED) {
    const existing = await prisma.locationData.findUnique({
      where: {
        category_name_microMarket: {
          category: row.category,
          name: row.name,
          microMarket: row.microMarket,
        },
      },
    })
    await prisma.locationData.upsert({
      where: {
        category_name_microMarket: {
          category: row.category,
          name: row.name,
          microMarket: row.microMarket,
        },
      },
      create: row,
      update: { notes: row.notes },
    })
    if (existing) updated++
    else inserted++
  }

  const total = await prisma.locationData.count()
  console.log(`[seed-location-data] Done. Inserted=${inserted}, Updated=${updated}, Total rows in table=${total}`)

  await prisma.$disconnect()
}

main().catch(err => {
  console.error('[seed-location-data] Fatal:', err)
  process.exit(1)
})
