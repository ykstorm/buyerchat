import { prisma } from '@/lib/prisma'
import { formatLakh, getTrustScoreColor } from '@/lib/admin-utils'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MatchedBuyersButton from '@/components/admin/MatchedBuyersButton'
import { getAdminCache, setAdminCache } from '@/lib/admin-cache'

export const dynamic = 'force-dynamic'

// Fields required to render the admin list view. Heavy columns (charges JSON,
// amenities/unitTypes arrays, latitude/longitude, scoring breakdowns, notes
// other than honestConcern) are deliberately excluded — they are only needed
// on `/admin/projects/[id]`. See I21 perf fix.
type ProjectRow = {
  id: string
  projectName: string
  builderName: string
  microMarket: string
  constructionStatus: string
  minPrice: number
  maxPrice: number
  pricePerSqft: number
  reraNumber: string
  isActive: boolean
  decisionTag: string | null
  honestConcern: string | null
  builder: {
    brandName: string
    grade: string
    totalTrustScore: number
  } | null
}

const PROJECT_LIST_SELECT = {
  id: true,
  projectName: true,
  builderName: true,
  microMarket: true,
  constructionStatus: true,
  minPrice: true,
  maxPrice: true,
  pricePerSqft: true,
  reraNumber: true,
  isActive: true,
  decisionTag: true,
  honestConcern: true,
  builder: { select: { brandName: true, grade: true, totalTrustScore: true } },
} as const

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ limit?: string }>
}) {
  const session = await auth()
  if (!session?.user?.email) redirect('/auth/signin')
  if (session.user.email.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) redirect('/chat')

  const { limit: limitParam } = await searchParams
  const projectLimit = Math.min(Number(limitParam) || 50, 500)

  let projects: ProjectRow[] = []
  let hasMoreProjects = false
  try {
    // Cache the trimmed list for 60s. Keyed by limit so /admin/projects?limit=N
    // variants do not collide. Invalidated on Project POST/PUT/DELETE via
    // `invalidateAdminCache('projects:')` — see src/app/api/admin/projects/*.
    const cacheKey = `projects:list:${projectLimit}`
    type Cached = { projects: ProjectRow[]; hasMoreProjects: boolean }
    const cached = await getAdminCache<Cached>(cacheKey)
    if (cached) {
      projects = cached.projects
      hasMoreProjects = cached.hasMoreProjects
    } else {
      const rows = await prisma.project.findMany({
        select: PROJECT_LIST_SELECT,
        orderBy: { createdAt: 'desc' },
        take: projectLimit + 1,
      })
      hasMoreProjects = rows.length > projectLimit
      projects = hasMoreProjects ? rows.slice(0, projectLimit) : rows
      // Fire-and-forget cache write — never block the render on Redis latency.
      setAdminCache<Cached>(cacheKey, { projects, hasMoreProjects }, 60).catch(() => {})
    }
  } catch (err) {
    console.error('Projects fetch error:', err)
  }

  return (
    <div style={{ background: '#0A0F1E', minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[18px] font-bold text-white">Projects</h1>
          <p className="text-[12px] mt-0.5" style={{ color: '#6B7280' }}>{projects.length} total · {projects.filter(p => p.isActive).length} active</p>
        </div>
        <Link href="/admin/projects/new" className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors" style={{ background: '#1B4F8A', color: 'white' }}>
          + Add Project
        </Link>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[13px] font-semibold text-white">{projects.length} projects</p>
          <div className="flex items-center gap-3 text-[11px]">
            <span style={{ color: '#34D399' }}>● {projects.filter(p => p.isActive).length} active</span>
            <span style={{ color: '#FBBF24' }}>⚠ {projects.filter(p => !p.decisionTag || !p.honestConcern).length} need scoring</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr>
                {['Project', 'Builder', 'Score', '₹/sqft', 'Price Range', 'RERA', 'Grade', 'Status', 'Action'].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4B5563', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map(project => {
                const gradeColor = project.builder?.grade === 'A' ? '#34D399' : project.builder?.grade === 'B' ? '#60A5FA' : project.builder?.grade === 'C' ? '#FBBF24' : '#F87171'
                const scoreColor = getTrustScoreColor(project.builder?.totalTrustScore ?? 0)
                return (
                  <tr key={project.id} className="hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="py-2.5 px-3">
                      <p className="font-medium text-white">{project.projectName}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: '#6B7280' }}>{project.microMarket} · {project.constructionStatus}</p>
                    </td>
                    <td className="py-2.5 px-3" style={{ color: '#9CA3AF' }}>{project.builder?.brandName ?? project.builderName}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-medium" style={{ color: scoreColor }}>
                        {project.builder?.totalTrustScore ?? '—'}/100
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono" style={{ color: '#D1D5DB' }}>
                      {project.pricePerSqft > 0 ? `₹${project.pricePerSqft.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono" style={{ color: '#D1D5DB' }}>
                      {project.minPrice > 0 ? `₹${formatLakh(project.minPrice)} – ₹${formatLakh(project.maxPrice)}` : 'Price on request'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-[10px]" style={{ color: '#6B7280' }}>{project.reraNumber?.slice(0, 16)}…</span>
                    </td>
                    <td className="py-2.5 px-3">
                      {project.builder?.grade ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: gradeColor + '22', color: gradeColor }}>
                          {project.builder.grade}
                        </span>
                      ) : <span style={{ color: '#4B5563' }}>—</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] font-semibold" style={{ color: project.isActive ? '#34D399' : '#F87171' }}>
                        {project.isActive ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          {(!project.decisionTag || !project.honestConcern) && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.15)', color: '#FBBF24' }}>Score needed</span>
                          )}
                          <Link href={`/admin/projects/${project.id}`} className="text-[11px] hover:underline" style={{ color: '#60A5FA' }}>
                            Edit →
                          </Link>
                        </div>
                        <MatchedBuyersButton projectId={project.id} />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {projects.length === 0 && (
                <tr><td colSpan={9} className="py-8 text-center text-[12px]" style={{ color: '#4B5563' }}>No projects yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {hasMoreProjects && (
          <div className="px-4 py-3 flex justify-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Link
              href={`/admin/projects?limit=${projectLimit + 50}`}
              className="text-[11px] font-medium px-4 py-1.5 rounded-lg transition-colors"
              style={{ color: '#60A5FA', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}
            >
              Load more ({projectLimit} shown)
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
