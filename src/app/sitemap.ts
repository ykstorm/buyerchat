import { prisma } from '@/lib/prisma'
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const projects = await prisma.project.findMany({
    where: { isActive: true },
    select: { id: true, updatedAt: true }
  })

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${base}/chat`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/projects`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/builders`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ]

  const projectRoutes: MetadataRoute.Sitemap = projects.map(p => ({
    url: `${base}/projects/${p.id}`,
    lastModified: p.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.6
  }))

  return [...staticRoutes, ...projectRoutes]
}
