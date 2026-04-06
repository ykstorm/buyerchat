import { prisma } from '@/lib/prisma'
import { formatLakh, daysBetween, formatDate } from '@/lib/admin-utils'
import RegisterLeadButton from '@/components/admin/RegisterLeadButton'

function MetricCard({ label, value, sub, color, subColor }: { label: string; value: string | number; sub?: string; color?: string; subColor?: string }) {
  return (
    <div className="bg-white rounded-[10px] p-[12px_14px]" style={{ border: '0.5px solid #E0DFDD' }}>
      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#787878' }}>{label}</p>
      <p className="font-extrabold leading-[1.1] mb-1" style={{ fontSize: 26, color: color ?? '#1B3A6B' }}>{value}</p>
      {sub && <p className="text-[9px]" style={{ color: subColor ?? '#B0B0AC' }}>{sub}</p>}
    </div>
  )
}

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white border border-black/[0.08] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-medium text-[#1A1A2E]">{title}</p>
        {action}
      </div>
      {children}
    </div>
  )
}

export default async function RevenuePage() {
  let visits: any[] = []
  let deals: any[] = []

  try {
    visits = await prisma.siteVisit.findMany({
      include: { project: { select: { projectName: true, minPrice: true, builderName: true, microMarket: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
  } catch (err) { console.error('Visits fetch error:', err) }

  try {
    deals = await prisma.deal.findMany({
      orderBy: { createdAt: 'desc' },
    })
  } catch (err) { console.error('Deals fetch error:', err) }

  const protected_ = visits.filter(v => v.visitToken)
  const unprotected = visits.filter(v => !v.visitToken)
  const totalEarned = deals.filter(d => d.paymentStatus === 'paid').reduce((s, d) => s + d.commissionAmount, 0)
  const totalCollected = deals.filter(d => d.paymentStatus === 'paid').reduce((s, d) => s + d.commissionAmount, 0)
  const totalOverdue = deals.filter(d => d.paymentStatus === 'overdue').reduce((s, d) => s + d.commissionAmount, 0)
  const pipeline = visits.filter(v => v.visitToken && !v.visitCompleted).reduce((s, v) => s + (v.project?.minPrice ?? 0) * 0.015, 0)
  const protectedPct = visits.length > 0 ? Math.round((protected_.length / visits.length) * 100) : 0

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[14px] font-medium text-[#1A1A2E]">Revenue / Lead & Commission</h1>
          <p className="text-[12px] text-[#52525B]">OTP lead protection · commission tracking · pipeline</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        <MetricCard label="Commission earned" value={`₹${formatLakh(totalEarned)}`} sub={`${deals.filter(d => d.paymentStatus === 'paid').length} deal closed`} color="#0F6E56" />
        <MetricCard label="Collected" value={`₹${formatLakh(totalCollected)}`} color="#0F6E56" />
        <MetricCard label="Overdue" value={`₹${formatLakh(totalOverdue)}`} sub={`${deals.filter(d => d.paymentStatus === 'overdue').length} deal`} color={totalOverdue > 0 ? '#A32D2D' : '#1A1A2E'} />
        <MetricCard label="Pipeline (@ 1.5%)" value={`₹${formatLakh(pipeline)}`} sub={`${visits.filter(v => v.visitToken).length} active leads`} color="#BA7517" />
        <MetricCard label="Protected leads" value={protected_.length} sub={`${unprotected.length} unprotected — risk!`} color={unprotected.length > 0 ? '#A32D2D' : '#0F6E56'} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Lead protection status */}
        <Card title="Lead Protection Status">
          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[#52525B]">{protectedPct}% protected</span>
              <span className="text-[11px] text-[#52525B]">{protected_.length} of {visits.length} leads</span>
            </div>
            <div className="h-2 bg-[#E4E4E7] rounded-full">
              <div className="h-full bg-[#0F6E56] rounded-full transition-all" style={{ width: `${protectedPct}%` }} />
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-[11px] text-[#0F6E56]">✓ {protected_.length} OTP registered</span>
              {unprotected.length > 0 && (
                <span className="text-[11px] text-[#A32D2D] font-medium">{unprotected.length} Unprotected — risk!</span>
              )}
            </div>
          </div>

          {/* Active OTP tokens */}
          <p className="text-[11px] font-medium text-[#52525B] uppercase tracking-wider mb-2">Active OTP tokens</p>
          <div className="space-y-2">
            {protected_.slice(0, 3).map(visit => (
              <div key={visit.id} className="bg-[#E1F5EE] border border-[#5DCAA5]/40 rounded-lg px-3 py-2.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-[#085041]">{visit.project?.projectName ?? '—'}</span>
                    {visit.builderAcknowledged && (
                      <span className="text-[10px] bg-[#085041]/10 text-[#085041] px-1.5 py-0.5 rounded-full">Builder ack'd</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#0F6E56]">
                    Registered {formatDate(visit.leadRegisteredAt ?? visit.createdAt)} · {visit.project?.builderName}
                  </p>
                  <p className="text-[11px] text-[#52525B]">
                    Commission: {visit.project?.minPrice ? `~₹${formatLakh(visit.project.minPrice * 0.015)} expected` : '1.5%'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[15px] font-bold text-[#085041] tracking-widest">{visit.visitToken}</p>
                  <p className="text-[10px] text-[#0F6E56]">OTP Token</p>
                </div>
              </div>
            ))}

            {/* Unprotected visits */}
            {unprotected.slice(0, 2).map(visit => (
              <div key={visit.id} className="bg-[#FCEBEB] border border-[#A32D2D]/30 rounded-lg px-3 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-medium text-[#791F1F]">{visit.project?.projectName ?? '—'}</p>
                  <p className="text-[11px] text-[#A32D2D]">NOT REGISTERED — Commission at risk!</p>
                  <p className="text-[11px] text-[#52525B]">
                    Visit: {formatDate(visit.visitScheduledDate)}
                  </p>
                </div>
                <RegisterLeadButton visitId={visit.id} />
              </div>
            ))}

            {visits.length === 0 && (
              <p className="text-[12px] text-[#52525B]">No visits yet. Leads will appear when buyers book site visits.</p>
            )}
          </div>
        </Card>

        {/* Commission summary */}
        <Card title="Commission & Deals">
          {/* Summary numbers */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: 'Total earned', value: `₹${formatLakh(totalEarned)}`, color: '#0F6E56' },
              { label: 'Collected', value: `₹${formatLakh(totalCollected)}`, color: '#0F6E56' },
              { label: 'Overdue', value: `₹${formatLakh(totalOverdue)}`, color: totalOverdue > 0 ? '#A32D2D' : '#52525B' },
              { label: 'Pipeline', value: `₹${formatLakh(pipeline)}`, color: '#BA7517' },
            ].map(item => (
              <div key={item.label} className="bg-[#F8FAFC] rounded-lg p-2.5">
                <p className="text-[10px] text-[#52525B]">{item.label}</p>
                <p className="text-[14px] font-semibold" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Overdue deals alert */}
          {deals.filter(d => d.paymentStatus === 'overdue').map(deal => {
            const days = daysBetween(deal.invoiceDate)
            return (
              <div key={deal.id} className="bg-[#FCEBEB] border border-[#A32D2D]/30 rounded-lg p-3 mb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[12px] font-semibold text-[#791F1F]">Commission overdue — {deal.builderBrandName}</p>
                    <p className="text-[11px] text-[#A32D2D]">
                      {deal.dealNumber} · Invoice sent {days} days ago · ₹{formatLakh(deal.commissionAmount)} pending
                    </p>
                  </div>
                  <button type="button" className="text-[11px] bg-[#791F1F] text-white px-2.5 py-1.5 rounded-lg hover:bg-[#A32D2D] transition-colors flex-shrink-0 ml-2">
                    Follow up
                  </button>
                </div>
              </div>
            )
          })}

          {/* Deals list */}
          <p className="text-[11px] font-medium text-[#52525B] uppercase tracking-wider mb-2">Deals</p>
          {deals.length === 0 ? (
            <p className="text-[12px] text-[#52525B]">No deals yet.</p>
          ) : (
            <div className="space-y-2">
              {deals.map(deal => {
                const days = daysBetween(deal.invoiceDate)
                return (
                  <div key={deal.id} className="border border-black/[0.08] rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[12px] font-medium text-[#1A1A2E]">{deal.buyerName} · {deal.builderBrandName}</p>
                        <p className="text-[11px] font-mono text-[#52525B]">{deal.dealNumber}</p>
                        <p className="text-[11px] text-[#52525B]">
                          Deal value: ₹{formatLakh(deal.dealValue)} @ {deal.commissionRate}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[14px] font-semibold text-[#1A1A2E]">₹{formatLakh(deal.commissionAmount)}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          deal.paymentStatus === 'paid' ? 'bg-[#E1F5EE] text-[#085041]' :
                          deal.paymentStatus === 'overdue' ? 'bg-[#FCEBEB] text-[#791F1F]' :
                          'bg-[#FAEEDA] text-[#633806]'
                        }`}>
                          {deal.paymentStatus === 'overdue' ? `Overdue ${days}d` : deal.paymentStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pipeline */}
          {visits.filter(v => v.visitToken && !v.visitCompleted).length > 0 && (
            <>
              <p className="text-[11px] font-medium text-[#52525B] uppercase tracking-wider mt-4 mb-2">Pipeline deals</p>
              <div className="space-y-1.5">
                {visits.filter(v => v.visitToken && !v.visitCompleted).slice(0, 3).map(visit => (
                  <div key={visit.id} className="flex items-center justify-between py-1.5 border-b border-[#F4F4F5] last:border-0">
                    <p className="text-[12px] text-[#1A1A2E]">{visit.project?.projectName ?? '—'}</p>
                    <span className="text-[12px] font-medium text-[#BA7517]">
                      ~₹{formatLakh((visit.project?.minPrice ?? 0) * 0.015)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Full lead registry table */}
      <div className="bg-white border border-black/[0.08] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] font-medium text-[#1A1A2E]">Lead Registry — All visits</p>
          <div className="flex items-center gap-2 text-[11px] text-[#52525B]">
            <span>{protected_.length} protected</span>
            <span>·</span>
            <span className={unprotected.length > 0 ? 'text-[#A32D2D] font-medium' : ''}>{unprotected.length} unprotected</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[#F4F4F5]">
                {['Buyer', 'Project', 'Builder', 'Registered', 'OTP Token', 'Builder ack', 'Visit date', 'Status', 'Action'].map(h => (
                  <th key={h} className="text-left text-[10px] text-[#52525B] font-medium py-2 pr-3 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visits.map(visit => (
                <tr key={visit.id} className="border-b border-[#F4F4F5] last:border-0 hover:bg-[#F8FAFC]">
                  <td className="py-2.5 pr-3 font-medium text-[#1A1A2E]">Buyer</td>
                  <td className="py-2.5 pr-3 text-[#1A1A2E]">{visit.project?.projectName ?? '—'}</td>
                  <td className="py-2.5 pr-3 text-[#52525B]">{visit.project?.builderName ?? '—'}</td>
                  <td className="py-2.5 pr-3 text-[#52525B]">{visit.leadRegisteredAt ? formatDate(visit.leadRegisteredAt) : '—'}</td>
                  <td className="py-2.5 pr-3">
                    {visit.visitToken ? (
                      <span className="font-mono text-[#085041] font-semibold">{visit.visitToken}</span>
                    ) : (
                      <span className="text-[#A32D2D] font-medium">NOT DONE</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    {visit.builderAcknowledged
                      ? <span className="text-[#0F6E56]">Ack'd</span>
                      : <span className="text-[#52525B]">Pending</span>}
                  </td>
                  <td className="py-2.5 pr-3 text-[#52525B]">{formatDate(visit.visitScheduledDate)}</td>
                  <td className="py-2.5 pr-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                      visit.visitCompleted ? 'bg-[#E1F5EE] text-[#085041]' :
                      visit.visitToken ? 'bg-[#E6F1FB] text-[#0C447C]' :
                      'bg-[#FCEBEB] text-[#791F1F]'
                    }`}>
                      {visit.visitCompleted ? 'Visited' : visit.visitToken ? 'Booked' : 'Unprotected'}
                    </span>
                  </td>
                  <td className="py-2.5">
                    {!visit.visitToken ? (
                      <RegisterLeadButton visitId={visit.id} />
                    ) : (
                      <span className="text-[11px] text-[#185FA5] hover:underline cursor-pointer">View</span>
                    )}
                  </td>
                </tr>
              ))}
              {visits.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-[12px] text-[#52525B]">No visits yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
