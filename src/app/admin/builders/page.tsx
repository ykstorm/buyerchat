import { prisma } from '@/lib/prisma'
import { formatLakh, getTrustScoreColor } from '@/lib/admin-utils'
import { DarkBadge } from '@/components/admin/DarkCard'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

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
    <div style={{ background: '#0A0F1E', minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[18px] font-bold text-white">Builder Registry</h1>
          <p className="text-[12px] mt-0.5" style={{ color: '#6B7280' }}>{builders.length} builders · commission tracking · agreement status</p>
        </div>
        <Link href="/admin/builders/new" className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors" style={{ background: '#1B4F8A', color: 'white' }}>
          + Add Builder
        </Link>
      </div>

      <div className="flex gap-4">
        {/* Left: builder list */}
        <div className="w-[200px] flex-shrink-0 space-y-1.5">
          {builders.map(builder => {
            const builderDeals = deals.filter(d => d.builderBrandName === builder.brandName)
            const overdue = builderDeals.filter(d => d.paymentStatus === 'overdue')
            const gradeColor = builder.grade === 'A' ? '#34D399' : builder.grade === 'B' ? '#60A5FA' : builder.grade === 'C' ? '#FBBF24' : '#F87171'
            return (
              <Link key={builder.id} href={`/admin/builders/${builder.id}`}>
                <div className="rounded-xl p-3 transition-all hover:scale-[1.02]" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-semibold flex-shrink-0" style={{ background: 'rgba(96,165,250,0.15)', color: '#60A5FA' }}>
                      {builder.brandName?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[12px] font-medium text-white truncate">{builder.brandName}</p>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: gradeColor + '22', color: gradeColor }}>
                          {builder.grade}
                        </span>
                      </div>
                      <p className="text-[10px]" style={{ color: '#6B7280' }}>{builder.projects?.length ?? 0} projects</p>
                    </div>
                  </div>
                  {overdue.length > 0 && (
                    <div className="mt-1.5 text-[10px] rounded px-2 py-0.5" style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171' }}>
                      Commission overdue
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
          {builders.length === 0 && (
            <div className="rounded-xl p-4 text-center" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[12px]" style={{ color: '#4B5563' }}>No builders yet.</p>
            </div>
          )}
        </div>

        {/* Right: builder details */}
        {builders.length > 0 && (
          <div className="flex-1 space-y-3">
            {builders.map(builder => {
              const builderDeals = deals.filter(d => d.builderBrandName === builder.brandName)
              const totalEarned = builderDeals.filter(d => d.paymentStatus === 'paid').reduce((s, d) => s + d.commissionAmount, 0)
              const totalOverdue = builderDeals.filter(d => d.paymentStatus === 'overdue').reduce((s, d) => s + d.commissionAmount, 0)
              const gradeColor = builder.grade === 'A' ? '#34D399' : builder.grade === 'B' ? '#60A5FA' : builder.grade === 'C' ? '#FBBF24' : '#F87171'
              const scoreColor = getTrustScoreColor(builder.totalTrustScore)
              return (
                <div key={builder.id} className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-semibold" style={{ background: 'rgba(96,165,250,0.15)', color: '#60A5FA' }}>
                        {builder.brandName?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-semibold text-white">{builder.brandName}</p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: gradeColor + '22', color: gradeColor }}>Grade {builder.grade}</span>
                        </div>
                        <p className="text-[11px] mt-0.5" style={{ color: '#6B7280' }}>{builder.builderName}</p>
                      </div>
                    </div>
                    <span className="font-mono text-[16px] font-bold" style={{ color: scoreColor }}>{builder.totalTrustScore}/100</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[
                      { label: 'Projects', value: builder.projects?.length ?? 0 },
                      { label: 'Agreement', value: builder.agreementSigned ? '✓ Signed' : '⚠ Missing', color: builder.agreementSigned ? '#34D399' : '#F87171' },
                      { label: 'Commission', value: `${builder.commissionRatePct}%` },
                      { label: 'Earned', value: `₹${formatLakh(totalEarned)}` },
                    ].map(item => (
                      <div key={item.label} className="rounded-lg p-2.5 text-center" style={{ background: item.color ? 'rgba(248,113,113,0.06)' : 'rgba(255,255,255,0.04)', border: item.color && !builder.agreementSigned && item.label === 'Agreement' ? '1px solid rgba(248,113,113,0.2)' : 'none' }}>
                        <p className="text-[14px] font-semibold" style={{ color: (item as any).color ?? 'white' }}>{item.value}</p>
                        <p className="text-[10px]" style={{ color: '#6B7280' }}>{item.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Score bars */}
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {[
                      { label: 'Delivery', value: builder.deliveryScore, max: 30 },
                      { label: 'RERA', value: builder.reraScore, max: 20 },
                      { label: 'Quality', value: builder.qualityScore, max: 20 },
                      { label: 'Financial', value: builder.financialScore, max: 15 },
                      { label: 'Response', value: builder.responsivenessScore, max: 15 },
                    ].map(score => (
                      <div key={score.label}>
                        <div className="flex justify-between mb-1">
                          <span className="text-[9px]" style={{ color: '#6B7280' }}>{score.label}</span>
                          <span className="text-[9px] font-medium text-white">{score.value}/{score.max}</span>
                        </div>
                        <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          <div className="h-1 rounded-full" style={{ width: `${(score.value / score.max) * 100}%`, background: '#60A5FA' }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Projects */}
                  <div className="mb-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#4B5563' }}>Projects</p>
                    <div className="space-y-1.5">
                      {builder.projects?.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <Link href={`/admin/projects/${p.id}`}>
                            <span className="text-[12px] hover:underline" style={{ color: '#60A5FA' }}>{p.projectName}</span>
                          </Link>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px]" style={{ color: '#6B7280' }}>
                              {new Date(p.possessionDate).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}
                            </span>
                            <DarkBadge label={p.constructionStatus === 'Ready to Move' ? 'RTM' : 'UC'} color={p.constructionStatus === 'Ready to Move' ? 'green' : 'blue'} />
                          </div>
                        </div>
                      ))}
                      {(!builder.projects || builder.projects.length === 0) && (
                        <p className="text-[11px]" style={{ color: '#4B5563' }}>No projects yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Commission */}
                  <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-[10px]" style={{ color: '#6B7280' }}>Earned</p>
                        <p className="text-[13px] font-semibold" style={{ color: '#34D399' }}>₹{formatLakh(totalEarned)}</p>
                      </div>
                      <div>
                        <p className="text-[10px]" style={{ color: '#6B7280' }}>Overdue</p>
                        <p className="text-[13px] font-semibold" style={{ color: totalOverdue > 0 ? '#F87171' : '#4B5563' }}>₹{formatLakh(totalOverdue)}</p>
                      </div>
                      {totalOverdue > 0 && (
                        <button type="button" className="ml-auto text-[11px] px-3 py-1.5 rounded-lg transition-colors" style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                          Draft follow-up
                        </button>
                      )}
                      <Link href={`/admin/builders/${builder.id}`} className="text-[11px] ml-auto hover:underline" style={{ color: '#60A5FA' }}>
                        Edit →
                      </Link>
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
