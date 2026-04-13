import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { DarkBadge } from '@/components/admin/DarkCard'
import MarkVisitComplete from '@/components/admin/MarkVisitComplete'
import PreVisitBriefButton from '@/components/admin/PreVisitBriefButton'

function getStatus(visit: { visitCompleted: boolean; visitScheduledDate: Date; expiresAt?: Date | null }) {
  if (visit.visitCompleted) return { label: 'Completed', color: 'green' as const }
  if (visit.expiresAt && new Date(visit.expiresAt) < new Date()) return { label: 'Expired', color: 'red' as const }
  if (new Date(visit.visitScheduledDate) < new Date()) return { label: 'Missed', color: 'red' as const }
  return { label: 'Upcoming', color: 'blue' as const }
}

export default async function VisitsPage() {
  const session = await auth()
  if (session?.user?.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) redirect('/')

  const visits = await prisma.siteVisit.findMany({
    orderBy: { visitScheduledDate: 'asc' },
    include: { project: { select: { projectName: true, builderName: true } } },
  }).catch(() => [])

  const upcoming = visits.filter(v => !v.visitCompleted && new Date(v.visitScheduledDate) >= new Date())
  const completed = visits.filter(v => v.visitCompleted)
  const missed = visits.filter(v => !v.visitCompleted && new Date(v.visitScheduledDate) < new Date())

  return (
    <div style={{ background: '#0A0F1E', minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[18px] font-bold text-white">Site Visits</h1>
          <p className="text-[12px] mt-0.5" style={{ color: '#6B7280' }}>{visits.length} total · {upcoming.length} upcoming · {completed.length} completed</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Upcoming', value: upcoming.length, color: '#60A5FA' },
          { label: 'Completed', value: completed.length, color: '#34D399' },
          { label: 'Missed', value: missed.length, color: missed.length > 0 ? '#F87171' : '#4B5563' },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-4 py-3" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#4B5563' }}>{s.label}</p>
            <p className="text-[24px] font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
        {visits.length === 0 ? (
          <p className="text-[13px] p-6" style={{ color: '#4B5563' }}>No site visits recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr>
                {['OTP Token', 'Buyer', 'Project', 'Builder', 'Scheduled', 'Expires', 'Status', 'OTP Verified', 'Action'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#4B5563', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visits.map(visit => {
                const { label, color } = getStatus(visit)
                return (
                  <tr key={visit.id} className="hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold" style={{ color: visit.visitToken ? '#34D399' : '#4B5563' }}>
                        {visit.visitToken ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white">{visit.buyerName ?? '—'}</td>
                    <td className="px-4 py-3 text-white">{visit.project?.projectName ?? '—'}</td>
                    <td className="px-4 py-3" style={{ color: '#9CA3AF' }}>{visit.project?.builderName ?? '—'}</td>
                    <td className="px-4 py-3" style={{ color: '#9CA3AF' }}>
                      {new Date(visit.visitScheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3" style={{ color: visit.expiresAt && new Date(visit.expiresAt) < new Date() ? '#F87171' : '#9CA3AF' }}>
                      {visit.expiresAt
                        ? new Date(visit.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3"><DarkBadge label={label} color={color} /></td>
                    <td className="px-4 py-3">
                      <DarkBadge label={visit.otpVerified ? 'Verified' : 'Not verified'} color={visit.otpVerified ? 'green' : 'red'} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        {!visit.visitCompleted && <MarkVisitComplete visitId={visit.id} />}
                        {!visit.visitCompleted && (
                          <PreVisitBriefButton
                            projectName={visit.project?.projectName ?? '—'}
                            builderName={visit.project?.builderName ?? '—'}
                            visitDate={visit.visitScheduledDate.toString()}
                            buyerName={visit.buyerName}
                            visitToken={visit.visitToken}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
