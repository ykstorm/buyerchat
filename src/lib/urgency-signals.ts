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
  siteVisits?: { id: string; createdAt?: Date }[]
}): UrgencySignals {
  const now = new Date()
  const twelveMonthsFromNow = new Date()
  twelveMonthsFromNow.setMonth(twelveMonthsFromNow.getMonth() + 12)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const fewUnitsLeft = project.availableUnits < 20

  const priceIncreasedRecently =
    project.priceHistory.length >= 2
      ? project.priceHistory[0].pricePerSqft > project.priceHistory[1].pricePerSqft
      : false

  const recentVisits = project.siteVisits?.filter(v =>
    v.createdAt ? new Date(v.createdAt) >= thirtyDaysAgo : false
  ) ?? []
  const highDemand = recentVisits.length > 5

  const possessionSoon =
    project.possessionDate >= now &&
    project.possessionDate <= twelveMonthsFromNow

  return { fewUnitsLeft, priceIncreasedRecently, highDemand, possessionSoon }
}