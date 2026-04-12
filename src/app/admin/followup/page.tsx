import { prisma } from '@/lib/prisma'
import { daysBetween, formatLakh, getPersonaLabel, getStageLabel } from '@/lib/admin-utils'
import { DarkMetricCard, DarkCard, DarkBadge } from '@/components/admin/DarkCard'
import Link from 'next/link'
import DraftMessageButton from '@/components/admin/DraftMessageButton'

const STAGE_RULES: Record<string, { urgency: string; color: string; days: number; action: string }> = {
  intent_capture:     { urgency: 'Normal',  color: '#52525B', days: 3,  action: 'Qualify buyer — ask purpose and budget' },
  project_disclosure: { urgency: 'High',    color: '#BA7517', days: 3,  action: 'Re-engage with curiosity hook. Check leakage risk.' },
  qualification:      { urgency: 'URGENT',  color: '#A32D2D', days: 1,  action: 'Send personalised shortlist within 24 hours — highest conversion window' },
  comparison:         { urgency: 'High',    color: '#BA7517', days: 2,  action: 'Ask which project felt stronger — move to visit trigger' },
  visit_trigger:      { urgency: 'High',    color: '#BA7517', days: 3,  action: 'Follow up on personalised analysis — check interest' },
  pre_visit:          { urgency: 'URGENT',  color: '#A32D2D', days: 0,  action: 'Pre-visit briefing same day. Reminder T-6h and T-1h before visit.' },
  post_visit:         { urgency: 'URGENT',  color: '#A32D2D', days: 2,  action: 'Post-visit decode. Capture emotion. Create next step.' },
  decision:           { urgency: 'High',    color: '#BA7517', days: 2,  action: 'Support decision. Watch for leakage.' },
}

