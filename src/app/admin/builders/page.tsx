import { prisma } from '@/lib/prisma'
import { formatLakh, getTrustScoreColor, formatTimeAgo } from '@/lib/admin-utils'
import Link from 'next/link'

function GradePill({ grade }: { grade: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    A: { bg: '#E1F5EE', text: '#085041' },
    B: { bg: '#E6F1FB', text: '#0C447C' },
    C: { bg: '#FAEEDA', text: '#633806' },
    D: { bg: '#FCEBEB', text: '#791F1F' },
    F: { bg: '#FCEBEB', text: '#791F1F' },
  }
  const c = colors[grade] ?? colors['F']
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ backgroundColor: c.bg, color: c.text }}>
      Grade {grade}
    </span>
  )
}

function ScorePill({ score }: { score: number }) {
  const color = getTrustScoreColor(score)
  return (
    <span className="font-mono text-[12px] font-semibold" style={{ color }}>
      {score}/100
    </span>
  )
}

export default async function BuildersPage() {
  let builders: any[] = []
  try {
    builders = await prisma.builder.findMany({
      include: {
        projects: {
          select: {
            id: true,
            projectName: true,
            possessionDate: true,
            constructionStatus: true,
            isActive: true,
          }
        }
      },
      orderBy: { totalTrustScore: 'desc' },
    })
  } catch (err) {
    console.error('Builders fetch error:', err)
  }

  // Get deals for commission tracking
  let deals: any[] = []
  try {
    deals = await prisma.deal.findMany({
      select: { builderBrandName: true, commissionAmount: true, paymentStatus: true, createdAt: true }
    })
  } catch (err) {}

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[14px] font-medium text-[#1A1A2E]">Builder Registry</h1>
          <p className="text-[12px] text-[#52525B] mt-0.5">{builders.length} builders · commission tracking · agreement status</p>
        </div>
        <Link href="/admin/builders/new"
          className="bg-[#185FA5] text-white text-[11px] font-medium px-3 py-1.5 rounded-lg hover:bg-[#0C447C] transition-colors">
          + Add Builder
        </Link>
      </div>

      <div className="flex gap-4">
        {/* Left: Builder list */}
        <div className="w-[220px] flex-shrink-0 space-y-1.5">
          {builders.map(builder => {
            const builderDeals = deals.filter(d => d.builderBrandName === builder.brandName)
            const overdue = builderDeals.filter(d => d.paymentStatus === 'overdue')
            return (
              <Link key={builder.id} href={`/admin/builders/${builder.id}`}>
                <div className="bg-white border border-black/[0.08] rounded-lg p-3 hover:border-[#185FA5]/30 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#E6F1FB] flex items-center justify-center text-[11px] font-semibold text-[#0C447C] flex-shrink-0">
                      {builder.brandName?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[12px] font-medium text-[#1A1A2E] truncate">{builder.brandName}</p>
                        <GradePill grade={builder.grade} />
                      </div>
                      <p className="text-[10px] text-[#52525B]">
                        {builder.projects?.length ?? 0} projects · {builder.commissionRate}% commission
                      </p>
                    </div>
                  </div>
                  {overdue.length > 0 && (
                    <div className="mt-1.5 text-[10px] text-[#A32D2D] bg-[#FCEBEB] rounded px-2 py-0.5">
                      Commission overdue
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
          {builders.length === 0 && (
            <div className="bg-white border border-black/[0.08] rounded-lg p-4 text-center">
              <p className="text-[12px] text-[#52525B]">No builders yet.</p>
            </div>
          )}
        </div>

        {/* Right: Builder detail — show first builder by default */}
        {builders.length > 0 && (
          <div className="flex-1 space-y-3">
            {builders.map(builder => {
              const builderDeals = deals.filter(d => d.builderBrandName === builder.brandName)
              const totalEarned = builderDeals.filter(d => d.paymentStatus === 'paid').reduce((s, d) => s + d.commissionAmount, 0)
              const totalOverdue = builderDeals.filter(d => d.paymentStatus === 'overdue').reduce((s, d) => s + d.commissionAmount, 0)

              return (
                <div key={builder.id} className="bg-white border border-black/[0.08] rounded-xl p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#E6F1FB] flex items-center justify-center text-[13px] font-semibold text-[#0C447C]">
                        {builder.brandName?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-semibold text-[#1A1A2E]">{builder.brandName}</p>
                          <GradePill grade={builder.grade} />
                        </div>
                        <p className="text-[11px] text-[#52525B]">{builder.builderName}</p>
                      </div>
                    </div>
                    <ScorePill score={builder.totalTrustScore} />
                  </div>

                  {/* Mini metrics */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[
                      { label: 'Projects', value: builder.projects?.length ?? 0 },
                      { label: 'Deliveries', value: builder.totalProjectsCompleted ?? 0 },
                      { label: 'Agreement', value: builder.agreementSigned ? 'Signed' : 'Pending' },
                      { label: 'Commission', value: `${builder.commissionRate}%` },
                    ].map(item => (
                      <div key={item.label} className="bg-[#F8FAFC] rounded-lg p-2.5 text-center">
                        <p className="text-[18px] font-semibold text-[#1A1A2E]">{item.value}</p>
                        <p className="text-[10px] text-[#52525B]">{item.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Projects list */}
                  <div className="mb-4">
                    <p className="text-[10px] font-medium text-[#52525B] uppercase tracking-wider mb-2">Projects</p>
                    <div className="space-y-1.5">
                      {builder.projects?.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-[#F4F4F5] last:border-0">
                          <Link href={`/admin/projects/${p.id}`}>
                            <span className="text-[12px] text-[#185FA5] hover:underline">{p.projectName}</span>
                          </Link>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#52525B]">
                              {new Date(p.possessionDate).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              p.constructionStatus === 'Ready to Move'
                                ? 'bg-[#E1F5EE] text-[#085041]'
                                : 'bg-[#E6F1FB] text-[#0C447C]'
                            }`}>
                              {p.constructionStatus === 'Ready to Move' ? 'RTM' : 'UC'}
                            </span>
                          </div>
                        </div>
                      ))}
                      {(!builder.projects || builder.projects.length === 0) && (
                        <p className="text-[11px] text-[#52525B]">No projects yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Commission */}
                  <div className="border-t border-[#F4F4F5] pt-3">
                    <p className="text-[10px] font-medium text-[#52525B] uppercase tracking-wider mb-2">Commission</p>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-[11px] text-[#52525B]">Earned</p>
                        <p className="text-[13px] font-semibold text-[#0F6E56]">₹{formatLakh(totalEarned)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#52525B]">Overdue</p>
                        <p className="text-[13px] font-semibold text-[#A32D2D]">₹{formatLakh(totalOverdue)}</p>
                      </div>
                      {totalOverdue > 0 && (
                        <button type="button"
                          className="ml-auto text-[11px] bg-[#FCEBEB] text-[#791F1F] px-3 py-1.5 rounded-lg hover:bg-[#F9D9D9] transition-colors">
                          Draft follow-up
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
