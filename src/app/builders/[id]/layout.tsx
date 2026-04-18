import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params

  const builder = await prisma.builder.findUnique({
    where: { id },
    select: { brandName: true, builderName: true, grade: true, totalTrustScore: true },
  }).catch(() => null)

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
      card: 'summary',
      title,
      description,
    },
  }
}

export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return children
}