export default async function FollowUpPage() {
  let sessions: any[] = []
  try {
    sessions = await prisma.chatSession.findMany({
      orderBy: { lastMessageAt: 'asc' },
      take: 50,
      include: { _count: { select: { messages: true } } }
    })
  } catch (err) {
    console.error('Follow-up fetch error:', err)
  }

  if (sessions.length === 0) {
    console.error('Follow-up: no sessions returned from DB')
  }

  const now = new Date()

  // Categorize sessions
  const urgent = sessions.filter(s => {
    const days = daysBetween(s.lastMessageAt)
    const rule = STAGE_RULES[s.buyerStage]
    return rule?.urgency === 'URGENT' || days >= 4
  })

  const high = sessions.filter(s => {
    const days = daysBetween(s.lastMessageAt)
    const rule = STAGE_RULES[s.buyerStage]
    return rule?.urgency === 'High' && days >= 2 && days < 4
  })

  const overdue = sessions.filter(s => {
    const days = daysBetween(s.lastMessageAt)
    return days >= 5
  })

  const reEngage = sessions.filter(s => {
    const days = daysBetween(s.lastMessageAt)
    return days >= 28
  })

  const postVisitSessions = sessions.filter(s => s.buyerStage === 'post_visit')
  const qualifiedSessions = sessions.filter(s => s.buyerStage === 'qualification')

  return (
    <div style={{ background: '#0A0F1E', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[18px] font-bold text-white">Follow-Up Dashboard</h1>
          <p className="text-[12px] mt-0.5" style={{ color: '#6B7280' }}>
            {now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-lg text-[11px] font-medium" style={{ background: 'rgba(96,165,250,0.1)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.2)' }}>
          AI drafts · You approve · You send
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <DarkMetricCard label="Urgent Today" value={urgent.length} sub={`${postVisitSessions.length} post-visit`} color="#F87171" />
        <DarkMetricCard label="High Priority" value={high.length} sub="Follow-up due" color="#FBBF24" />
        <DarkMetricCard label="Overdue" value={overdue.length} sub="Past deadline" color="#FB923C" />
        <DarkMetricCard label="Re-engage" value={reEngage.length} sub="28+ days cold" color="#9CA3AF" />
      </div>

      {/* Alert banners */}
      <div className="flex gap-3 mb-5 flex-wrap">
        {postVisitSessions.length > 0 && (
          <div className="flex-1 rounded-xl px-4 py-3" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <p className="text-[12px] font-semibold" style={{ color: '#F87171' }}>🚨 {postVisitSessions.length} post-visit silence</p>
            <p className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>Post-visit decode needed. Capture emotion before buyer goes cold.</p>
          </div>
        )}
        {qualifiedSessions.length > 0 && (
          <div className="flex-1 rounded-xl px-4 py-3" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
            <p className="text-[12px] font-semibold" style={{ color: '#FBBF24' }}>⚡ {qualifiedSessions.length} qualified buyers</p>
            <p className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>Send shortlist within 24h — highest conversion window.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Queue */}
        <div className="lg:col-span-2 space-y-4">
          {urgent.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#F87171' }}>🔴 Urgent — contact today ({urgent.length})</p>
              <div className="space-y-2">
                {urgent.map(session => (
                  <a key={session.id} href={`/admin/buyers/${session.id}`} className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors hover:bg-white/5" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)' }}>
                    <div>
                      <p className="text-[12px] font-medium text-white">{session.buyerConfig ? `${session.buyerConfig} · ${getPersonaLabel(session.buyerPersona)}` : session.buyerBudget ? `₹${Math.round(session.buyerBudget/100000)}L buyer` : `Session ${session.id.slice(0,6)}`}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>{getStageLabel(session.buyerStage)} · {daysBetween(session.lastMessageAt)}d silent</p>
                      <p className="text-[10px] mt-1" style={{ color: '#F87171' }}>{STAGE_RULES[session.buyerStage]?.action}</p>
                        <DraftMessageButton sessionId={session.id} />
                    </div>
                    <DarkBadge label="Urgent" color="red" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {high.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#FBBF24' }}>🟡 High Priority ({high.length})</p>
              <div className="space-y-2">
                {high.map(session => (
                  <a key={session.id} href={`/admin/buyers/${session.id}`} className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors hover:bg-white/5" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.12)' }}>
                    <div>
                      <p className="text-[12px] font-medium text-white">{session.buyerConfig ? `${session.buyerConfig} · ${getPersonaLabel(session.buyerPersona)}` : session.buyerBudget ? `₹${Math.round(session.buyerBudget/100000)}L buyer` : `Session ${session.id.slice(0,6)}`}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>{getStageLabel(session.buyerStage)} · {daysBetween(session.lastMessageAt)}d silent</p>
                      <p className="text-[10px] mt-1" style={{ color: '#FBBF24' }}>{STAGE_RULES[session.buyerStage]?.action}</p>
                        <DraftMessageButton sessionId={session.id} />
                    </div>
                    <DarkBadge label="High" color="amber" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {overdue.filter(s => !urgent.includes(s) && !high.includes(s)).length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#FB923C' }}>Overdue — past deadline ({overdue.filter(s => !urgent.includes(s) && !high.includes(s)).length})</p>
              <div className="space-y-2">
                {overdue.filter(s => !urgent.includes(s) && !high.includes(s)).map(session => (
                  <a key={session.id} href={`/admin/buyers/${session.id}`} className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-white/5 transition-colors" style={{ background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.15)' }}>
                    <div>
                      <p className="text-[12px] font-medium text-white">{session.buyerConfig ? `${session.buyerConfig} · ${getPersonaLabel(session.buyerPersona)}` : session.buyerBudget ? `₹${Math.round(session.buyerBudget/100000)}L buyer` : `Session ${session.id.slice(0,6)}`}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>{getStageLabel(session.buyerStage)} · {daysBetween(session.lastMessageAt)}d overdue</p>
                    </div>
                    <DarkBadge label="Overdue" color="amber" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {reEngage.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#9CA3AF' }}>Re-engage — cold buyers ({reEngage.length})</p>
              <div className="space-y-2">
                {reEngage.map(session => (
                  <a key={session.id} href={`/admin/buyers/${session.id}`} className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-white/5 transition-colors" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <p className="text-[12px] font-medium text-white">{session.buyerConfig ? `${session.buyerConfig} · ${getPersonaLabel(session.buyerPersona)}` : session.buyerBudget ? `₹${Math.round(session.buyerBudget/100000)}L buyer` : `Session ${session.id.slice(0,6)}`} · {session.buyerBudget ? `₹${formatLakh(session.buyerBudget)}` : '—'}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: '#6B7280' }}>{daysBetween(session.lastMessageAt)}d cold · {getStageLabel(session.buyerStage)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <DarkBadge label={`${daysBetween(session.lastMessageAt)}d`} color="gray" />
                      <DraftMessageButton sessionId={session.id} />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {sessions.length === 0 && (
            <div className="rounded-2xl p-8 text-center" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[13px]" style={{ color: '#6B7280' }}>No buyers in follow-up queue.</p>
            </div>
          )}
        </div>

        {/* Rules engine */}
        <div>
          <DarkCard title="Follow-Up Rules">
            <div className="space-y-3">
              {Object.entries(STAGE_RULES).map(([stage, rule]) => (
                <div key={stage} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 10 }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] font-medium text-white">{getStageLabel(stage)}</p>
                    <span className="text-[10px] font-semibold" style={{ color: rule.color === '#A32D2D' ? '#F87171' : rule.color === '#BA7517' ? '#FBBF24' : '#9CA3AF' }}>
                      {rule.urgency} · {rule.days === 0 ? 'Same day' : `${rule.days}d`}
                    </span>
                  </div>
                  <p className="text-[10px] leading-relaxed" style={{ color: '#6B7280' }}>{rule.action}</p>
                </div>
              ))}
            </div>
          </DarkCard>
        </div>
      </div>
    </div>
  )
}
