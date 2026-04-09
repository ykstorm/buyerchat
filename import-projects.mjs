// BuyerChat — Bulk Project Import Script
// Run from project root: node import-projects.mjs
// Requires: DATABASE_URL in .env

import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const dotenv = require('dotenv')
dotenv.config()

import ws from 'ws'
neonConfig.webSocketConstructor = ws

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// ── FIELD MAPPING: CSV → Our DB schema ─────────────────────────
// CSV field         → DB field
// name              → projectName
// builder           → builderName (must match exact Builder.builderName in DB)
// zone              → microMarket
// units             → availableUnits
// bsp_sqft          → pricePerSqft
// min_price_lakh    → minPrice (convert: lakh * 100000)
// max_price_lakh    → maxPrice (convert: lakh * 100000)
// possession_date   → possessionDate (parse to DateTime)
// possession_flag   → possessionFlag
// rera_number       → reraNumber
// rera_status       → constructionStatus (use this as status)
// delivery_score    → NOT in Project schema — goes to Builder scores only
// trust_score       → NOT in Project schema directly
// decision_tag      → decisionTag
// honest_concern    → honestConcern
// analyst_note      → analystNote
// configurations    → configurations
// bank_approvals    → bankApprovals
// carpet_sqft       → carpetSqftMin
// sba_sqft          → sbaSqftMin

// ── BUILDER NAME MAPPING: CSV builder name → DB builderName ────
const BUILDER_MAP = {
  'Goyal & Co. · HN Safal': 'Goyal & Co. / HN Safal',
  'Shaligram Group': 'Shaligram Group',
  'Vishwanath Builders': 'Vishwanath Builders',
  'Dev Infinity Buildcon': 'Dev Infinity Buildcon',
  'Sundaram Landscape LLP (Venus Group)': 'Venus Group',
}

// ── PARSE POSSESSION DATE ──────────────────────────────────────
function parsePossessionDate(raw) {
  if (!raw) return new Date('2030-12-31')
  
  // Extract just the date part before any parentheses
  const clean = raw.split('(')[0].trim()
  
  // Try DD-MM-YYYY format
  const ddmmyyyy = clean.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (ddmmyyyy) {
    return new Date(`${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`)
  }
  
  // Try Month YYYY format (e.g. "December 2030")
  const monthYear = clean.match(/^(\w+)\s+(\d{4})$/)
  if (monthYear) {
    return new Date(`${monthYear[1]} 1, ${monthYear[2]}`)
  }
  
  // Try YYYY-MM-DD
  const isoDate = clean.match(/^\d{4}-\d{2}-\d{2}$/)
  if (isoDate) return new Date(clean)
  
  // Fallback
  console.warn(`  ⚠️  Could not parse date: "${raw}" — using 2030-12-31`)
  return new Date('2030-12-31')
}

// ── PARSE NUMBER SAFELY ────────────────────────────────────────
function safeInt(val) {
  if (!val || val === '') return null
  const n = parseInt(val, 10)
  return isNaN(n) ? null : n
}

