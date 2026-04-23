import { prisma } from '@/lib/prisma'
import type { MetadataRoute } from 'next'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const [projects, builders] = await Promise.all([
    prisma.project.findMany({
      where: { isActive: true },
      select: { id: true, updatedAt: true }
    }).catch(() => []),
    prisma.builder.findMany({
      select: { id: true, updatedAt: true }
    }).catch(() => []),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${base}/chat`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/projects`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    // No `/builders` index route exists — only dynamic `/builders/[id]` below.
    { url: `${base}/compare`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
  ]

  const projectRoutes: MetadataRoute.Sitemap = projects.map(p => ({
    url: `${base}/projects/${p.id}`,
    lastModified: p.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.6
  }))

  const builderRoutes: MetadataRoute.Sitemap = builders.map(b => ({
    url: `${base}/builders/${b.id}`,
    lastModified: b.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.5
  }))

  return [...staticRoutes, ...projectRoutes, ...builderRoutes]
}
