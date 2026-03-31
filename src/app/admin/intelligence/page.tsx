import { prisma } from '@/lib/prisma'
import { formatLakh } from '@/lib/admin-utils'
import AddMarketAlertButton from '@/components/admin/AddMarketAlertButton'

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

export default async function IntelligencePage() {
  let allProjects: any[] = []
  let reraDeadlines: any[] = []
  let marketAlerts: any[] = []
  let priceHistory: any[] = []

  try {
    allProjects = await prisma.project.findMany({
      where: { isActive: true },
      select: { id: true, projectName: true, microMarket: true, pricePerSqft: true, possessionDate: true, constructionStatus: true, builderName: true, reraNumber: true },
      orderBy: { pricePerSqft: 'desc' },
    })

    reraDeadlines = await prisma.project.findMany({
      where: { constructionStatus: 'Under Construction' },
      orderBy: { possessionDate: 'asc' },
      take: 8,
      select: { id: true, projectName: true, possessionDate: true, microMarket: true, builderName: true },
    })

    marketAlerts = await prisma.marketAlert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
    })

    priceHistory = await prisma.priceHistory.findMany({
      include: { project: { select: { projectName: true, builderName: true } } },
      orderBy: { recordedAt: 'desc' },
      take: 20,
    })
  } catch (err) {
    console.error('Intelligence fetch error:', err)
  }

  // Zone averages
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
  const overallAvg = allProjects.length > 0
    ? Math.round(allProjects.reduce((s, p) => s + p.pricePerSqft, 0) / allProjects.length)
    : 0

  // RERA deadline classification
  function reraStatus(possessionDate: Date) {
    const days = Math.floor((new Date(possessionDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (days < 0) return { label: 'Overdue', color: '#A32D2D', bg: '#FCEBEB', days }
    if (days < 90) return { label: 'Critical', color: '#A32D2D', bg: '#FCEBEB', days }
    if (days < 180) return { label: 'Watch', color: '#BA7517', bg: '#FAEEDA', days }
    if (days < 365) return { label: 'On track', color: '#0F6E56', bg: '#E1F5EE', days }
    return { label: 'Long term', color: '#52525B', bg: '#F4F4F5', days }
  }

  // Alert type icons
  const alertIcon: Record<string, string> = {
    price_change: '↑', new_launch: '+', delay: '!', other: 'i'
  }
  const alertColor: Record<string, string> = {
    price_change: '#A32D2D', new_launch: '#0F6E56', delay: '#BA7517', other: '#185FA5'
  }

  const criticalRera = reraDeadlines.filter(p => {
    const days = Math.floor((new Date(p.possessionDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days < 90
  })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[14px] font-medium text-[#1A1A2E]">Intelligence / Market Intelligence</h1>
          <p className="text-[12px] text-[#52525B]">Price index · RERA alerts · market moves · buyer patterns</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#52525B]">AI last run: today 6:00 AM</span>
          <button type="button" className="text-[11px] bg-[#185FA5] text-white px-3 py-1.5 rounded-lg hover:bg-[#0C447C] transition-colors">
            Run AI now
          </button>
        </div>
      </div>

      {/* RERA alert banner if critical */}
      {criticalRera.length > 0 && (
        <div className="bg-[#FCEBEB] border border-[#A32D2D]/30 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#A32D2D] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">!</span>
            <p className="text-[12px] font-medium text-[#791F1F]">
              {criticalRera.length} project{criticalRera.length > 1 ? 's' : ''} with RERA deadline within 90 days — review buyer recommendations immediately
            </p>
          </div>
          <span className="text-[11px] text-[#A32D2D] font-medium">{criticalRera.map(p => p.projectName).join(', ')}</span>
        </div>
      )}

      {/* Row 1: Price Index + RERA tracker */}
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
            {zoneAvgs.length === 0 && <p className="text-[12px] text-[#52525B]">No price data yet. Add projects to see index.</p>}
          </div>

          {/* Above/below avg */}
          {allProjects.length > 0 && overallAvg > 0 && (
            <>
              <p className="text-[10px] font-medium text-[#52525B] uppercase tracking-wider mb-2">vs micro-zone avg (₹{overallAvg.toLocaleString('en-IN')}/sqft)</p>
              <div className="space-y-1.5">
                {allProjects.slice(0, 6).map(p => {
                  const diff = p.pricePerSqft - overallAvg
                  const pct = ((diff / overallAvg) * 100).toFixed(1)
                  const isAbove = diff > 0
                  return (
                    <div key={p.id} className="flex items-center justify-between py-1 border-b border-[#F4F4F5] last:border-0">
                      <span className="text-[11px] text-[#1A1A2E] truncate max-w-[160px]">{p.projectName}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-[#1A1A2E]">₹{p.pricePerSqft.toLocaleString('en-IN')}</span>
                        <span className="text-[10px] font-medium" style={{ color: isAbove ? '#A32D2D' : '#0F6E56' }}>
                          {isAbove ? '+' : ''}{pct}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </Card>

        {/* RERA Deadline Tracker */}
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
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: status.bg, color: status.color }}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-[#E4E4E7] rounded-full">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: status.color }} />
                  </div>
                  <p className="text-[10px] text-[#71717A] mt-1">
                    Possession: {new Date(project.possessionDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
              )
            })}
            {reraDeadlines.length === 0 && (
              <p className="text-[12px] text-[#52525B]">No active projects yet.</p>
            )}
          </div>

          {/* RERA legend */}
          <div className="mt-3 pt-3 border-t border-[#F4F4F5]">
            <p className="text-[10px] font-medium text-[#52525B] mb-1.5">Status guide</p>
            <div className="grid grid-cols-2 gap-1">
              {[
                { label: 'Overdue / Critical (<90d)', color: '#A32D2D' },
                { label: 'Watch (90–180d)', color: '#BA7517' },
                { label: 'On track (180d–1yr)', color: '#0F6E56' },
                { label: 'Long term (1yr+)', color: '#52525B' },
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

      {/* Row 2: Price History + Market Moves */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Price History */}
        <Card title="Price History — AaiGhar proprietary data">
          <p className="text-[11px] text-[#52525B] mb-3">Every price change logged with date. Show to buyers to build instant trust.</p>
          {priceHistory.length === 0 ? (
            <p className="text-[12px] text-[#52525B]">No price changes logged yet. Changes are auto-logged when you update project prices.</p>
          ) : (
            <div className="space-y-1">
              {/* Group by project */}
              {(() => {
                const byProject: Record<string, any[]> = {}
                priceHistory.forEach(h => {
                  const name = h.project?.projectName ?? 'Unknown'
                  if (!byProject[name]) byProject[name] = []
                  byProject[name].push(h)
                })
                return Object.entries(byProject).slice(0, 3).map(([name, history]) => (
                  <div key={name} className="mb-3">
                    <p className="text-[11px] font-semibold text-[#1A1A2E] mb-1.5">{name} — {history[0]?.project?.builderName}</p>
                    <div className="space-y-1">
                      {history.slice(0, 4).map((h, i) => {
                        const prev = history[i + 1]
                        const change = prev ? h.pricePerSqft - prev.pricePerSqft : null
                        const pct = prev ? ((change! / prev.pricePerSqft) * 100).toFixed(1) : null
                        return (
                          <div key={h.id} className="flex items-center justify-between py-1 border-b border-[#F4F4F5] last:border-0">
                            <span className="text-[10px] text-[#52525B]">
                              {new Date(h.recordedAt).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}
                            </span>
                            <span className="font-mono text-[11px] text-[#1A1A2E]">₹{h.pricePerSqft.toLocaleString('en-IN')}/sqft</span>
                            {change !== null && (
                              <span className="text-[10px] font-medium" style={{ color: change > 0 ? '#A32D2D' : '#0F6E56' }}>
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

        {/* Market Moves */}
        <Card
          title="Market Moves"
          action={<AddMarketAlertButton />}
        >
          <p className="text-[11px] text-[#52525B] mb-3">South Bopal & Shela · manually logged · AI suggests affected buyers</p>
          {marketAlerts.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-[12px] text-[#52525B]">No market moves logged yet.</p>
              <p className="text-[11px] text-[#71717A] mt-1">Log price changes, new launches, delays, and builder news.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {marketAlerts.map(alert => {
                const icon = alertIcon[alert.type] ?? 'i'
                const color = alertColor[alert.type] ?? '#185FA5'
                return (
                  <div key={alert.id} className="flex items-start gap-2.5 pb-2.5 border-b border-[#F4F4F5] last:border-0">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: color + '18', color }}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-[#1A1A2E]">{alert.title}</p>
                      <p className="text-[11px] text-[#52525B] mt-0.5 leading-relaxed">{alert.description}</p>
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

      {/* All projects summary */}
      <Card title={`All Scored Projects — ${allProjects.length} projects`}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[#F4F4F5]">
                {['Project', 'Area', 'Price/sqft', 'vs avg', 'Possession', 'Status'].map(h => (
                  <th key={h} className="text-left text-[10px] text-[#52525B] font-medium py-2 pr-4 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allProjects.map(p => {
                const diff = overallAvg > 0 ? p.pricePerSqft - overallAvg : 0
                const pct = overallAvg > 0 ? ((diff / overallAvg) * 100).toFixed(1) : '0'
                const status = reraStatus(p.possessionDate)
                return (
                  <tr key={p.id} className="border-b border-[#F4F4F5] last:border-0 hover:bg-[#F8FAFC]">
                    <td className="py-2.5 pr-4 font-medium text-[#1A1A2E]">{p.projectName}</td>
                    <td className="py-2.5 pr-4 text-[#52525B]">{p.microMarket}</td>
                    <td className="py-2.5 pr-4 font-mono text-[#1A1A2E]">₹{p.pricePerSqft.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 pr-4">
                      <span className="text-[11px] font-medium" style={{ color: diff > 0 ? '#A32D2D' : diff < 0 ? '#0F6E56' : '#52525B' }}>
                        {diff > 0 ? '+' : ''}{pct}%
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-[#52525B]">
                      {new Date(p.possessionDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-2.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: status.bg, color: status.color }}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {allProjects.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-[12px] text-[#52525B]">No projects yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
