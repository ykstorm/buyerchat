import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'

const SLUGS = {
  'shela': { name: 'Shela', microMarket: 'Shela' },
} as const

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const meta = SLUGS[slug as keyof typeof SLUGS]
  if (!meta) return {}
  return {
    title: `3BHK & 4BHK Apartments in ${meta.name}, Ahmedabad — RERA-verified | Homesty AI`,
    description: `Verified ${meta.name}, Ahmedabad apartments with Builder Trust Scores and honest concerns disclosed. RERA-verified. Buyer-side advisory.`,
    openGraph: {
      title: `Apartments in ${meta.name}, Ahmedabad — Homesty AI`,
      siteName: 'Homesty.ai',
    },
    twitter: { card: 'summary_large_image' },
  }
}

export default async function LocalityLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const meta = SLUGS[slug as keyof typeof SLUGS]
  if (!meta) return <>{children}</>

  const projects = await prisma.project.findMany({
    where: { microMarket: meta.microMarket, isActive: true },
    orderBy: { builder: { totalTrustScore: 'desc' } },
    select: { id: true, projectName: true },
  })

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Apartments in ${meta.name}, Ahmedabad`,
    itemListElement: projects.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://homesty.ai/projects/${p.id}`,
      name: p.projectName,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      {children}
    </>
  )
}
