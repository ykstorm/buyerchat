import type { Metadata } from 'next'
import { cache } from 'react'
import { prisma } from '@/lib/prisma'

const getBuilder = cache(async (id: string) =>
  prisma.builder.findUnique({
    where: { id },
    select: {
      brandName: true,
      builderName: true,
      grade: true,
      totalTrustScore: true,
      _count: { select: { projects: true } },
    },
  }).catch(() => null),
)

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const builder = await getBuilder(id)

  if (!builder) {
    return { title: 'Builder Not Found | Homesty.ai' }
  }

  const title = `${builder.brandName} — Grade ${builder.grade} Builder | Homesty.ai`
  const description = `${builder.brandName} trust score: ${builder.totalTrustScore}/100. Honest builder profile with delivery, RERA, quality, and financial scores on Homesty.ai.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'Homesty.ai',
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function BuilderLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const builder = await getBuilder(id)

  // schema.org/Organization. ratingValue normalised to /10 since
  // totalTrustScore is /100. ratingCount falls back to project count, then 1.
  const jsonLd = builder
    ? {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: builder.brandName,
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Ahmedabad',
          addressRegion: 'Gujarat',
          addressCountry: 'IN',
        },
        aggregateRating: builder.totalTrustScore
          ? {
              '@type': 'AggregateRating',
              ratingValue: (builder.totalTrustScore / 10).toFixed(1),
              bestRating: '10',
              ratingCount: builder._count?.projects || 1,
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
