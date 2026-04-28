import { ImageResponse } from 'next/og'
import { prisma } from '@/lib/prisma'

// Per-project OG card. Mirrors root opengraph-image.tsx brand styling
// (ink #1C1917, cream #FAFAF8, gold #C49B50). Runtime is nodejs because
// prisma needs it (root OG is edge — it has no DB call).
export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Project on Homesty.ai'

const INK = '#1C1917'
const CREAM = '#FAFAF8'
const GOLD = '#C49B50'
const MUTED = '#A8A29E'

export default async function ProjectOG({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      projectName: true,
      builderName: true,
      microMarket: true,
      minPrice: true,
      unitTypes: true,
      builder: { select: { totalTrustScore: true } },
    },
  })

  const title = project?.projectName ?? 'Homesty.ai'
  const subtitle = project
    ? `${project.builderName ?? ''} · ${project.microMarket ?? 'Ahmedabad'}`
    : 'AI-powered property intelligence'
  const priceLabel = project?.minPrice && project.minPrice > 0
    ? `From ₹${Math.round(project.minPrice / 100000)}L`
    : 'Pricing on enquiry'
  const trust = project?.builder?.totalTrustScore
  const trustLabel = trust ? `Trust ${Math.round(trust)}/100` : 'RERA-verified'
  const unitsLabel = project?.unitTypes?.length ? project.unitTypes.join(', ') : '—'

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: INK,
          color: CREAM,
          padding: 80,
          fontFamily: 'serif',
        }}
      >
        <div
          style={{
            fontSize: 22,
            color: GOLD,
            letterSpacing: 6,
            fontFamily: 'sans-serif',
            fontWeight: 600,
          }}
        >
          HOMESTY.AI
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 84,
            marginTop: 36,
            fontStyle: 'italic',
            color: GOLD,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 28,
            marginTop: 18,
            color: CREAM,
            opacity: 0.85,
          }}
        >
          {subtitle}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 48,
            marginTop: 'auto',
            fontSize: 22,
            color: MUTED,
            letterSpacing: 2,
            fontFamily: 'sans-serif',
            textTransform: 'uppercase',
          }}
        >
          <span>◆ {trustLabel}</span>
          <span>◆ {unitsLabel}</span>
          <span>◆ {priceLabel}</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
