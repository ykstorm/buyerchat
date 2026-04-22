import type { Metadata } from 'next'
import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { BuilderAIContext } from '@/lib/types/builder-ai-context'
import ChatClient from './chat-client'

export const metadata: Metadata = {
  title: 'Chat with Homesty AI — Honest Property Advisor | Ahmedabad',
  description: 'Ask Homesty AI about South Bopal & Shela properties. Get honest scores, flaw disclosures, ALL-IN pricing, and personalised recommendations.',
  openGraph: {
    title: 'Chat with Homesty AI',
    description: 'Your honest property advisor for South Bopal & Shela, Ahmedabad.',
    type: 'website',
  },
}

export default async function ChatPage() {
  const session = await auth()
  const [projects, builders] = await Promise.all([
    prisma.project.findMany({
      where: { isActive: true },
      select: {
        id: true, projectName: true, builderName: true,
        pricePerSqft: true, minPrice: true, maxPrice: true,
        possessionDate: true, constructionStatus: true, microMarket: true,
        decisionTag: true, honestConcern: true, analystNote: true,
        possessionFlag: true, configurations: true, bankApprovals: true,
        priceNote: true, pricePerSqftType: true, loadingFactor: true, allInPrice: true, charges: true, carpetSqftMin: true, sbaSqftMin: true,
        builder: { select: { totalTrustScore: true, grade: true } }
      }
    }),
    // Sensitive fields (contactPhone, contactEmail, commissionRatePct, partnerStatus)
    // are deliberately NOT selected — BuilderTrustCard only needs the 5 subscores + agreement.
    prisma.builder.findMany({
      select: {
        id: true, builderName: true, brandName: true,
        deliveryScore: true, reraScore: true, qualityScore: true,
        financialScore: true, responsivenessScore: true,
        totalTrustScore: true, grade: true, agreementSigned: true,
      }
    }),
  ])
  const mappedProjects = projects.map((p: any) => ({
    ...p,
    trustScore: p.builder?.totalTrustScore ?? null,
    trustGrade: p.builder?.grade ?? null,
  }))
  const mappedBuilders: BuilderAIContext[] = builders.map((b: any) => ({
    id: b.id,
    builderName: b.builderName,
    brandName: b.brandName,
    totalTrustScore: b.totalTrustScore,
    grade: b.grade,
    deliveryScore: b.deliveryScore,
    reraScore: b.reraScore,
    qualityScore: b.qualityScore,
    financialScore: b.financialScore,
    responsivenessScore: b.responsivenessScore,
    agreementSigned: b.agreementSigned,
  }))
  return (
    <>
      <div className="fixed inset-0 z-50 bg-paper grain">
        <div
          className="fixed inset-0 pointer-events-none z-0 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '128px 128px',
          }}
        />
        <Suspense fallback={
          <div className="flex h-screen items-center justify-center bg-[#FAFAF8]">
            <div className="w-5 h-5 border-2 border-[#E7E5E4] border-t-[#1C1917] rounded-full animate-spin" />
          </div>
        }>
          <ChatClient projects={mappedProjects} builders={mappedBuilders} userId={session?.user?.id ?? null} userName={session?.user?.name ?? null} userImage={session?.user?.image ?? null} />
        </Suspense>
      </div>
    </>
  )
}
