import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import AddMarketAlertButton from '@/components/admin/AddMarketAlertButton'
import { DarkCard, DarkBadge } from '@/components/admin/DarkCard'
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
    <div style={{ background: '#0A0F1E', minHeight: '100vh' }}>

      {/* AI Weekly Summary */}
      <div className="rounded-xl px-4 py-3 mb-4" style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)' }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#60A5FA' }}>AI Weekly Summary</p>
            <p className="text-[13px] font-medium text-white leading-snug">
              {allProjects.length} projects tracked ·{' '}
              {marketAlerts.length > 0 ? `${marketAlerts.length} market moves detected` : 'no market moves this week'}{' '}
              · avg ₹{overallAvg.toLocaleString('en-IN')}/sqft
            </p>
            <p className="text-[11px] mt-1" style={{ color: '#60A5FA' }}>
              {urgentRera.length > 0
                ? `${urgentRera.length} project${urgentRera.length > 1 ? 's' : ''} with possession within 180 days — review below.`
                : 'No possession deadlines within 180 days. Portfolio on track.'}
              {criticalRera.length > 0 && ` ${criticalRera.length} critical (< 90 days).`}
            </p>
          </div>
          <span className="text-[10px] flex-shrink-0 mt-0.5" style={{ color: '#4B5563' }}>
            Week of {now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Status bar */}
      <div className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#34D399' }} />
            <span className="text-[12px] font-medium text-white">{projectCount} projects tracked</span>
          </div>
          <span style={{ color: '#374151' }}>·</span>
          <span className="text-[12px]" style={{ color: '#9CA3AF' }}>{monthAlertCount} moves this month</span>
          <span style={{ color: '#374151' }}>·</span>
          <span className="text-[12px]" style={{ color: '#9CA3AF' }}>Last scan: today 6:00am</span>
        </div>
        <button type="button" className="text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors" style={{ background: 'rgba(96,165,250,0.15)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.2)' }}>
          Run AI now
        </button>
      </div>

      {/* RERA critical banner */}
      {criticalRera.length > 0 && (
        <div className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
          <p className="text-[12px] font-medium" style={{ color: '#F87171' }}>
            🚨 {criticalRera.length} project{criticalRera.length > 1 ? 's' : ''} with RERA deadline within 90 days
          </p>
          <span className="text-[11px] font-medium" style={{ color: '#F87171' }}>
            {criticalRera.map(p => p.projectName).join(', ')}
          </span>
        </div>
      )}

      {/* Row 1: Price Index + RERA tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        <DarkCard title="Micro-Zone Price Index">
          <div className="space-y-3 mb-4">
            {zoneAvgs.map(zone => (
              <div key={zone.zone} className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-white">{zone.zone}</span>
                <div className="text-right">
                  <span className="font-mono text-[14px] font-semibold" style={{ color: '#60A5FA' }}>₹{zone.avg.toLocaleString('en-IN')}/sqft</span>
                  <span className="text-[10px] ml-2" style={{ color: '#4B5563' }}>{zone.count} projects</span>
                </div>
              </div>
            ))}
            {zoneAvgs.length === 0 && <p className="text-[12px]" style={{ color: '#4B5563' }}>No price data yet.</p>}
          </div>
          {allProjects.length > 0 && overallAvg > 0 && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#4B5563' }}>vs avg ₹{overallAvg.toLocaleString('en-IN')}/sqft</p>
              <div className="space-y-1.5">
                {allProjects.slice(0, 6).map(p => {
                  const diff = p.pricePerSqft - overallAvg
                  const pct = ((diff / overallAvg) * 100).toFixed(1)
                  return (
                    <div key={p.id} className="flex items-center justify-between py-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span className="text-[11px] text-white truncate max-w-[160px]">{p.projectName}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px]" style={{ color: '#9CA3AF' }}>₹{p.pricePerSqft.toLocaleString('en-IN')}</span>
                        <span className="text-[10px] font-medium" style={{ color: diff > 0 ? '#F87171' : '#34D399' }}>{diff > 0 ? '+' : ''}{pct}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </DarkCard>

        <DarkCard title="RERA Deadline Tracker">
          <p className="text-[11px] mb-3" style={{ color: '#6B7280' }}>All active projects — possession timeline</p>
          <div className="space-y-2">
            {reraDeadlines.map(project => {
              const status = reraStatus(project.possessionDate)
              const pct = Math.min(100, Math.max(0, status.days > 0 ? Math.min((status.days / 365) * 100, 100) : 0))
              const badgeColor = status.label === 'Overdue' || status.label === 'Critical' ? 'red' : status.label === 'Watch' ? 'amber' : status.label === 'On track' ? 'green' : 'gray'
              return (
                <div key={project.id} className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-white truncate">{project.projectName}</p>
                      <p className="text-[10px]" style={{ color: '#6B7280' }}>{project.builderName} · {project.microMarket}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-[11px] font-mono font-medium" style={{ color: status.color }}>{status.days < 0 ? 'Overdue' : `${status.days}d`}</span>
                      <DarkBadge label={status.label} color={badgeColor as any} />
                    </div>
                  </div>
                  <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-1 rounded-full" style={{ width: `${pct}%`, background: status.color }} />
                  </div>
                  {status.days < 60 && (
                    <Link href={`/admin/intelligence?flag=${project.id}`} className="text-[10px] font-medium mt-1 inline-block hover:underline" style={{ color: '#FBBF24' }}>
                      Flag high risk →
                    </Link>
                  )}
                </div>
              )
            })}
            {reraDeadlines.length === 0 && <p className="text-[12px]" style={{ color: '#4B5563' }}>No active projects yet.</p>}
          </div>
        </DarkCard>
      </div>

      {/* Price History Summary */}
      <DarkCard title="Price History — per-project summary" action={<span className="text-[11px]" style={{ color: '#6B7280' }}>Change from first recorded</span>}>
        {priceSummary.length === 0 ? (
          <p className="text-[12px]" style={{ color: '#4B5563' }}>No price history yet. Use + Log on any project.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr>
                  {['Project', 'Current', 'First', 'Change ₹', 'Change %', ''].map(h => (
                    <th key={h} className="text-left py-2 px-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#4B5563', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {priceSummary.map(row => (
                  <tr key={row.projectId} className="hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="py-2.5 px-2 font-medium text-white truncate max-w-[160px]">{row.projectName}</td>
                    <td className="py-2.5 px-2 font-mono" style={{ color: '#9CA3AF' }}>₹{row.currentPrice.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-2 font-mono" style={{ color: '#6B7280' }}>₹{row.earliestPrice.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-2 font-mono font-medium" style={{ color: row.changeAmount > 0 ? '#F87171' : row.changeAmount < 0 ? '#34D399' : '#6B7280' }}>
                      {row.changeAmount > 0 ? '+' : ''}₹{row.changeAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-2 font-medium" style={{ color: row.changePct > 0 ? '#F87171' : row.changePct < 0 ? '#34D399' : '#6B7280' }}>
                      {row.changePct > 0 ? '+' : ''}{row.changePct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-2"><PriceLogButton projectId={row.projectId} projectName={row.projectName} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {allProjects.filter(p => !priceSummary.find(s => s.projectId === p.id)).length > 0 && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[10px] font-medium mb-2" style={{ color: '#4B5563' }}>No history yet — log first price</p>
            <div className="flex flex-wrap gap-2">
              {allProjects.filter(p => !priceSummary.find(s => s.projectId === p.id)).map(p => (
                <div key={p.id} className="flex items-center gap-2 text-[11px] text-white">
                  <span className="truncate max-w-[140px]">{p.projectName}</span>
                  <PriceLogButton projectId={p.id} projectName={p.projectName} />
                </div>
              ))}
            </div>
          </div>
        )}
      </DarkCard>

      <div className="mb-4" />

      {/* Row 2: Price History detail + Market Moves */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <DarkCard title="Price History — detailed log">
          <p className="text-[11px] mb-3" style={{ color: '#6B7280' }}>Every change logged. Show to buyers to build trust.</p>
          {priceHistory.length === 0 ? (
            <p className="text-[12px]" style={{ color: '#4B5563' }}>No price changes logged yet.</p>
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
                    <p className="text-[11px] font-semibold text-white mb-1.5">{name}</p>
                    <div className="space-y-1">
                      {history.slice(0, 4).map((h, i) => {
                        const prev = history[i + 1]
                        const change = prev != null ? h.pricePerSqft - prev.pricePerSqft : null
                        const pct = (prev != null && change !== null) ? ((change / prev.pricePerSqft) * 100).toFixed(1) : null
                        return (
                          <div key={h.id} className="flex items-center justify-between py-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <span className="text-[10px]" style={{ color: '#6B7280' }}>
                              {new Date(h.recordedAt).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}
                            </span>
                            <span className="font-mono text-[11px]" style={{ color: '#9CA3AF' }}>₹{h.pricePerSqft.toLocaleString('en-IN')}/sqft</span>
                            {change !== null && (
                              <span className="text-[10px] font-medium" style={{ color: change > 0 ? '#F87171' : '#34D399' }}>
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
        </DarkCard>

        <DarkCard title="Market Moves" action={<AddMarketAlertButton />}>
          <p className="text-[11px] mb-3" style={{ color: '#6B7280' }}>South Bopal & Shela · manually logged · AI suggests affected buyers</p>
          {marketAlerts.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-[12px]" style={{ color: '#4B5563' }}>No market moves logged yet.</p>
              <p className="text-[11px] mt-1" style={{ color: '#374151' }}>Log price changes, new launches, delays.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {marketAlerts.map(alert => {
                const icon = alertIcon[alert.type] ?? 'i'
                const color = alertColor[alert.type] ?? '#185FA5'
                const impact = impactBadge[alert.type] ?? impactBadge.other
                const badgeColor = impact.color === '#A32D2D' ? 'red' : impact.color === '#BA7517' ? 'amber' : impact.color === '#0C447C' ? 'blue' : 'gray'
                return (
                  <div key={alert.id} className="flex items-start gap-2.5 pb-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5" style={{ background: color + '22', color }}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[12px] font-medium text-white">{alert.title}</p>
                        <DarkBadge label={impact.label} color={badgeColor as any} />
                      </div>
                      <p className="text-[11px] leading-relaxed" style={{ color: '#9CA3AF' }}>{alert.description}</p>
                      {alert.projectName && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded mt-1 inline-block" style={{ background: 'rgba(255,255,255,0.06)', color: '#6B7280' }}>{alert.projectName}</span>
                      )}
                    </div>
                    <span className="text-[10px] flex-shrink-0 mt-0.5" style={{ color: '#4B5563' }}>
                      {new Date(alert.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </DarkCard>
      </div>
    </div>
  )
}
