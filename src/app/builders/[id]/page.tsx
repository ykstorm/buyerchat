import { notFound } from 'next/navigation'
import { BuilderProfileClient } from './builder-profile-client'
export interface BuilderProfile {
  id: string
  builderName: string
  brandName: string
  grade: string
  totalTrustScore: number
  deliveryScore: number
  reraScore: number
  qualityScore: number
  financialScore: number
  responsivenessScore: number
  establishedYear?: number
  reraRegistered?: boolean
  totalProjectsCompleted?: number
  totalUnitsDelivered?: number
  bankApprovals?: string[]
  projects: {
    id: string
    projectName: string
    microMarket: string
    minPrice: number
    maxPrice: number
    unitTypes: string[]
    constructionStatus: string
    possessionDate: string
    availableUnits: number
  }[]
}

export default async function BuilderProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/builders/${id}`, { cache: 'no-store' })
  if (!res.ok) notFound()
  const builder: BuilderProfile = await res.json()
  return <BuilderProfileClient builder={builder} />
}