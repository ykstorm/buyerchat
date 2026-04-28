import type { Metadata } from 'next'
import { cache } from 'react'
import { prisma } from '@/lib/prisma'

type Props = {
  params: Promise<{ id: string }>
}

const getProject = cache(async (id: string) =>
  prisma.project.findUnique({
    where: { id },
    select: {
      projectName: true,
      microMarket: true,
      minPrice: true,
      maxPrice: true,
      constructionStatus: true,
      honestConcern: true,
      analystNote: true,
      unitTypes: true,
      carpetSqftMin: true,
      builder: { select: { brandName: true } },
    },
  }).catch(() => null),
)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const project = await getProject(id)

  if (!project) {
    return { title: 'Project Not Found | Homesty' }
  }

  const priceRange = project.minPrice && project.maxPrice
    ? `₹${(project.minPrice / 100000).toFixed(1)}L – ₹${(project.maxPrice / 100000).toFixed(1)}L`
    : ''

  const title = `${project.projectName} by ${project.builder?.brandName ?? 'Unknown'} | ${project.microMarket} | Homesty`
  const description = `${project.projectName} in ${project.microMarket}, Ahmedabad. ${priceRange ? `Price: ${priceRange}.` : ''} ${project.constructionStatus ?? ''} — honest scores, flaw disclosure, ALL-IN pricing on Homesty.ai.`

  return {
    title,
    description,
    openGraph: {
      title: `${project.projectName} — ${project.microMarket}`,
      description,
      siteName: 'Homesty.ai',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function ProjectDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = await getProject(id)

  // schema.org/Apartment — server-rendered so crawlers see the structured
  // data even without running the client bundle. Fields keyed off the
  // Project model; optional fields drop out cleanly when null.
  const jsonLd = project
    ? {
        '@context': 'https://schema.org',
        '@type': 'Apartment',
        name: project.projectName,
        description: project.honestConcern || project.analystNote || undefined,
        address: {
          '@type': 'PostalAddress',
          addressLocality: project.microMarket,
          addressRegion: 'Gujarat',
          addressCountry: 'IN',
        },
        numberOfRooms: project.unitTypes?.length || undefined,
        floorSize: project.carpetSqftMin
          ? { '@type': 'QuantitativeValue', value: project.carpetSqftMin, unitCode: 'FTK' }
          : undefined,
        offers: project.minPrice > 0
          ? {
              '@type': 'Offer',
              priceCurrency: 'INR',
              price: project.minPrice,
              availability: 'https://schema.org/PreSale',
            }
          : undefined,
      }
    : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  )
}
