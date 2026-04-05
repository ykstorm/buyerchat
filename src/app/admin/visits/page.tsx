import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function Badge({ label, color }: { label: string; color: 'green' | 'red' | 'blue' }) {
  const map = {
    green: 'bg-[#E1F5EE] text-[#085041]',
    red: 'bg-[#FCEBEB] text-[#791F1F]',
    blue: 'bg-[#E6F1FB] text-[#0C447C]',
  }
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${map[color]}`}>
      {label}
    </span>
  )
}

function getStatus(visit: { visitCompleted: boolean; visitScheduledDate: Date }) {
  if (visit.visitCompleted) return { label: 'Completed', color: 'green' as const }
  if (new Date(visit.visitScheduledDate) < new Date()) return { label: 'Missed', color: 'red' as const }
  return { label: 'Upcoming', color: 'blue' as const }
}

export default async function VisitsPage() {
  const session = await auth()
  if (session?.user?.email !== process.env.ADMIN_EMAIL) {
    return <div>Unauthorized</div>
  }

  const visits = await prisma.siteVisit.findMany({
    orderBy: { visitScheduledDate: 'asc' },
    include: { project: { select: { projectName: true, builderName: true } } },
  }).catch(() => [])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[18px] font-semibold text-[#1A1A2E]">Site Visits</p>
          <p className="text-[12px] text-[#52525B]">{visits.length} total visit{visits.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="bg-white border border-black/[0.08] rounded-xl overflow-hidden">
        {visits.length === 0 ? (
          <p className="text-[13px] text-[#52525B] p-6">No site visits recorded yet.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F4F4F5] bg-[#FAFAFA]">
                <th className="text-left text-[11px] text-[#52525B] font-medium px-4 py-3">Visit Token</th>
                <th className="text-left text-[11px] text-[#52525B] font-medium px-4 py-3">Project</th>
                <th className="text-left text-[11px] text-[#52525B] font-medium px-4 py-3">Builder</th>
                <th className="text-left text-[11px] text-[#52525B] font-medium px-4 py-3">Scheduled Date</th>
                <th className="text-left text-[11px] text-[#52525B] font-medium px-4 py-3">Status</th>
                <th className="text-left text-[11px] text-[#52525B] font-medium px-4 py-3">OTP Verified</th>
              </tr>
            </thead>
            <tbody>
              {visits.map(visit => {
                const { label, color } = getStatus(visit)
                return (
                  <tr key={visit.id} className="border-b border-[#F4F4F5] last:border-0 hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3">
                      <span className="text-[12px] font-mono font-semibold text-[#185FA5]">
                        {visit.visitToken ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-[#1A1A2E]">
                        {visit.project?.projectName ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-[#52525B]">
                        {visit.project?.builderName ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-[#1A1A2E]">
                        {new Date(visit.visitScheduledDate).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={label} color={color} />
                    </td>
                    <td className="px-4 py-3">
                      {visit.otpVerified ? (
                        <Badge label="Verified" color="green" />
                      ) : (
                        <Badge label="Not verified" color="red" />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
