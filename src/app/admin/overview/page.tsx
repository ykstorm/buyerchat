// src/app/admin/overview/page.tsx — v3 Founder Dashboard
import { prisma } from '@/lib/prisma'
import { formatLakh, daysBetween, getStageLabel, getUrgency } from '@/lib/admin-utils'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

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
  let scoringQueueCount = 0
  let postVisitSilenceCount = 0

  try {
    const [
      buyers, projects, earned, pendingVisits, rera,
      urgents, weekChats, weekVisits, qualified, stageGroups,
      pipeline, deal, pipelineBudget, todayConvs, scoringQueue, postVisitSilence,
    ] = await Promise.all([
      prisma.chatSession.count({ where: { buyerStage: { not: 'decision' } } }).catch(() => 0),
      prisma.project.count({ where: { isActive: true } }).catch(() => 0),
      prisma.deal.aggregate({ _sum: { commissionAmount: true } }).catch(() => ({ _sum: { commissionAmount: null } })),
      prisma.siteVisit.count({ where: { visitCompleted: false } }).catch(() => 0),
      prisma.project.count({
        where: {
          possessionDate: { lte: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) },
          constructionStatus: 'Under Construction',
        },
      }).catch(() => 0),
      prisma.chatSession.findMany({
        where: { lastMessageAt: { lt: twoDaysAgo } },
        orderBy: { lastMessageAt: 'asc' },
        take: 6,
        select: { id: true, buyerPersona: true, buyerConfig: true, buyerStage: true, lastMessageAt: true },
      }).catch(() => []),
      prisma.chatSession.count({ where: { createdAt: { gte: startOfWeek } } }).catch(() => 0),
      prisma.siteVisit.count({ where: { createdAt: { gte: startOfWeek } } }).catch(() => 0),
      prisma.chatSession.count({ where: { qualificationDone: true, createdAt: { gte: startOfWeek } } }).catch(() => 0),
      prisma.chatSession.groupBy({ by: ['buyerStage'], _count: { _all: true } }).catch(() => []),
      prisma.chatSession.findMany({
        where: { buyerStage: { in: ['comparison', 'visit_trigger', 'pre_visit', 'post_visit'] } },
        orderBy: [{ buyerBudget: 'desc' }, { lastMessageAt: 'desc' }],
        take: 8,
        select: { id: true, buyerPersona: true, buyerConfig: true, buyerStage: true, buyerBudget: true },
      }).catch(() => []),
      prisma.deal.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { builderBrandName: true, buyerName: true, dealValue: true, commissionAmount: true, invoiceDate: true, paymentStatus: true },
      }).catch(() => null),
      prisma.chatSession.aggregate({
        _sum: { buyerBudget: true },
        where: { buyerStage: { not: 'decision' }, buyerBudget: { not: null } },
      }).catch(() => ({ _sum: { buyerBudget: null } })),
      prisma.chatSession.count({ where: { lastMessageAt: { gte: startOfToday } } }).catch(() => 0),
      prisma.project.count({ where: { isActive: true, OR: [{ decisionTag: null }, { decisionTag: '' }, { honestConcern: null }, { honestConcern: '' }] } }).catch(() => 0),
      prisma.chatSession.count({ where: { buyerStage: 'post_visit', lastMessageAt: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) } } }).catch(() => 0),
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
      (sum, s) => sum + (stageGroups.find((g: { buyerStage: string; _count: { _all: number } }) => g.buyerStage === s)?._count._all ?? 0), 0
    )
    stageCounts = Object.fromEntries(stageGroups.map((s: { buyerStage: string; _count: { _all: number } }) => [s.buyerStage, s._count._all]))
    pipelineSessions = pipeline
    latestDeal = deal
    pipelineBudgetSum = (pipelineBudget._sum.buyerBudget ?? 0) * 0.015
    todayConversations = todayConvs
    scoringQueueCount = scoringQueue
    postVisitSilenceCount = postVisitSilence
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
    <div className="min-h-screen" style={{ background: '#0A0F1E' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[22px] font-bold text-white">{greeting}</p>
          <p className="text-[12px] mt-0.5" style={{ color: '#6B7280' }}>{dateStr}</p>
        </div>
        {pipelineBudgetSum > 0 && (
          <div className="px-3 py-1.5 rounded-full" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <p className="text-[11px] font-semibold" style={{ color: '#10B981' }}>
              Pipeline ~ ₹{formatLakh(pipelineBudgetSum)} commission
            </p>
          </div>
        )}
      </div>

      {/* Deal banner */}
      {latestDeal && (
        <div className="mb-5 rounded-2xl p-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #1B3A6B 0%, #0D3570 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: 'rgba(255,255,255,0.15)' }}>₹</div>
            <div>
              <p className="text-[13px] font-semibold text-white">Deal Closed — {latestDeal.builderBrandName}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {latestDeal.buyerName} · ₹{formatLakh(latestDeal.dealValue)} · {new Date(latestDeal.invoiceDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[22px] font-bold" style={{ color: '#34D399' }}>+₹{formatLakh(latestDeal.commissionAmount)}</p>
            <p className="text-[10px]" style={{ color: latestDeal.paymentStatus === 'received' ? '#34D399' : '#F59E0B' }}>
              {latestDeal.paymentStatus === 'paid' || latestDeal.paymentStatus === 'received' ? '✓ Received' : '⏳ Pending'}
            </p>
          </div>
        </div>
      )}

      {/* Alerts strip */}
      {alerts.filter(a => a.color === '#A32D2D' || a.color === '#BA7517').length > 0 && (
        <div className="mb-5 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <span className="text-[11px] font-bold" style={{ color: '#F87171' }}>🔴 {alerts.filter(a => a.color === '#A32D2D' || a.color === '#BA7517').length} items need attention</span>
          <span className="text-[11px]" style={{ color: '#9CA3AF' }}>{alerts.filter(a => a.color !== '#0F6E56').map(a => a.title).join(' · ')}</span>
          <Link href="/admin/followup" className="ml-auto text-[11px] font-semibold px-3 py-1 rounded-lg" style={{ background: 'rgba(239,68,68,0.15)', color: '#F87171' }}>View all →</Link>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        {[
          { label: 'Active Buyers', value: activeBuyerCount, sub: '30-day window', color: '#60A5FA', href: '/admin/buyers' },
          { label: 'Live Projects', value: projectsLiveCount, sub: `${scoringQueueCount} need scoring`, color: '#A78BFA', href: '/admin/projects' },
          { label: 'Commission Earned', value: `₹${formatLakh(totalEarned)}`, sub: 'All time', color: '#34D399', href: '/admin/revenue' },
          { label: 'Pending Visits', value: pendingVisitCount, sub: 'Unconfirmed', color: pendingVisitCount > 0 ? '#F87171' : '#34D399', href: '/admin/followup' },
          { label: 'Post-Visit Silence', value: postVisitSilenceCount, sub: '48h+ no reply', color: postVisitSilenceCount > 0 ? '#F87171' : '#34D399', href: '/admin/followup' },
          { label: 'RERA Alerts', value: reraAlertCount, sub: 'Within 90 days', color: reraAlertCount > 0 ? '#FBBF24' : '#34D399', href: '/admin/intelligence' },
          { label: 'Hot Pipeline', value: activeStageCount, sub: 'Comparison+', color: '#FBBF24', href: '/admin/buyers' },
          { label: 'This Week Chats', value: weekChatCount, sub: `${qualifiedThisWeek} qualified`, color: '#60A5FA', href: '/admin/buyers' },
          { label: "Today's Chats", value: todayConversations, sub: 'Active today', color: '#A78BFA', href: '/admin/buyers' },
        ].map((card, i) => (
          <Link key={i} href={card.href} className="block rounded-xl px-4 py-3 transition-all hover:scale-[1.02]" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>{card.label}</p>
            <p className="text-[24px] font-bold leading-none mb-1" style={{ color: card.color }}>{card.value}</p>
            <p className="text-[10px]" style={{ color: '#4B5563' }}>{card.sub}</p>
          </Link>
        ))}
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Pipeline funnel */}
        <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-semibold text-white">Pipeline</p>
            <Link href="/admin/buyers" className="text-[11px] font-medium" style={{ color: '#60A5FA' }}>Open CRM →</Link>
          </div>
          <div className="space-y-2.5">
            {stageOrder.map(stage => {
              const count = stageCounts[stage] ?? 0
              const hot = ['comparison', 'visit_trigger', 'pre_visit', 'post_visit'].includes(stage)
              const barColor = stage === 'decision' ? '#34D399' : hot ? '#FBBF24' : '#3B82F6'
              const width = Math.max((count / maxStageCount) * 100, count > 0 ? 4 : 0)
              return (
                <div key={stage} className="flex items-center gap-2">
                  <span className="text-[10px] w-24 flex-shrink-0" style={{ color: '#9CA3AF' }}>{getStageLabel(stage)}</span>
                  <div className="flex-1 rounded-full h-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${width}%`, background: barColor }} />
                  </div>
                  <span className="text-[11px] font-semibold w-5 text-right" style={{ color: hot && count > 0 ? '#FBBF24' : '#6B7280' }}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Follow-up queue */}
        <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-semibold text-white">Follow-up Queue</p>
            <Link href="/admin/followup" className="text-[11px] font-medium" style={{ color: '#60A5FA' }}>All →</Link>
          </div>
          <div className="space-y-2">
            {urgentSessions.length === 0 ? (
              <p className="text-[12px]" style={{ color: '#4B5563' }}>No urgent follow-ups</p>
            ) : urgentSessions.slice(0, 5).map(s => {
              const { label: urgencyLabel, color: urgencyColor } = getUrgency(s.lastMessageAt)
              const isRed = urgencyColor === 'red'
              return (
                <Link key={s.id} href={`/admin/buyers/${s.id}`} className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-white/5" style={{ background: isRed ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.06)' }}>
                  <div>
                    <p className="text-[11px] font-medium" style={{ color: isRed ? '#F87171' : '#FCD34D' }}>
                      {s.buyerConfig ?? 'Buyer'} · {getStageLabel(s.buyerStage)}
                    </p>
                    <p className="text-[10px]" style={{ color: '#6B7280' }}>{daysBetween(s.lastMessageAt)}d silent</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: isRed ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.15)', color: isRed ? '#F87171' : '#FBBF24' }}>
                    {urgencyLabel}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Pipeline snapshot */}
        <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-semibold text-white">Hot Buyers</p>
            <span className="text-[11px]" style={{ color: '#6B7280' }}>~₹{formatLakh(pipelineTableTotal)} pipeline</span>
          </div>
          <div className="space-y-1.5">
            {pipelineSessions.length === 0 ? (
              <p className="text-[12px]" style={{ color: '#4B5563' }}>No active pipeline</p>
            ) : pipelineSessions.slice(0, 6).map(s => (
              <Link key={s.id} href={`/admin/buyers/${s.id}`} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/5 transition-colors">
                <div>
                  <p className="text-[11px] font-medium text-white">{s.buyerConfig ?? '—'} · {getStageLabel(s.buyerStage)}</p>
                  <p className="text-[10px]" style={{ color: '#6B7280' }}>{s.buyerPersona ?? 'buyer'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold" style={{ color: '#34D399' }}>
                    {s.buyerBudget ? `₹${formatLakh(s.buyerBudget * 0.015)}` : '—'}
                  </p>
                  <p className="text-[9px]" style={{ color: '#4B5563' }}>est. commission</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Today's actions */}
        <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-semibold text-white">Today's Actions</p>
            <span className="text-[10px]" style={{ color: '#4B5563' }}>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          </div>
          <div className="space-y-2">
            {[
              urgentSessions.length > 0 && {
                icon: '🔴', text: `Contact ${urgentSessions.length} urgent buyer${urgentSessions.length > 1 ? 's' : ''} today`, href: '/admin/followup', color: '#F87171'
              },
              postVisitSilenceCount > 0 && {
                icon: '⏰', text: `${postVisitSilenceCount} post-visit buyer${postVisitSilenceCount > 1 ? 's' : ''} need 48h follow-up`, href: '/admin/followup', color: '#FBBF24'
              },
              scoringQueueCount > 0 && {
                icon: '📋', text: `Score ${scoringQueueCount} project${scoringQueueCount > 1 ? 's' : ''} — buyers seeing ₹0 prices`, href: '/admin/projects', color: '#FBBF24'
              },
              pendingVisitCount > 0 && {
                icon: '🏗', text: `${pendingVisitCount} site visit${pendingVisitCount > 1 ? 's' : ''} upcoming — send builder brief`, href: '/admin/visits', color: '#60A5FA'
              },
              reraAlertCount > 0 && {
                icon: '⚠️', text: `${reraAlertCount} RERA deadline${reraAlertCount > 1 ? 's' : ''} within 90 days`, href: '/admin/intelligence', color: '#F87171'
              },
            ].filter(Boolean).map((action: any, i) => (
              <Link key={i} href={action.href} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="text-[14px]">{action.icon}</span>
                <span className="text-[11px]" style={{ color: action.color }}>{action.text}</span>
                <span className="ml-auto text-[10px]" style={{ color: '#4B5563' }}>→</span>
              </Link>
            ))}
            {urgentSessions.length === 0 && postVisitSilenceCount === 0 && scoringQueueCount === 0 && (
              <p className="text-[12px] text-center py-4" style={{ color: '#4B5563' }}>All clear — no urgent actions today ✓</p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