function safeFloat(val) {
  if (!val || val === '') return null
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

// ── MAIN IMPORT ────────────────────────────────────────────────
async function main() {
  console.log('🚀 BuyerChat Project Import Starting...\n')

  // Read CSV
  const csvContent = readFileSync('./import-projects.csv', 'utf-8')
  const rows = parse(csvContent, { columns: true, skip_empty_lines: true })
  console.log(`📋 Found ${rows.length} projects in CSV\n`)

  // Verify all builders exist in DB first
  console.log('🔍 Verifying builders in DB...')
  const dbBuilders = await prisma.builder.findMany({ select: { builderName: true } })
  const dbBuilderNames = dbBuilders.map(b => b.builderName)
  console.log('   DB builders:', dbBuilderNames)
  
  let allBuildersFound = true
  for (const row of rows) {
    const mapped = BUILDER_MAP[row.builder] || row.builder
    if (!dbBuilderNames.includes(mapped)) {
      console.error(`   ❌ Builder not found in DB: "${row.builder}" (mapped: "${mapped}")`)
      allBuildersFound = false
    }
  }
  
  if (!allBuildersFound) {
    console.error('\n❌ Some builders missing from DB. Add them first, then re-run.')
    process.exit(1)
  }
  console.log('   ✅ All builders verified\n')

  // Import projects
  let inserted = 0
  let skipped = 0
  let errors = 0

  for (const row of rows) {
    const builderName = BUILDER_MAP[row.builder] || row.builder
    const projectName = row.name.trim()
    
    console.log(`📦 Processing: ${projectName}`)

    // Check if already exists
    const existing = await prisma.project.findFirst({
      where: { projectName }
    })

    if (existing) {
      console.log(`   ⏭️  Already exists — updating`)
      try {
        await prisma.project.update({
          where: { id: existing.id },
          data: {
            builderName,
            microMarket: row.zone || 'Shela',
            availableUnits: safeInt(row.units) ?? 0,
            pricePerSqft: safeFloat(row.bsp_sqft) ?? (row.all_in_lakh ? parseFloat(row.all_in_lakh) * 100000 / 1000 : 0),
            minPrice: row.min_price_lakh ? (parseFloat(row.min_price_lakh) * 100000) : 0,
            maxPrice: row.max_price_lakh ? (parseFloat(row.max_price_lakh) * 100000) : 0,
            possessionDate: parsePossessionDate(row.possession_date),
            possessionFlag: row.possession_flag || 'amber',
            reraNumber: row.rera_number || `RERA-${projectName.replace(/\s/g,'-').toUpperCase()}`,
            constructionStatus: row.rera_status || 'Under Construction',
            decisionTag: row.decision_tag || null,
            honestConcern: row.honest_concern || null,
            analystNote: row.analyst_note || null,
            configurations: row.configurations || null,
            bankApprovals: row.bank_approvals || null,
            carpetSqftMin: safeInt(row.carpet_sqft),
            sbaSqftMin: safeInt(row.sba_sqft),
            priceNote: row.price_note || null,
          }
        })
        console.log(`   ✅ Updated`)
        skipped++
      } catch (e) {
        console.error(`   ❌ Update failed:`, e.message)
        errors++
      }
      continue
    }

    // Insert new
    try {
      await prisma.project.create({
        data: {
          projectName,
          builderName,
          microMarket: row.zone || 'Shela',
          availableUnits: safeInt(row.units) ?? 0,
          pricePerSqft: safeFloat(row.bsp_sqft) ?? 0,
          minPrice: row.min_price_lakh ? (parseFloat(row.min_price_lakh) * 100000) : 0,
          maxPrice: row.max_price_lakh ? (parseFloat(row.max_price_lakh) * 100000) : 0,
          possessionDate: parsePossessionDate(row.possession_date),
          possessionFlag: row.possession_flag || 'amber',
          reraNumber: row.rera_number || `RERA-${projectName.replace(/\s/g,'-').toUpperCase()}`,
          constructionStatus: row.rera_status || 'Under Construction',
          decisionTag: row.decision_tag || null,
          honestConcern: row.honest_concern || null,
          analystNote: row.analyst_note || null,
          configurations: row.configurations || null,
          bankApprovals: row.bank_approvals || null,
          carpetSqftMin: safeInt(row.carpet_sqft),
          sbaSqftMin: safeInt(row.sba_sqft),
          priceNote: row.price_note || null,
          // Required fields with defaults
          latitude: 23.0225,
          longitude: 72.5714,
          amenities: [],
          unitTypes: [],
          isActive: true,
          locationScore: 50,
          amenitiesScore: 50,
          infrastructureScore: 50,
          demandScore: 50,
          builderGradeScore: 50,
        }
      })
      console.log(`   ✅ Inserted`)
      inserted++
    } catch (e) {
      console.error(`   ❌ Insert failed:`, e.message)
      errors++
    }
  }

  console.log('\n' + '═'.repeat(50))
  console.log(`✅ Import complete`)
  console.log(`   Inserted: ${inserted}`)
  console.log(`   Updated:  ${skipped}`)
  console.log(`   Errors:   ${errors}`)
  console.log('═'.repeat(50))
  
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('Fatal error:', e)
  await prisma.$disconnect()
  process.exit(1)
})
