import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import AddMarketAlertButton from '@/components/admin/AddMarketAlertButton'
import PriceLogButton from '@/components/admin/PriceLogButton'
import Link from 'next/link'

// ─── types ────────────────────────────────────────────────────────────────────

type ProjectRow = {
  id: string
  projectName: string
  microMarket: string
  pricePerSqft: number
  possessionDate: Date
  constructionStatus: string
  builderName: string
  reraNumber: string
}

type ReraRow = {
  id: string
  projectName: string
  possessionDate: Date
  microMarket: string
  builderName: string
}

type AlertRow = {
  id: string
  type: string
  title: string
  description: string
  projectName: string | null
  createdAt: Date
  isRead: boolean
}

type HistoryRow = {
  id: string
  projectId: string
  pricePerSqft: number
  recordedAt: Date
  project: { id: string; projectName: string; pricePerSqft: number } | null
}

// ─── sub-components ───────────────────────────────────────────────────────────

function Card({
  title,
  children,
  action,
}: {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
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

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function IntelligencePage({
  searchParams,
}: {
  searchParams: Promise<{ flag?: string }>
}) {
  const { flag } = await searchParams
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // Handle flag query param — create a 'delay' MarketAlert, then redirect clean
  if (flag) {
    try {
      const flaggedProject = await prisma.project.findUnique({
        where: { id: flag },
        select: { projectName: true },
      })
      if (flaggedProject) {
        await prisma.marketAlert.create({
          data: {
            type: 'delay',
            title: `High risk — ${flaggedProject.projectName}`,
            description: 'Flagged as high risk from RERA tracker',
            projectName: flaggedProject.projectName,
          },
        })
      }
    } catch (err) {
      console.error('Flag RERA error:', err)
    }
    redirect('/admin/intelligence')
  }

  // ── data fetching ────────────────────────────────────────────────────────────

  let allProjects: ProjectRow[]    = []
  let reraDeadlines: ReraRow[]     = []
  let marketAlerts: AlertRow[]     = []
  let priceHistory: HistoryRow[]   = []
  let projectCount                 = 0
  let monthAlertCount              = 0

  try {
    ;[
      allProjects,
      reraDeadlines,
      marketAlerts,
      priceHistory,
      projectCount,
      monthAlertCount,
    ] = await Promise.all([
      prisma.project.findMany({
        where: { isActive: true },
        select: {
          id: true, projectName: true, microMarket: true, pricePerSqft: true,
          possessionDate: true, constructionStatus: true, builderName: true, reraNumber: true,
        },
        orderBy: { pricePerSqft: 'desc' },
      }),
      prisma.project.findMany({
        where: { constructionStatus: 'Under Construction' },
        orderBy: { possessionDate: 'asc' },
        take: 8,
        select: { id: true, projectName: true, possessionDate: true, microMarket: true, builderName: true },
      }),
      prisma.marketAlert.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.priceHistory.findMany({
        include: { project: { select: { id: true, projectName: true, pricePerSqft: true } } },
        orderBy: { recordedAt: 'desc' },
        take: 30,
      }),
      prisma.project.count({ where: { isActive: true } }),
      prisma.marketAlert.count({ where: { createdAt: { gte: startOfMonth } } }),
    ])
  } catch (err) {
    console.error('Intelligence fetch error:', err)
  }

  // ── zone averages ─────────────────────────────────────────────────────────────

  const zoneMap: Record<string, number[]> = {}
  allProjects.forEach(p => {
    if (!zoneMap[p.microMarket]) zoneMap[p.microMarket] = []
    zoneMap[p.microMarket].push(p.pricePerSqft)
  })
  const zoneAvgs = Object.entries(zoneMap).map(([zone, prices]) => ({
    zone,
    avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    count: prices.length,
  }))
  const overallAvg =
    allProjects.length > 0
      ? Math.round(allProjects.reduce((s, p) => s + p.pricePerSqft, 0) / allProjects.length)
      : 0

  // ── RERA helpers ──────────────────────────────────────────────────────────────

  const urgentRera = allProjects.filter(p => {
    const days = Math.floor((new Date(p.possessionDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days > 0 && days < 180
  })

  function reraStatus(possessionDate: Date) {
    const days = Math.floor((new Date(possessionDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (days < 0)   return { label: 'Overdue',   color: '#A32D2D', bg: '#FCEBEB', days }
    if (days < 90)  return { label: 'Critical',  color: '#A32D2D', bg: '#FCEBEB', days }
    if (days < 180) return { label: 'Watch',     color: '#BA7517', bg: '#FAEEDA', days }
    if (days < 365) return { label: 'On track',  color: '#0F6E56', bg: '#E1F5EE', days }
    return              { label: 'Long term', color: '#52525B', bg: '#F4F4F5', days }
  }

  const criticalRera = reraDeadlines.filter(p => {
    const days = Math.floor((new Date(p.possessionDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days < 90
  })

  // ── alert helpers ─────────────────────────────────────────────────────────────

  const alertIcon:  Record<string, string> = { price_change: '↑', new_launch: '+', delay: '!', other: 'i' }
  const alertColor: Record<string, string> = { price_change: '#A32D2D', new_launch: '#0F6E56', delay: '#BA7517', other: '#185FA5' }

  type ImpactMeta = { label: string; bg: string; color: string }
  const impactBadge: Record<string, ImpactMeta> = {
    price_change: { label: 'High impact', bg: '#FCEBEB',  color: '#A32D2D' },
    delay:        { label: 'High',        bg: '#FAEEDA',  color: '#BA7517' },
    new_launch:   { label: 'Medium',      bg: '#E6F1FB',  color: '#0C447C' },
    other:        { label: 'Low',         bg: '#F4F4F5',  color: '#52525B' },
  }

  // ── per-project price history summary ────────────────────────────────────────

  type PriceProjectSummary = {
    projectId: string
    projectName: string
    currentPrice: number
    earliestPrice: number
    changeAmount: number
    changePct: number
  }

  // Group by project; priceHistory is ordered desc so last item = earliest
  const phByProject = new Map<string, HistoryRow[]>()
  for (const h of priceHistory) {
    if (!h.project) continue
    const pid = h.project.id
    if (!phByProject.has(pid)) phByProject.set(pid, [])
    phByProject.get(pid)!.push(h)
  }

  const priceSummary: PriceProjectSummary[] = []
  phByProject.forEach((rows, pid) => {
    const proj = rows[0].project!
    const earliest = rows[rows.length - 1].pricePerSqft
    const current  = proj.pricePerSqft
    const change   = current - earliest
    priceSummary.push({
      projectId:     pid,
      projectName:   proj.projectName,
      currentPrice:  current,
      earliestPrice: earliest,
      changeAmount:  change,
      changePct:     earliest > 0 ? (change / earliest) * 100 : 0,
    })
  })
  // Sort by absolute % change desc
  priceSummary.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── AI Weekly Summary ──────────────────────────────────────────────────── */}
      <div className="bg-[#EEF5FD] border border-[#B5D4F4] rounded-xl px-4 py-3 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#0C447C] uppercase tracking-wider mb-1">AI Weekly Summary</p>
            <p className="text-[13px] font-medium text-[#0C3060] leading-snug">
              {allProjects.length} projects tracked ·{' '}
              {marketAlerts.length > 0
                ? `${marketAlerts.length} market move${marketAlerts.length > 1 ? 's' : ''} detected`
                : 'no market moves this week'}{' '}
              · avg price ₹{overallAvg.toLocaleString('en-IN')}/sqft
            </p>
            <p className="text-[11px] text-[#185FA5] mt-1">
              {urgentRera.length > 0
                ? `${urgentRera.length} project${urgentRera.length > 1 ? 's' : ''} have possession within 180 days — review urgency below.`
                : 'No possession deadlines within 180 days. Portfolio on track.'}
              {criticalRera.length > 0 && ` ${criticalRera.length} critical (< 90 days).`}
            </p>
          </div>
          <span className="text-[10px] text-[#5A8BBB] flex-shrink-0 mt-0.5">
            Week of {now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* ── Top banner ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-black/[0.08] rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56] inline-block" />
            <span className="text-[12px] font-medium text-[#1A1A2E]">{projectCount} projects tracked</span>
          </div>
          <span className="text-[#E4E4E7]">·</span>
          <span className="text-[12px] text-[#52525B]">
            {monthAlertCount} market move{monthAlertCount !== 1 ? 's' : ''} this month
          </span>
          <span className="text-[#E4E4E7]">·</span>
          <span className="text-[12px] text-[#52525B]">Last AI scan: today 6:00am</span>
        </div>
        <button
          type="button"
          className="text-[11px] bg-[#185FA5] text-white px-3 py-1.5 rounded-lg hover:bg-[#0C447C] transition-colors"
        >
          Run AI now
        </button>
      </div>

      {/* ── RERA critical banner ────────────────────────────────────────────────── */}
      {criticalRera.length > 0 && (
        <div className="bg-[#FCEBEB] border border-[#A32D2D]/30 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#A32D2D] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
              !
            </span>
            <p className="text-[12px] font-medium text-[#791F1F]">
              {criticalRera.length} project{criticalRera.length > 1 ? 's' : ''} with RERA deadline within 90 days
              — review buyer recommendations immediately
            </p>
          </div>
          <span className="text-[11px] text-[#A32D2D] font-medium">
            {criticalRera.map(p => p.projectName).join(', ')}
          </span>
        </div>
      )}

      {/* ── Row 1: Price Index + RERA tracker ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 mb-4">

        {/* Price Index */}
        <Card title="Micro-Zone Price Index">
          <div className="space-y-3 mb-4">
            {zoneAvgs.map(zone => (
              <div key={zone.zone}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-medium text-[#1A1A2E]">{zone.zone}</span>
                  <div className="text-right">
                    <span className="font-mono text-[14px] font-semibold text-[#185FA5]">
                      ₹{zone.avg.toLocaleString('en-IN')}/sqft
                    </span>
                    <span className="text-[10px] text-[#52525B] ml-2">{zone.count} projects</span>
                  </div>
                </div>
              </div>
            ))}
            {zoneAvgs.length === 0 && (
              <p className="text-[12px] text-[#52525B]">No price data yet. Add projects to see index.</p>
            )}
          </div>

          {allProjects.length > 0 && overallAvg > 0 && (
            <>
              <p className="text-[10px] font-medium text-[#52525B] uppercase tracking-wider mb-2">
                vs micro-zone avg (₹{overallAvg.toLocaleString('en-IN')}/sqft)
              </p>
              <div className="space-y-1.5">
                {allProjects.slice(0, 6).map(p => {
                  const diff = p.pricePerSqft - overallAvg
                  const pct  = ((diff / overallAvg) * 100).toFixed(1)
                  return (
                    <div key={p.id} className="flex items-center justify-between py-1 border-b border-[#F4F4F5] last:border-0">
                      <span className="text-[11px] text-[#1A1A2E] truncate max-w-[160px]">{p.projectName}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-[#1A1A2E]">₹{p.pricePerSqft.toLocaleString('en-IN')}</span>
                        <span className="text-[10px] font-medium" style={{ color: diff > 0 ? '#A32D2D' : '#0F6E56' }}>
                          {diff > 0 ? '+' : ''}{pct}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </Card>

        {/* RERA Deadline Tracker — with flag links */}
        <Card title="RERA Deadline Tracker">
          <p className="text-[11px] text-[#52525B] mb-3">All active projects — possession timeline status</p>
          <div className="space-y-2">
            {reraDeadlines.map(project => {
              const status = reraStatus(project.possessionDate)
              const pct = Math.min(100, Math.max(0, status.days > 0 ? Math.min((status.days / 365) * 100, 100) : 0))
              return (
                <div key={project.id} className="border border-black/[0.06] rounded-lg p-2.5">
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-[#1A1A2E] truncate">{project.projectName}</p>
                      <p className="text-[10px] text-[#52525B]">{project.builderName} · {project.microMarket}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      <span className="text-[11px] font-mono font-medium" style={{ color: status.color }}>
                        {status.days < 0 ? 'Overdue' : `${status.days}d`}
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: status.bg, color: status.color }}
                      >
                        {status.label}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-[#E4E4E7] rounded-full">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: status.color }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-[#71717A]">
                      Possession: {new Date(project.possessionDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </p>
                    {status.days < 60 && (
                      <Link
                        href={`/admin/intelligence?flag=${project.id}`}
                        className="text-[10px] font-medium text-[#BA7517] hover:text-[#633806] hover:underline transition-colors"
                      >
                        Flag high risk →
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
            {reraDeadlines.length === 0 && (
              <p className="text-[12px] text-[#52525B]">No active projects yet.</p>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-[#F4F4F5]">
            <p className="text-[10px] font-medium text-[#52525B] mb-1.5">Status guide</p>
            <div className="grid grid-cols-2 gap-1">
              {[
                { label: 'Overdue / Critical (<90d)', color: '#A32D2D' },
                { label: 'Watch (90–180d)',           color: '#BA7517' },
                { label: 'On track (180d–1yr)',       color: '#0F6E56' },
                { label: 'Long term (1yr+)',           color: '#52525B' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] text-[#52525B]">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* ── Price History Summary Table ─────────────────────────────────────────── */}
      <Card title="Price History — per-project summary">
        <p className="text-[11px] text-[#52525B] mb-3">
          Change from first recorded price to current. Log new prices with the + Log button.
        </p>
        {priceSummary.length === 0 ? (
          <p className="text-[12px] text-[#52525B]">
            No price history yet. Use + Log on any project to start tracking.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#F4F4F5]">
                  {['Project', 'Current price/sqft', 'First recorded', 'Change ₹', 'Change %', ''].map(h => (
                    <th
                      key={h}
                      className="text-left text-[10px] text-[#52525B] font-medium py-2 pr-4 uppercase tracking-wide last:text-right last:pr-0"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {priceSummary.map(row => (
                  <tr key={row.projectId} className="border-b border-[#F4F4F5] last:border-0 hover:bg-[#F8FAFC]">
                    <td className="py-2.5 pr-4 text-[11px] font-medium text-[#1A1A2E] max-w-[160px] truncate">
                      {row.projectName}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-[11px] text-[#1A1A2E]">
                      ₹{row.currentPrice.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-[11px] text-[#52525B]">
                      ₹{row.earliestPrice.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 pr-4 text-[11px] font-mono font-medium"
                      style={{ color: row.changeAmount > 0 ? '#A32D2D' : row.changeAmount < 0 ? '#0F6E56' : '#52525B' }}>
                      {row.changeAmount > 0 ? '+' : ''}₹{row.changeAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 pr-4 text-[11px] font-medium"
                      style={{ color: row.changePct > 0 ? '#A32D2D' : row.changePct < 0 ? '#0F6E56' : '#52525B' }}>
                      {row.changePct > 0 ? '+' : ''}{row.changePct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 text-right">
                      <PriceLogButton projectId={row.projectId} projectName={row.projectName} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Projects with no history yet also get Log buttons */}
        {allProjects.filter(p => !priceSummary.find(s => s.projectId === p.id)).length > 0 && (
          <div className="mt-3 pt-3 border-t border-[#F4F4F5]">
            <p className="text-[10px] font-medium text-[#52525B] mb-2">No history yet — log first price</p>
            <div className="flex flex-wrap gap-2">
              {allProjects
                .filter(p => !priceSummary.find(s => s.projectId === p.id))
                .map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-[11px] text-[#1A1A2E]">
                    <span className="truncate max-w-[140px]">{p.projectName}</span>
                    <PriceLogButton projectId={p.id} projectName={p.projectName} />
                  </div>
                ))}
            </div>
          </div>
        )}
      </Card>

      {/* spacer */}
      <div className="mb-4" />

      {/* ── Row 2: Old price history detail + Market Moves (with impact badges) ── */}
      <div className="grid grid-cols-2 gap-4 mb-4">

        {/* Price History detail */}
        <Card title="Price History — detailed log">
          <p className="text-[11px] text-[#52525B] mb-3">Every change logged with date. Show to buyers to build instant trust.</p>
          {priceHistory.length === 0 ? (
            <p className="text-[12px] text-[#52525B]">No price changes logged yet.</p>
          ) : (
            <div className="space-y-1">
              {(() => {
                const byProject: Record<string, HistoryRow[]> = {}
                priceHistory.forEach(h => {
                  if (!h.project) return
                  const name = h.project.projectName
                  if (!byProject[name]) byProject[name] = []
                  byProject[name].push(h)
                })
                return Object.entries(byProject).slice(0, 3).map(([name, history]) => (
                  <div key={name} className="mb-3">
                    <p className="text-[11px] font-semibold text-[#1A1A2E] mb-1.5">{name}</p>
                    <div className="space-y-1">
                      {history.slice(0, 4).map((h, i) => {
                        const prev   = history[i + 1]
                        const change = prev != null ? h.pricePerSqft - prev.pricePerSqft : null
                        const pct    = (prev != null && change !== null)
                          ? ((change / prev.pricePerSqft) * 100).toFixed(1)
                          : null
                        return (
                          <div key={h.id} className="flex items-center justify-between py-1 border-b border-[#F4F4F5] last:border-0">
                            <span className="text-[10px] text-[#52525B]">
                              {new Date(h.recordedAt).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}
                            </span>
                            <span className="font-mono text-[11px] text-[#1A1A2E]">
                              ₹{h.pricePerSqft.toLocaleString('en-IN')}/sqft
                            </span>
                            {change !== null && (
                              <span
                                className="text-[10px] font-medium"
                                style={{ color: change > 0 ? '#A32D2D' : '#0F6E56' }}
                              >
                                {change > 0 ? '+' : ''}₹{change} ({pct}%)
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              })()}
            </div>
          )}
        </Card>

        {/* Market Moves — with impact badges */}
        <Card title="Market Moves" action={<AddMarketAlertButton />}>
          <p className="text-[11px] text-[#52525B] mb-3">
            South Bopal & Shela · manually logged · AI suggests affected buyers
          </p>
          {marketAlerts.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-[12px] text-[#52525B]">No market moves logged yet.</p>
              <p className="text-[11px] text-[#71717A] mt-1">Log price changes, new launches, delays, and builder news.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {marketAlerts.map(alert => {
                const icon   = alertIcon[alert.type]  ?? 'i'
                const color  = alertColor[alert.type] ?? '#185FA5'
                const impact = impactBadge[alert.type] ?? impactBadge.other
                return (
                  <div key={alert.id} className="flex items-start gap-2.5 pb-2.5 border-b border-[#F4F4F5] last:border-0">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: color + '18', color }}
                    >
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[12px] font-medium text-[#1A1A2E]">{alert.title}</p>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                          style={{ backgroundColor: impact.bg, color: impact.color }}
                        >
                          {impact.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#52525B] leading-relaxed">{alert.description}</p>
                      {alert.projectName && (
                        <span className="text-[10px] bg-[#F0F4F8] text-[#52525B] px-1.5 py-0.5 rounded mt-1 inline-block">
                          {alert.projectName}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#71717A] flex-shrink-0 mt-0.5">
                      {new Date(alert.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ── RERA Urgency Section ───────────────────────────────────────────────── */}
      {urgentRera.length > 0 && (
        <div className="bg-[#FAEEDA] border border-[#BA7517]/30 rounded-xl p-4 mb-4">
          <p className="text-[11px] font-semibold text-[#BA7517] uppercase tracking-wider mb-2">
            Possession within 180 days — {urgentRera.length} project{urgentRera.length > 1 ? 's' : ''}
          </p>
          <div className="space-y-2">
            {urgentRera.map(p => {
              const days = Math.floor((new Date(p.possessionDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              const isRed = days < 90
              return (
                <div key={p.id} className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-[12px] font-medium text-[#1A1A2E]">{p.projectName}</p>
                    <p className="text-[10px] text-[#52525B]">{p.microMarket} · {p.builderName}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-[13px] font-semibold font-mono" style={{ color: isRed ? '#A32D2D' : '#BA7517' }}>
                      {days}d
                    </p>
                    <p className="text-[10px] text-[#71717A]">
                      {new Date(p.possessionDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── All projects table ──────────────────────────────────────────────────── */}
      <Card title={`All Scored Projects — ${allProjects.length} projects`}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[#F4F4F5]">
                {['Project', 'Area', 'Price/sqft', 'vs avg', 'Possession', 'Status', 'Trend', ''].map(h => (
                  <th
                    key={h}
                    className="text-left text-[10px] text-[#52525B] font-medium py-2 pr-4 uppercase tracking-wide last:pr-0"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allProjects.map(p => {
                const diff   = overallAvg > 0 ? p.pricePerSqft - overallAvg : 0
                const pct    = overallAvg > 0 ? ((diff / overallAvg) * 100).toFixed(1) : '0'
                const status = reraStatus(p.possessionDate)
                return (
                  <tr key={p.id} className="border-b border-[#F4F4F5] last:border-0 hover:bg-[#F8FAFC]">
                    <td className="py-2.5 pr-4 font-medium text-[#1A1A2E]">{p.projectName}</td>
                    <td className="py-2.5 pr-4 text-[#52525B]">{p.microMarket}</td>
                    <td className="py-2.5 pr-4 font-mono text-[#1A1A2E]">₹{p.pricePerSqft.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className="text-[11px] font-medium"
                        style={{ color: diff > 0 ? '#A32D2D' : diff < 0 ? '#0F6E56' : '#52525B' }}
                      >
                        {diff > 0 ? '+' : ''}{pct}%
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-[#52525B]">
                      {new Date(p.possessionDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: status.bg, color: status.color }}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      {(() => {
                        const history = phByProject.get(p.id)
                        const bars = history && history.length >= 2
                          ? [...history].reverse().map(h => h.pricePerSqft)
                          : [0.4, 0.6, 0.75, 0.85, 1].map(x => x * p.pricePerSqft)
                        const min = Math.min(...bars)
                        const max = Math.max(...bars)
                        const range = max - min || 1
                        return (
                          <div className="flex items-end gap-[2px] h-[18px]">
                            {bars.slice(-5).map((v, i) => {
                              const h = Math.max(3, Math.round(((v - min) / range) * 16))
                              const isLast = i === bars.slice(-5).length - 1
                              return (
                                <div
                                  key={i}
                                  style={{ height: h, width: 3, backgroundColor: isLast ? '#185FA5' : '#C4D7EE', borderRadius: 1 }}
                                />
                              )
                            })}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="py-2.5">
                      <PriceLogButton projectId={p.id} projectName={p.projectName} />
                    </td>
                  </tr>
                )
              })}
              {allProjects.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-[12px] text-[#52525B]">
                    No projects yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
