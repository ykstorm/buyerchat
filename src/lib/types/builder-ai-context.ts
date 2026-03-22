// Compile-time guard — prevents contactPhone, contactEmail,
// commissionRatePct, partnerStatus from ever reaching AI context
export type BuilderAIContext = {
    brandName: string | null | undefined
    totalTrustScore: number | null | undefined
    grade: string | null | undefined
    deliveryScore: number | null | undefined
    reraScore: number | null | undefined
    qualityScore: number | null | undefined
    financialScore: number | null | undefined
    responsivenessScore: number | null | undefined
    // contactPhone, contactEmail, commissionRatePct, partnerStatus
    // are deliberately excluded — never add them here
  }