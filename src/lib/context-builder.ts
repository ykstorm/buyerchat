import { prisma } from '@/lib/prisma'
import { getCachedContext, setCachedContext } from '@/lib/context-cache'
import { computeUrgencySignals } from '@/lib/urgency-signals'
import type { BuilderAIContext } from '@/lib/types/builder-ai-context'

export async function buildContextPayload() {
  try {
    const cached = await getCachedContext()
    if (cached) return JSON.parse(cached)

    const [projects, localities, infrastructure] = await Promise.all([
      prisma.project.findMany({
        where: { isActive: true },
        select: {
          id: true,
          projectName: true,
          builderName: true,
          microMarket: true,
          minPrice: true,
          maxPrice: true,
          pricePerSqft: true,
          availableUnits: true,
          possessionDate: true,
          reraNumber: true,
          amenities: true,
          constructionStatus: true,
          unitTypes: true,
          latitude: true,
          longitude: true,
          decisionTag: true,
          honestConcern: true,
          analystNote: true,
          possessionFlag: true,
          configurations: true,
          bankApprovals: true,
          carpetSqftMin: true,
          sbaSqftMin: true,
          builder: {
            select: {
              totalTrustScore: true,
            grade: true,
            brandName: true,
            deliveryScore: true,
            reraScore: true,
            qualityScore: true,
            financialScore: true,
            responsivenessScore: true,
            }
          },
          priceHistory: {
            orderBy: { recordedAt: 'desc' },
            take: 2,
            select: { pricePerSqft: true, recordedAt: true }
          },
          siteVisits: { select: { id: true, createdAt: true } }
        }
      }),
      prisma.locality.findMany(),
      prisma.infrastructure.findMany({
        orderBy: { priceImpactPct: 'desc' }
      }),
    ])

    const projectsWithSignals = projects.map(p => {
      const urgency = computeUrgencySignals({
        availableUnits: p.availableUnits,
        possessionDate: p.possessionDate,
        priceHistory: p.priceHistory,
        siteVisits: p.siteVisits,
      })
      return {
        id: p.id,
        name: p.projectName,
        builder: p.builderName,
        brandName: p.builder?.brandName,
        trustGrade: p.builder?.grade,
        trustScore: p.builder?.totalTrustScore,
        deliveryScore: p.builder?.deliveryScore,
        reraScore: p.builder?.reraScore,
        qualityScore: p.builder?.qualityScore,
        financialScore: p.builder?.financialScore,
        responsivenessScore: p.builder?.responsivenessScore,
        zone: p.microMarket,
        location: p.microMarket,
        priceRange: `₹${(p.minPrice / 100000).toFixed(0)}L–₹${(p.maxPrice / 100000).toFixed(0)}L`,
        minPrice: p.minPrice,
        maxPrice: p.maxPrice,
        pricePerSqft: p.pricePerSqft,
        availableUnits: p.availableUnits,
        unitTypes: p.unitTypes,
        possession: p.possessionDate.toISOString().split('T')[0],
        rera: p.reraNumber,
        status: p.constructionStatus,
        amenities: p.amenities,
        decisionTag: p.decisionTag ?? null,
        honestConcern: p.honestConcern ?? null,
        analystNote: p.analystNote ?? null,
        possessionFlag: p.possessionFlag ?? null,
        configurations: p.configurations ?? null,
        bankApprovals: p.bankApprovals ?? null,
        carpetSqftMin: p.carpetSqftMin ?? null,
        sbaSqftMin: p.sbaSqftMin ?? null,
        urgency,
        // contactPhone and contactEmail deliberately excluded
      }
    })

    const payload = {
      projects: projectsWithSignals,
      localities,
      infrastructure,
      dataAsOf: new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
      locationIntelligence: `Shela and South Bopal are high-growth micro-markets in west Ahmedabad. PIN 380058. SP Ring Road connectivity, upcoming Bopal Metro Station (2027), proximity to SG Highway. Sub-registrar office: SRO Ahmedabad-9. Stamp duty: 4.9% + 1% registration. RERA portal: gujrera.gujarat.gov.in. GARVI portal: garvi.gujarat.gov.in.`
    }

    await setCachedContext(JSON.stringify(payload))
    return payload
  } catch (err) {
    console.error('buildContextPayload failed:', err)
    throw new Error('Context temporarily unavailable')
  }
}