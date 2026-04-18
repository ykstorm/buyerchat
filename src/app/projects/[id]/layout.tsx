import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      projectName: true,
      microMarket: true,
      minPrice: true,
      maxPrice: true,
      constructionStatus: true,
      builder: { select: { brandName: true } },
    },
  })

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
      type: 'website',
    },
  }
}

export default function ProjectDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
