import { prisma } from '@/lib/prisma'
import { formatLakh, daysBetween, formatDate } from '@/lib/admin-utils'
import { DarkMetricCard, DarkCard, DarkBadge } from '@/components/admin/DarkCard'
import RegisterLeadButton from '@/components/admin/RegisterLeadButton'
import MarkReceivedButton from '@/components/admin/MarkReceivedButton'

export const dynamic = 'force-dynamic'

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
    <div style={{ background: '#0A0F1E', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[18px] font-bold text-white">Revenue & Commission</h1>
          <p className="text-[12px] mt-0.5" style={{ color: '#6B7280' }}>OTP lead protection · commission tracking · pipeline</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <DarkMetricCard label="Commission Earned" value={`₹${formatLakh(totalEarned)}`} sub={`${deals.filter(d => d.paymentStatus === 'paid').length} deals`} color="#34D399" />
        <DarkMetricCard label="Collected" value={`₹${formatLakh(totalCollected)}`} color="#34D399" />
        <DarkMetricCard label="Overdue" value={`₹${formatLakh(totalOverdue)}`} sub={`${deals.filter(d => d.paymentStatus === 'overdue').length} deals`} color={totalOverdue > 0 ? '#F87171' : '#34D399'} />
        <DarkMetricCard label="Pipeline @ 1.5%" value={`₹${formatLakh(pipeline)}`} sub={`${visits.filter(v => v.visitToken).length} active leads`} color="#FBBF24" />
        <DarkMetricCard label="Protected Leads" value={protected_.length} sub={`${unprotected.length} unprotected`} color={unprotected.length > 0 ? '#F87171' : '#34D399'} />
      </div>

      {/* Alert for unprotected */}
      {unprotected.length > 0 && (
        <div className="mb-5 rounded-xl px-4 py-3" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
          <p className="text-[12px] font-semibold" style={{ color: '#F87171' }}>⚠️ {unprotected.length} unprotected visits — commission at risk!</p>
          <p className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>Register leads before builder interaction. No OTP = no commission claim.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Lead protection */}
        <DarkCard title="Lead Protection Status">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px]" style={{ color: '#9CA3AF' }}>{protectedPct}% protected</span>
              <span className="text-[11px]" style={{ color: '#9CA3AF' }}>{protected_.length} of {visits.length}</span>
            </div>
            <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-2 rounded-full transition-all" style={{ width: `${protectedPct}%`, background: protectedPct === 100 ? '#34D399' : '#FBBF24' }} />
            </div>
          </div>
          <div className="space-y-2">
            {protected_.slice(0, 3).map(visit => (
              <div key={visit.id} className="rounded-xl px-3 py-2.5 flex items-center justify-between" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
                <div>
                  <p className="text-[12px] font-medium text-white">{visit.project?.projectName ?? '—'}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#6B7280' }}>
                    {visit.project?.builderName} · {formatDate(visit.leadRegisteredAt ?? visit.createdAt)}
                  </p>
                  <p className="text-[11px]" style={{ color: '#34D399' }}>
                    ~₹{formatLakh((visit.project?.minPrice ?? 0) * 0.015)} expected
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[15px] font-bold tracking-widest" style={{ color: '#34D399' }}>{visit.visitToken}</p>
                  {visit.builderAcknowledged && <DarkBadge label="Ack'd" color="green" />}
                </div>
              </div>
            ))}
            {unprotected.slice(0, 2).map(visit => (
              <div key={visit.id} className="rounded-xl px-3 py-2.5 flex items-center justify-between" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)' }}>
                <div>
                  <p className="text-[12px] font-medium" style={{ color: '#F87171' }}>{visit.project?.projectName ?? '—'}</p>
                  <p className="text-[11px]" style={{ color: '#F87171' }}>NOT REGISTERED — Commission at risk!</p>
                  <p className="text-[11px]" style={{ color: '#6B7280' }}>Visit: {formatDate(visit.visitScheduledDate)}</p>
                </div>
                <RegisterLeadButton visitId={visit.id} />
              </div>
            ))}
            {visits.length === 0 && <p className="text-[12px]" style={{ color: '#4B5563' }}>No visits yet.</p>}
          </div>
        </DarkCard>

        {/* Commission & Deals */}
        <DarkCard title="Commission & Deals">
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: 'Total earned', value: `₹${formatLakh(totalEarned)}`, color: '#34D399' },
              { label: 'Collected', value: `₹${formatLakh(totalCollected)}`, color: '#34D399' },
              { label: 'Overdue', value: `₹${formatLakh(totalOverdue)}`, color: totalOverdue > 0 ? '#F87171' : '#6B7280' },
              { label: 'Pipeline', value: `₹${formatLakh(pipeline)}`, color: '#FBBF24' },
            ].map(item => (
              <div key={item.label} className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <p className="text-[10px]" style={{ color: '#6B7280' }}>{item.label}</p>
                <p className="text-[14px] font-semibold" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>
          {deals.filter(d => d.paymentStatus === 'overdue').map(deal => (
            <div key={deal.id} className="rounded-xl p-3 mb-3" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[12px] font-semibold" style={{ color: '#F87171' }}>Overdue — {deal.builderBrandName}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>
                    {deal.dealNumber} · {daysBetween(deal.invoiceDate)}d ago · ₹{formatLakh(deal.commissionAmount)}
                  </p>
                </div>
                <button type="button" className="text-[11px] px-3 py-1.5 rounded-lg font-medium" style={{ background: '#F87171', color: '#0A0F1E' }}>Follow up</button>
              </div>
            </div>
          ))}
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#4B5563' }}>All Deals</p>
          {deals.length === 0 ? (
            <p className="text-[12px]" style={{ color: '#4B5563' }}>No deals yet.</p>
          ) : deals.map(deal => (
            <div key={deal.id} className="rounded-lg p-3 mb-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[12px] font-medium text-white">{deal.buyerName} · {deal.builderBrandName}</p>
                  <p className="text-[11px] font-mono" style={{ color: '#6B7280' }}>{deal.dealNumber}</p>
                  <p className="text-[11px]" style={{ color: '#6B7280' }}>₹{formatLakh(deal.dealValue)} @ {deal.commissionRate}%</p>
                </div>
                <div className="text-right">
                  <p className="text-[14px] font-semibold text-white">₹{formatLakh(deal.commissionAmount)}</p>
                  <DarkBadge label={deal.paymentStatus === 'overdue' ? `Overdue ${daysBetween(deal.invoiceDate)}d` : deal.paymentStatus} color={deal.paymentStatus === 'paid' ? 'green' : deal.paymentStatus === 'overdue' ? 'red' : 'amber'} />
                  {deal.paymentStatus === 'overdue' && <MarkReceivedButton dealId={deal.id} />}
                </div>
              </div>
            </div>
          ))}
        </DarkCard>
      </div>

      {/* Lead registry table */}
      <DarkCard title={`Lead Registry — ${visits.length} visits`} action={<span className="text-[11px]" style={{ color: '#6B7280' }}>{protected_.length} protected · {unprotected.length} unprotected</span>}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr>
                {['Project', 'Builder', 'Registered', 'OTP Token', 'Visit Date', 'Status', 'Action'].map(h => (
                  <th key={h} className="text-left py-2 px-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#4B5563', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visits.map(visit => (
                <tr key={visit.id} className="hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="py-2.5 px-2 font-medium text-white">{visit.project?.projectName ?? '—'}</td>
                  <td className="py-2.5 px-2" style={{ color: '#9CA3AF' }}>{visit.project?.builderName ?? '—'}</td>
                  <td className="py-2.5 px-2" style={{ color: '#9CA3AF' }}>{visit.leadRegisteredAt ? formatDate(visit.leadRegisteredAt) : '—'}</td>
                  <td className="py-2.5 px-2">
                    {visit.visitToken
                      ? <span className="font-mono font-semibold" style={{ color: '#34D399' }}>{visit.visitToken}</span>
                      : <span style={{ color: '#F87171' }}>NOT DONE</span>}
                  </td>
                  <td className="py-2.5 px-2" style={{ color: '#9CA3AF' }}>{formatDate(visit.visitScheduledDate)}</td>
                  <td className="py-2.5 px-2">
                    <DarkBadge
                      label={visit.visitCompleted ? 'Visited' : visit.visitToken ? 'Booked' : 'Unprotected'}
                      color={visit.visitCompleted ? 'green' : visit.visitToken ? 'blue' : 'red'}
                    />
                  </td>
                  <td className="py-2.5 px-2">
                    {!visit.visitToken
                      ? <RegisterLeadButton visitId={visit.id} />
                      : <span className="text-[11px] cursor-pointer" style={{ color: '#60A5FA' }}>View</span>}
                  </td>
                </tr>
              ))}
              {visits.length === 0 && (
                <tr><td colSpan={7} className="py-6 text-center text-[12px]" style={{ color: '#4B5563' }}>No visits yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </DarkCard>
    </div>
  )
}
