export type UrgencySignals = {
    fewUnitsLeft: boolean
    priceIncreasedRecently: boolean
    highDemand: boolean
    possessionSoon: boolean
  }
  
  export function computeUrgencySignals(project: {
    availableUnits: number
    possessionDate: Date
    priceHistory: { pricePerSqft: number }[]
    siteVisits?: { id: string }[]
  }): UrgencySignals {
    const now = new Date()
    const twelveMonthsFromNow = new Date()
    twelveMonthsFromNow.setMonth(twelveMonthsFromNow.getMonth() + 12)
  
    // Few units left
    const fewUnitsLeft = project.availableUnits < 20
  
    // Price increased recently — compare latest vs previous
    const priceIncreasedRecently =
      project.priceHistory.length >= 2
        ? project.priceHistory[0].pricePerSqft > project.priceHistory[1].pricePerSqft
        : false
  
    // High demand — more than 5 site visits
    const highDemand = (project.siteVisits?.length ?? 0) > 5
  
    // Possession within 12 months
    const possessionSoon =
      project.possessionDate >= now &&
      project.possessionDate <= twelveMonthsFromNow
  
    return {
      fewUnitsLeft,
      priceIncreasedRecently,
      highDemand,
      possessionSoon,
    }
  }