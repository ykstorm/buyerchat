// src/app/admin/projects/page.tsx
import { prisma } from '@/lib/prisma'
import { AdminCard } from '@/components/admin/AdminComponents'
import { GradePill } from '@/components/admin/AdminComponents'
import { BadgeStatus } from '@/components/admin/AdminComponents'
import { formatLakh, getTrustScoreColor } from '@/lib/admin-utils'
import Link from 'next/link'

export default async function ProjectsPage() {
  let projects: any[] = []
  try {
    projects = await prisma.project.findMany({
      include: {
        builder: {
          select: { brandName: true, grade: true, totalTrustScore: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    })
  } catch (err) {
    console.error('Projects fetch error:', err)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[18px] font-semibold text-[#1A1A2E]">Projects</h1>
        <Link
          href="/admin/projects/new"
          className="bg-[#185FA5] text-white text-[12px] font-medium px-4 py-2 rounded-lg hover:bg-[#0C447C] transition-colors"
        >
          + Add Project
        </Link>
      </div>

      <AdminCard title={`${projects.length} projects`}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[#F4F4F5]">
                {['Project', 'Builder', 'Trust Score', '₹/sqft', 'Price Range', 'RERA', 'Grade'].map(h => (
                  <th key={h} className="text-left text-[11px] text-[#52525B] font-medium py-2 pr-4">{h}</th>
                ))}
                <th className="text-left text-[11px] text-[#52525B] font-medium py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(project => (
                <tr key={project.id} className="border-b border-[#F4F4F5] hover:bg-[#F8FAFC]">
                  <td className="py-2.5 pr-4">
                    <p className="font-medium text-[#1A1A2E]">{project.projectName}</p>
                    <p className="text-[11px] text-[#52525B]">{project.microMarket} · {project.constructionStatus}</p>
                  </td>
                  <td className="py-2.5 pr-4 text-[#1A1A2E]">{project.builder?.brandName ?? project.builderName}</td>
                  <td className="py-2.5 pr-4">
                    <span className="font-mono font-medium" style={{ color: getTrustScoreColor(project.builder?.totalTrustScore ?? 0) }}>
                      {project.builder?.totalTrustScore ?? '—'}/100
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-[#1A1A2E]">
                    ₹{project.pricePerSqft?.toLocaleString('en-IN')}
                    {project.urgencySignals?.priceIncreasedRecently && (
                      <span className="text-[#A32D2D] ml-1">↑</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-[#1A1A2E]">
                    ₹{formatLakh(project.minPrice)} – ₹{formatLakh(project.maxPrice)}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="font-mono text-[11px] text-[#52525B]">{project.reraNumber?.slice(0, 18)}…</span>
                  </td>
                  <td className="py-2.5 pr-4">
                    {project.builder?.grade ? <GradePill grade={project.builder.grade} /> : '—'}
                  </td>
                  <td className="py-2.5">
                    <Link href={`/admin/projects/${project.id}`} className="text-[#185FA5] hover:underline text-[11px]">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {projects.length === 0 && (
            <p className="text-[12px] text-[#52525B] py-8 text-center">No projects yet. Add your first project.</p>
          )}
        </div>
      </AdminCard>
    </div>
  )
}
