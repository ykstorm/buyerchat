import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import PricingStep3Form from '@/components/admin/PricingStep3Form'
import PricingHistory from '@/components/admin/PricingHistory'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectPricingPage({ params }: PageProps) {
  const session = await auth()
  if (
    !session?.user ||
    session.user.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()
  ) {
    redirect('/')
  }

  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      projectName: true,
      builderName: true,
      sbaSqftMin: true,
      carpetSqftMin: true,
      minPrice: true,
      maxPrice: true,
      allInPrice: true,
    },
  })

  if (!project) {
    return (
      <div className="max-w-4xl">
        <div className="rounded-xl p-6 text-[13px] text-[#F87171]">
          Project not found.
        </div>
      </div>
    )
  }

  const [pricing, history] = await Promise.all([
    prisma.projectPricing.findUnique({ where: { projectId: id } }),
    prisma.pricingHistory.findMany({
      where: { projectId: id },
      orderBy: { changedAt: 'desc' },
      take: 10,
    }),
  ])

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <nav aria-label="Breadcrumb" className="text-[11px] text-[#9CA3AF] mb-1">
            <Link href="/admin/projects" className="hover:underline">
              Projects
            </Link>{' '}
            /{' '}
            <Link href={`/admin/projects/${id}`} className="hover:underline">
              {project.projectName}
            </Link>{' '}
            / <span className="text-white">Pricing Step 3</span>
          </nav>
          <h1 className="text-[14px] font-medium text-white">
            Pricing Step 3 — {project.projectName}
          </h1>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">
            Builder: {project.builderName} · Current all-in on Project:{' '}
            {project.allInPrice
              ? `₹${Math.round(project.allInPrice / 100000).toLocaleString('en-IN')}L`
              : '—'}
          </p>
        </div>
        <Link
          href={`/admin/projects/${id}`}
          className="text-[12px] text-[#9CA3AF] border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
        >
          ← Back to project
        </Link>
      </div>

      <PricingStep3Form
        projectId={id}
        projectName={project.projectName}
        sbaSqftMin={project.sbaSqftMin}
        carpetSqftMin={project.carpetSqftMin}
        pricing={pricing}
      />

      <div className="mt-6">
        <PricingHistory
          history={history.map((h) => ({
            id: h.id,
            basicRatePerSqft: h.basicRatePerSqft,
            grandTotalAllIn: h.grandTotalAllIn,
            snapshotJson: h.snapshotJson,
            changedAt: h.changedAt.toISOString(),
            changedBy: h.changedBy,
            changeReason: h.changeReason,
          }))}
        />
      </div>
    </div>
  )
}
