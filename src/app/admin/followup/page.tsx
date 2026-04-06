import { prisma } from '@/lib/prisma'
import { daysBetween, formatLakh, getPersonaLabel, getStageLabel } from '@/lib/admin-utils'
import FollowUpCard from '@/components/admin/FollowUpCard'
import Link from 'next/link'

function MetricCard({ label, value, sub, color, subColor }: { label: string; value: string | number; sub?: string; color?: string; subColor?: string }) {
  return (
    <div className="bg-white rounded-[10px] p-[12px_14px]" style={{ border: '0.5px solid #E0DFDD' }}>
      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#787878' }}>{label}</p>
      <p className="font-extrabold leading-[1.1] mb-1" style={{ fontSize: 26, color: color ?? '#1B3A6B' }}>{value}</p>
      {sub && <p className="text-[9px]" style={{ color: subColor ?? '#B0B0AC' }}>{sub}</p>}
    </div>
  )
}

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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[14px] font-medium text-[#1A1A2E]">Follow-Up / Daily Dashboard</h1>
          <p className="text-[12px] text-[#52525B]">
            Today: {now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button type="button" className="text-[11px] text-[#185FA5] border border-[#185FA5]/30 px-3 py-1.5 rounded-lg hover:bg-[#EEF5FD] transition-colors">
          Refresh dashboard
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <MetricCard label="Urgent today" value={urgent.length} sub={`${postVisitSessions.length} post-visit silence`} color="#A32D2D" />
        <MetricCard label="High priority" value={high.length} sub="Follow-up due" color="#BA7517" />
        <MetricCard label="Overdue" value={overdue.length} sub="Should have been done" color="#BA7517" />
        <MetricCard label="Re-engage" value={reEngage.length} sub="30+ days cold" color="#52525B" />
      </div>

      {/* Info banner */}
      <div className="bg-[#EEF5FD] border border-[#B5D4F4] rounded-xl px-4 py-3 mb-5 text-[12px] text-[#0C447C]">
        AI drafts message based on stage + intent data. You approve. WhatsApp opens. You send. <strong>Human touch always.</strong>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Main follow-up queue */}
        <div className="col-span-2 space-y-3">

          {/* Urgent section */}
          {urgent.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold text-[#A32D2D] uppercase tracking-wider mb-2">
                Urgent — contact today ({urgent.length})
              </p>
              {urgent.map(session => (
                <FollowUpCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-[13px] text-[#52525B]">No urgent follow-ups right now.</p>
              <p className="text-[11px] text-[#A8A29E] mt-1">Check back after buyers have more conversations.</p>
            </div>
          )}

          {/* High priority */}
          {high.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-[#BA7517] uppercase tracking-wider mb-2 mt-4">
                High priority ({high.length})
              </p>
              {high.map(session => (
                <FollowUpCard key={session.id} session={session} />
              ))}
            </div>
          )}

          {/* Overdue */}
          {overdue.filter(s => !urgent.includes(s) && !high.includes(s)).length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-wider mb-2 mt-4">
                Overdue — should have been done already
              </p>
              {overdue.filter(s => !urgent.includes(s) && !high.includes(s)).map(session => (
                <FollowUpCard key={session.id} session={session} />
              ))}
            </div>
          )}

          {/* Re-engage */}
          {reEngage.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-wider mb-2 mt-4">
                Re-engage — cold buyers ({reEngage.length})
              </p>
              {reEngage.map(session => (
                <div key={session.id} className="bg-white border border-black/[0.08] rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#F4F4F5] flex items-center justify-center text-[11px] font-medium text-[#52525B]">
                      {getPersonaLabel(session.buyerPersona).charAt(0)}
                    </div>
                    <div>
                      <p className="text-[12px] font-medium text-[#1A1A2E]">
                        {getPersonaLabel(session.buyerPersona)} · {session.buyerConfig ?? '—'} · {session.buyerBudget ? `₹${formatLakh(session.buyerBudget)}` : '—'}
                      </p>
                      <p className="text-[11px] text-[#52525B]">
                        {daysBetween(session.lastMessageAt)} days cold · {getStageLabel(session.buyerStage)}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-[#F4F4F5] text-[#52525B] px-2 py-1 rounded-full">Re-engage {daysBetween(session.lastMessageAt)}d</span>
                </div>
              ))}
            </div>
          )}

          {sessions.length === 0 && (
            <div className="bg-white border border-black/[0.08] rounded-xl p-8 text-center">
              <p className="text-[12px] text-[#52525B]">No buyers in follow-up queue.</p>
              <p className="text-[11px] text-[#71717A] mt-1">Buyers will appear here once they start chatting.</p>
            </div>
          )}
        </div>

        {/* Right: Rules engine */}
        <div className="space-y-3">
          <div className="bg-white border border-black/[0.08] rounded-xl p-4">
            <p className="text-[12px] font-medium text-[#1A1A2E] mb-3">Follow-Up Rules Engine</p>
            <p className="text-[11px] text-[#52525B] mb-3">Stage-wise rules. Dashboard auto-applies these every morning.</p>
            <div className="space-y-3">
              {Object.entries(STAGE_RULES).map(([stage, rule]) => (
                <div key={stage} className="border-b border-[#F4F4F5] last:border-0 pb-2.5 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] font-medium text-[#1A1A2E]">{getStageLabel(stage)}</p>
                    <span className="text-[10px] font-semibold" style={{ color: rule.color }}>
                      {rule.urgency} · {rule.days === 0 ? 'Same day' : `${rule.days}d`}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#52525B] leading-relaxed">{rule.action}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Qualified buyers alert */}
          {qualifiedSessions.length > 0 && (
            <div className="bg-[#FFF7ED] border border-[#BA7517]/30 rounded-xl p-3">
              <p className="text-[11px] font-semibold text-[#BA7517] mb-1">⚡ {qualifiedSessions.length} qualified buyer{qualifiedSessions.length > 1 ? 's' : ''}</p>
              <p className="text-[11px] text-[#633806]">Send personalised shortlist within 24 hours — highest conversion window.</p>
            </div>
          )}

          {/* Post-visit alert */}
          {postVisitSessions.length > 0 && (
            <div className="bg-[#FCEBEB] border border-[#A32D2D]/30 rounded-xl p-3">
              <p className="text-[11px] font-semibold text-[#A32D2D] mb-1">🚨 {postVisitSessions.length} post-visit silence</p>
              <p className="text-[11px] text-[#791F1F]">Post-visit decode needed. Capture emotion before buyer goes cold.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
