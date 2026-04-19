import { prisma } from '@/lib/prisma'
import { getCachedContext, setCachedContext, invalidateContextCache } from '@/lib/context-cache'
import { computeUrgencySignals } from '@/lib/urgency-signals'
// BuilderAIContext type enforces sensitive field exclusion at compile time (see types/builder-ai-context.ts)

export async function buildContextPayload() {
  try {
    const cached = await getCachedContext()
    if (cached) {
      try { return JSON.parse(cached) }
      catch { await invalidateContextCache() }
    }

    const [projects, localities, infrastructure] = await Promise.all([
      prisma.project.findMany({
        where: { isActive: true, decisionTag: { not: 'Avoid' }, honestConcern: { not: null } },
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
          priceNote: true,
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
        priceRange: (p.minPrice && p.maxPrice)
          ? `₹${(p.minPrice / 100000).toFixed(0)}L–₹${(p.maxPrice / 100000).toFixed(0)}L`
          : 'Price on request',
        minPrice: p.minPrice,
        maxPrice: p.maxPrice,
        pricePerSqft: p.pricePerSqft,
        availableUnits: p.availableUnits,
        unitTypes: p.unitTypes,
        possession: p.possessionDate ? p.possessionDate.toISOString().split('T')[0] : 'TBD',
        rera: p.reraNumber,
        status: p.constructionStatus,
        amenities: p.amenities,
        decisionTag: p.decisionTag ?? null,
        honestConcern: p.honestConcern ?? null,
        analystNote: p.analystNote ?? null,
        possessionFlag: p.possessionFlag ?? null,
        configurations: p.configurations ?? null,
        bankApprovals: p.bankApprovals ?? null,
        priceNote: p.priceNote ?? null,
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
      locationIntelligence: `SOUTH BOPAL & SHELA — LOCATION INTELLIGENCE (Ground-verified, March 2026)
AREA OVERVIEW:
Both areas share PIN 380058, lie on SP Ring Road corridor, AMC jurisdiction since 2020.
South Bopal: 85,000+ residents, 17km from airport, 3.5km from Ambli Road railway station.
Shela: 60,000+ residents, adjacent to South Bopal, 0.5km from SP Ring Road.
Safety rating: 4.2/5 both areas. Electricity: UGVCL. Water: AMC piped Narmada canal.
TOP SCHOOLS (most asked by family buyers):
- Apollo International School (CBSE, KG-12) — near Marigold Circle, South Bopal. Most sought-after school in the area, draws from South Bopal/Shela/Ghuma.
- Shanti Asiatic School (CBSE, 1-12) — off 200 Ft Ring Road, Shela. Most popular for Shela residents.
- DPS Bopal (CBSE, KG-12) — near Bopal Railway Crossing, 0.8km from South Bopal. Strong national reputation.
- Divya Jyot School (CBSE, KG-12) — SP Ring Road, 0.6km from South Bopal centre. Highly accessible.
- Eklavya School (ICSE) — Village Sanathal, ~4km. One of Ahmedabad's most respected ICSE schools.
- Anand Niketan (ICSE) — Shilaj, ~5km. Established western corridor ICSE school.
- Apple Global School (CBSE+IGCSE) — near Godhavi, ~2km from Shela. Preferred by NRI/HNI families.
CONNECTIVITY:
- SP Ring Road: Direct access, connects to SG Highway, GIFT City, Sanand industrial.
- BRTS: Bopal BRTS stop — frequency every 8-12 min, connects to Ahmedabad central.
- Metro: Motera-Maninagar line Phase 2 — Bopal station planned, ~2026 operational.
- Auto/cab: Available 24/7, Ola/Uber active. Typically ₹80-150 to SG Highway.
- Airport: 17-20km, 25-35 min via SP Ring Road. No traffic signal route available.
HOSPITALS & HEALTHCARE:
- Zydus Hospital — Thaltej, ~6km. Largest private hospital in west Ahmedabad. JCI accredited.
- SAL Hospital — Drive-In Road, ~8km. Multi-specialty, strong cardiac unit.
- Shalby Hospital — SG Highway, ~7km. Orthopaedic specialty, large facility.
- Apollo Pharmacy + Diagnostics — South Bopal circle. 24/7 pharmacy available.
- Local clinics: 10+ GP clinics within 1km radius in both South Bopal and Shela.
DAILY CONVENIENCE:
- D-Mart: South Bopal — 0.8km. Open 8am-10pm daily.
- Reliance Fresh, Big Bazaar: Both within 2km.
- Banks: SBI, HDFC, ICICI, Axis — all have branches within South Bopal.
- ATMs: 15+ within 1km radius.
- Restaurants: 50+ options, strong Gujarati thali + fast food. Notably: Agashiye (South Bopal), multiple Punjabi dhabas on SP Ring Road.
INFRASTRUCTURE STATUS:
- Roads: SP Ring Road 6-lane, fully operational. Internal roads: mostly 40-60 ft wide, good condition post-AMC merger. Some internal roads in newer Shela sectors still unpaved (check specific project access road).
- Water: AMC piped — Narmada canal based. Reliable in South Bopal. Shela still improving post-2020 merger — ask builder about water storage.
- Electricity: UGVCL — generally stable, 1-2 hour cuts in peak summer. Most new buildings have DG backup.
- Sewage: Connected to AMC main line in South Bopal. Shela — partial, newer projects have STP.
- Internet: JIO fiber, Airtel broadband both available. 100Mbps plans at ₹700-900/month.
INVESTMENT SIGNALS:
- GIFT City corridor: 25km — IT/BFSI workforce buying in South Bopal as affordable alternative.
- Sanand industrial: 15km — Manufacturing/logistics professionals buying here.
- Price appreciation (5yr): ~38% in South Bopal, ~44% in Shela (Shela started lower base).
- Rental yield: 2.8-3.2% per annum. Typical 3BHK rental: ₹18,000-25,000/month.
- Demand profile: 70% end-use families, 30% investors. High repeat-buyer rate from satisfied residents.
HONEST CONCERNS FOR AREA:
- Traffic: SP Ring Road congestion 8-10am and 6-8pm. Auto/cab wait can be 15-20 min during peak.
- Construction dust: Active construction in Shela sectors — not suitable for severe respiratory conditions.
- Water pressure: Some buildings in Shela still on tanker during summer months (May-June). Ask builder specifically.
- Metro delay risk: Phase 2 Bopal station announcement made but no confirmed completion date.`
    }

    await setCachedContext(JSON.stringify(payload))
    return payload
  } catch (err) {
    console.error('buildContextPayload failed:', err)
    throw new Error('Context temporarily unavailable')
  }
}