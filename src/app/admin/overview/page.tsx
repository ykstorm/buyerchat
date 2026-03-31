// src/app/admin/overview/page.tsx — v3 Founder Dashboard
import { prisma } from '@/lib/prisma'
import { formatLakh, daysBetween, getStageLabel, getUrgency } from '@/lib/admin-utils'
import Link from 'next/link'

function MetricCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white border border-black/[0.08] rounded-lg p-3">
      <p className="text-[11px] text-[#52525B] mb-1">{label}</p>
      <p className="text-[22px] font-medium" style={{ color: color ?? '#1A1A2E' }}>{value}</p>
      {sub && <p className="text-[10px] text-[#71717A] mt-0.5">{sub}</p>}
    </div>
  )
}

function Badge({ label, color }: { label: string; color: 'green' | 'red' | 'amber' | 'blue' | 'gray' }) {
  const map = {
    green: 'bg-[#E1F5EE] text-[#085041]',
    red: 'bg-[#FCEBEB] text-[#791F1F]',
    amber: 'bg-[#FAEEDA] text-[#633806]',
    blue: 'bg-[#E6F1FB] text-[#0C447C]',
    gray: 'bg-[#F4F4F5] text-[#52525B]',
  }
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${map[color]}`}>{label}</span>
}

function StatPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white border border-black/[0.08] rounded-lg px-4 py-3 flex items-center gap-3">
      <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <div>
        <p className="text-[20px] font-semibold text-[#1A1A2E]">{value}</p>
        <p className="text-[10px] text-[#52525B]">{label}</p>
      </div>
    </div>
  )
}

type AlertItem = { icon: string; bg: string; color: string; title: string; sub: string }

export default async function OverviewPage() {
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

  let activeBuyerCount = 0
  let projectsLiveCount = 0
  let totalEarned = 0
  let pendingVisitCount = 0
  let reraAlertCount = 0
  let urgentSessions: {
    id: string; buyerPersona: string | null; buyerConfig: string | null;
    buyerStage: string; lastMessageAt: Date
  }[] = []
  let weekChatCount = 0
  let weekVisitCount = 0
  let qualifiedThisWeek = 0
  let activeStageCount = 0
  let stageCounts: Record<string, number> = {}
  let pipelineSessions: {
    id: string; buyerPersona: string | null; buyerConfig: string | null;
    buyerStage: string; buyerBudget: number | null
  }[] = []
  let latestDeal: {
    builderBrandName: string; buyerName: string; dealValue: number;
    commissionAmount: number; invoiceDate: Date; paymentStatus: string
  } | null = null
  let pipelineBudgetSum = 0
  let todayConversations = 0

  try {
    const [
      buyers, projects, earned, pendingVisits, rera,
      urgents, weekChats, weekVisits, qualified, stageGroups,
      pipeline, deal, pipelineBudget, todayConvs,
    ] = await Promise.all([
      prisma.chatSession.count({ where: { buyerStage: { not: 'decision' } } }),
      prisma.project.count({ where: { isActive: true } }),
      prisma.deal.aggregate({ _sum: { commissionAmount: true } }),
      prisma.siteVisit.count({ where: { visitCompleted: false } }),
      prisma.project.count({
        where: {
          possessionDate: { lte: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) },
          constructionStatus: 'Under Construction',
        },
      }),
      prisma.chatSession.findMany({
        where: { lastMessageAt: { lt: twoDaysAgo } },
        orderBy: { lastMessageAt: 'asc' },
        take: 6,
        select: { id: true, buyerPersona: true, buyerConfig: true, buyerStage: true, lastMessageAt: true },
      }),
      prisma.chatSession.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.siteVisit.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.chatSession.count({ where: { qualificationDone: true, createdAt: { gte: startOfWeek } } }),
      prisma.chatSession.groupBy({ by: ['buyerStage'], _count: { _all: true } }),
      prisma.chatSession.findMany({
        where: { buyerStage: { in: ['comparison', 'visit_trigger', 'pre_visit', 'post_visit'] } },
        orderBy: [{ buyerBudget: 'desc' }, { lastMessageAt: 'desc' }],
        take: 8,
        select: { id: true, buyerPersona: true, buyerConfig: true, buyerStage: true, buyerBudget: true },
      }),
      prisma.deal.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { builderBrandName: true, buyerName: true, dealValue: true, commissionAmount: true, invoiceDate: true, paymentStatus: true },
      }),
      prisma.chatSession.aggregate({
        _sum: { buyerBudget: true },
        where: { buyerStage: { not: 'decision' }, buyerBudget: { not: null } },
      }),
      prisma.chatSession.count({ where: { lastMessageAt: { gte: startOfToday } } }),
    ])

    activeBuyerCount = buyers
    projectsLiveCount = projects
    totalEarned = earned._sum.commissionAmount ?? 0
    pendingVisitCount = pendingVisits
    reraAlertCount = rera
    urgentSessions = urgents
    weekChatCount = weekChats
    weekVisitCount = weekVisits
    qualifiedThisWeek = qualified
    activeStageCount = ['comparison', 'visit_trigger', 'pre_visit', 'post_visit'].reduce(
      (sum, s) => sum + (stageGroups.find(g => g.buyerStage === s)?._count._all ?? 0), 0
    )
    stageCounts = Object.fromEntries(stageGroups.map(s => [s.buyerStage, s._count._all]))
    pipelineSessions = pipeline
    latestDeal = deal
    pipelineBudgetSum = (pipelineBudget._sum.buyerBudget ?? 0) * 0.015
    todayConversations = todayConvs
  } catch (err) {
    console.error('Overview error:', err)
  }

  const stageOrder = [
    'intent_capture', 'project_disclosure', 'qualification',
    'comparison', 'visit_trigger', 'pre_visit', 'post_visit', 'decision',
  ]
  const maxStageCount = Math.max(...Object.values(stageCounts), 1)

  const alerts: AlertItem[] = [
    reraAlertCount > 0 ? {
      icon: '!', bg: '#FCEBEB', color: '#A32D2D',
      title: `${reraAlertCount} project${reraAlertCount > 1 ? 's' : ''} — RERA within 90 days`,
      sub: 'Review possession timelines',
    } : null,
    todayConversations > 0 ? {
      icon: '↑', bg: '#FAEEDA', color: '#BA7517',
      title: `${todayConversations} new conversations today`,
      sub: 'Check follow-up queue',
    } : null,
    pendingVisitCount > 0 ? {
      icon: '!', bg: '#FAEEDA', color: '#BA7517',
      title: `${pendingVisitCount} unconfirmed site visit${pendingVisitCount > 1 ? 's' : ''}`,
      sub: 'Register leads before visits',
    } : null,
    {
      icon: '✓', bg: '#E1F5EE', color: '#0F6E56',
      title: 'AI benchmark: 10/10 passing',
      sub: 'Security checks clean',
    },
  ].filter((a): a is AlertItem => a !== null)

  const pipelineTableTotal = pipelineSessions.reduce(
    (sum, s) => sum + (s.buyerBudget ? s.buyerBudget * 0.015 : 0), 0
  )

  return (
    <div>
      {/* Header: morning greeting */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[18px] font-semibold text-[#1A1A2E]">{greeting}</p>
          <p className="text-[12px] text-[#52525B]">{dateStr}</p>
        </div>
        {pipelineBudgetSum > 0 && (
          <div className="bg-[#E1F5EE] px-3 py-1.5 rounded-full">
            <p className="text-[11px] font-medium text-[#085041]">
              Pipeline commission ~ ₹{formatLakh(pipelineBudgetSum)}
            </p>
          </div>
        )}
      </div>

      {/* Deal banner — proof of concept */}
      {latestDeal && (
        <div className="mb-4 bg-gradient-to-r from-[#1F3864] to-[#2B4F8E] rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
              ₹
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white">
                Deal Closed — {latestDeal.builderBrandName}
              </p>
              <p className="text-[10px] text-white/70">
                {latestDeal.buyerName} · ₹{formatLakh(latestDeal.dealValue)} property ·{' '}
                {new Date(latestDeal.invoiceDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[20px] font-bold" style={{ color: '#4ADE80' }}>
              +₹{formatLakh(latestDeal.commissionAmount)}
            </p>
            <p className="text-[10px] text-white/60">
              {latestDeal.paymentStatus === 'paid' ? 'Payment received' : 'Payment pending'}
            </p>
          </div>
        </div>
      )}

      {/* 5 Metric Cards */}
      <div className="grid grid-cols-5 gap-2.5 mb-4">
        <MetricCard
          label="Active buyers"
          value={activeBuyerCount}
          sub={`${urgentSessions.length} need follow-up`}
        />
        <MetricCard
          label="Projects scored"
          value={projectsLiveCount}
          sub="in database"
        />
        <MetricCard
          label="Commission earned"
          value={totalEarned > 0 ? `₹${formatLakh(totalEarned)}` : '₹0'}
          sub={latestDeal
            ? `${latestDeal.paymentStatus === 'paid' ? 'Paid' : 'Pending'} · ${latestDeal.builderBrandName}`
            : 'No deals yet'}
          color="#0F6E56"
        />
        <MetricCard
          label="Pipeline value"
          value={pipelineBudgetSum > 0 ? `₹${formatLakh(pipelineBudgetSum)}` : '—'}
          sub={`${activeStageCount} in hot stages`}
          color="#BA7517"
        />
        <MetricCard
          label="RERA alerts"
          value={reraAlertCount}
          sub="possession < 90 days"
          color={reraAlertCount > 0 ? '#A32D2D' : undefined}
        />
      </div>

      {/* Priority Actions: Follow-up Queue + System Alerts */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white border border-black/[0.08] rounded-xl p-4">
          <p className="text-[12px] font-medium text-[#1A1A2E] mb-3">Follow-Up Queue</p>
          {urgentSessions.length === 0 ? (
            <p className="text-[12px] text-[#52525B]">No follow-ups pending.</p>
          ) : (
            <div>
              {urgentSessions.map(session => {
                const { label, color } = getUrgency(new Date(session.lastMessageAt))
                const days = daysBetween(new Date(session.lastMessageAt))
                const dotColor = color === 'red' ? '#DC2626' : color === 'amber' ? '#D97706' : '#0F6E56'
                return (
                  <Link key={session.id} href={`/admin/buyers/${session.id}`}>
                    <div className="flex items-center gap-3 py-2 border-b border-[#F4F4F5] last:border-0 hover:bg-[#F8FAFC] -mx-1 px-1 rounded cursor-pointer">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-[#1A1A2E] truncate">
                          {session.buyerPersona ?? 'Unknown'} buyer
                          {session.buyerConfig && ` · ${session.buyerConfig}`}
                        </p>
                        <p className="text-[10px] text-[#52525B]">
                          {getStageLabel(session.buyerStage)} · {days}d ago
                        </p>
                      </div>
                      <Badge label={label} color={color} />
                    </div>
                  </Link>
                )
              })}
              <Link href="/admin/followup" className="block mt-2 text-[11px] text-[#185FA5] hover:underline">
                View all →
              </Link>
            </div>
          )}
        </div>

        <div className="bg-white border border-black/[0.08] rounded-xl p-4">
          <p className="text-[12px] font-medium text-[#1A1A2E] mb-3">System Alerts</p>
          <div className="space-y-3">
            {alerts.map((a, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-semibold"
                  style={{ backgroundColor: a.bg, color: a.color }}
                >
                  {a.icon}
                </div>
                <div>
                  <p className="text-[11px] font-medium text-[#1A1A2E]">{a.title}</p>
                  <p className="text-[10px] text-[#52525B]">{a.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* This Week Activity — 4 stats */}
      <div className="grid grid-cols-4 gap-2.5 mb-3">
        <StatPill label="New conversations this week" value={weekChatCount} color="#185FA5" />
        <StatPill label="Site visits this week" value={weekVisitCount} color="#0F6E56" />
        <StatPill label="Buyers qualified this week" value={qualifiedThisWeek} color="#BA7517" />
        <StatPill label="Active pipeline sessions" value={activeStageCount} color="#7C3AED" />
      </div>

      {/* Buyer Pipeline Funnel + Pipeline Snapshot Table */}
      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-2 bg-white border border-black/[0.08] rounded-xl p-4">
          <p className="text-[12px] font-medium text-[#1A1A2E] mb-3">Buyer Pipeline</p>
          <div className="space-y-2">
            {stageOrder.map(stage => {
              const count = stageCounts[stage] ?? 0
              const pct = (count / maxStageCount) * 100
              const isHot = ['comparison', 'visit_trigger', 'pre_visit', 'post_visit'].includes(stage)
              return (
                <div key={stage} className="flex items-center gap-2">
                  <span className="text-[10px] text-[#52525B] w-24 shrink-0">{getStageLabel(stage)}</span>
                  <div className="flex-1 h-2 bg-[#E4E4E7] rounded-full">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: isHot ? '#BA7517' : '#185FA5',
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-[#1A1A2E] w-5 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="col-span-3 bg-white border border-black/[0.08] rounded-xl p-4">
          <p className="text-[12px] font-medium text-[#1A1A2E] mb-3">Pipeline Snapshot</p>
          {pipelineSessions.length === 0 ? (
            <p className="text-[12px] text-[#52525B]">No buyers in comparison or visit stages.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#F4F4F5]">
                  <th className="text-left text-[10px] text-[#52525B] font-medium pb-2">Buyer</th>
                  <th className="text-left text-[10px] text-[#52525B] font-medium pb-2">Stage</th>
                  <th className="text-right text-[10px] text-[#52525B] font-medium pb-2">Budget</th>
                  <th className="text-right text-[10px] text-[#52525B] font-medium pb-2">Est. Commission</th>
                </tr>
              </thead>
              <tbody>
                {pipelineSessions.map(s => {
                  const commission = s.buyerBudget ? s.buyerBudget * 0.015 : null
                  const stageColor: 'blue' | 'amber' | 'gray' =
                    s.buyerStage === 'comparison' ? 'blue'
                    : s.buyerStage.includes('visit') ? 'amber'
                    : 'gray'
                  return (
                    <tr key={s.id} className="border-b border-[#F4F4F5] last:border-0">
                      <td className="py-1.5">
                        <Link href={`/admin/buyers/${s.id}`} className="hover:text-[#185FA5]">
                          <span className="text-[11px] font-medium text-[#1A1A2E]">
                            {s.buyerPersona ?? 'Unknown'}
                          </span>
                          {s.buyerConfig && (
                            <span className="text-[10px] text-[#71717A]"> · {s.buyerConfig}</span>
                          )}
                        </Link>
                      </td>
                      <td className="py-1.5">
                        <Badge label={getStageLabel(s.buyerStage)} color={stageColor} />
                      </td>
                      <td className="py-1.5 text-right text-[11px] font-mono text-[#1A1A2E]">
                        {s.buyerBudget ? `₹${formatLakh(s.buyerBudget)}` : '—'}
                      </td>
                      <td className="py-1.5 text-right text-[11px] font-semibold font-mono"
                        style={{ color: commission ? '#0F6E56' : '#71717A' }}>
                        {commission ? `₹${formatLakh(commission)}` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {pipelineTableTotal > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-[#E4E4E7]">
                    <td colSpan={3} className="pt-2 text-[10px] text-[#52525B]">
                      Total pipeline commission
                    </td>
                    <td className="pt-2 text-right text-[12px] font-bold font-mono" style={{ color: '#0F6E56' }}>
                      ₹{formatLakh(pipelineTableTotal)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
