import { prisma } from '@/lib/prisma'
import { daysBetween, formatLakh, getPersonaLabel, getStageLabel } from '@/lib/admin-utils'
import Link from 'next/link'

const STAGES = [
  { key: 'intent_capture',     label: 'A · Intent',       color: '#52525B' },
  { key: 'project_disclosure', label: 'B · Exploring',    color: '#185FA5' },
  { key: 'qualification',      label: 'C · Qualified',    color: '#BA7517' },
  { key: 'comparison',         label: 'E · Comparing',    color: '#BA7517' },
  { key: 'visit_trigger',      label: 'F · Visit Trigger',color: '#0F6E56' },
  { key: 'pre_visit',          label: 'G · Registered',   color: '#0F6E56' },
  { key: 'post_visit',         label: 'H · Post Visit',   color: '#A32D2D' },
  { key: 'decision',           label: 'Booked',           color: '#085041' },
]

function urgencyColor(days: number) {
  if (days >= 4) return '#A32D2D'
  if (days >= 2) return '#BA7517'
  return '#52525B'
}

function urgencyLabel(days: number, stage: string) {
  if (stage === 'post_visit' && days >= 2) return 'Urgent'
  if (stage === 'qualification' && days >= 1) return 'Urgent'
  if (days >= 4) return 'Overdue'
  if (days >= 2) return 'High'
  return null
}

// Leakage risk score (0-100)
function leakageRisk(session: any): number {
  let score = 0
  const days = daysBetween(session.lastMessageAt)
  if (session.buyerStage === 'post_visit' && days >= 2) score += 40
  if (days >= 5) score += 30
  if (session.buyerStage === 'post_visit') score += 20
  if (days >= 3) score += 10
  return Math.min(score, 100)
}

export default async function BuyersPage() {
  let sessions: any[] = []
  try {
    sessions = await prisma.chatSession.findMany({
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
      include: { _count: { select: { messages: true } } }
    })
  } catch (err) { console.error('Buyers fetch error:', err) }

  // Group by stage
  const byStage = STAGES.reduce((acc, s) => {
    acc[s.key] = sessions.filter(session => session.buyerStage === s.key)
    return acc
  }, {} as Record<string, any[]>)

  const totalActive = sessions.filter(s => s.buyerStage !== 'decision').length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[14px] font-medium text-[#1A1A2E]">Buyers / CRM</h1>
          <p className="text-[12px] text-[#52525B]">{totalActive} active buyers · intent tracking · journey stage</p>
        </div>
      </div>

      {/* Pipeline kanban */}
      <div className="overflow-x-auto pb-4 mb-4">
        <div className="flex gap-3" style={{ minWidth: `${STAGES.length * 200}px` }}>
          {STAGES.map(stage => {
            const stageSessions = byStage[stage.key] ?? []
            return (
              <div key={stage.key} className="w-[190px] flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold" style={{ color: stage.color }}>{stage.label}</p>
                  <span className="text-[10px] bg-[#F4F4F5] text-[#52525B] px-1.5 py-0.5 rounded-full">
                    {stageSessions.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {stageSessions.slice(0, 5).map(session => {
                    const days = daysBetween(session.lastMessageAt)
                    const urgency = urgencyLabel(days, session.buyerStage)
                    const risk = leakageRisk(session)
                    return (
                      <Link key={session.id} href={`/admin/buyers/${session.id}`}>
                        <div className="bg-white border border-black/[0.08] rounded-lg p-2.5 hover:border-[#185FA5]/30 cursor-pointer transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <div className="w-6 h-6 rounded-full bg-[#E6F1FB] flex items-center justify-center text-[10px] font-semibold text-[#0C447C]">
                              {getPersonaLabel(session.buyerPersona).charAt(0)}
                            </div>
                            {urgency && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                                style={{ color: urgencyColor(days), backgroundColor: urgencyColor(days) + '15' }}>
                                {urgency}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-medium text-[#1A1A2E] truncate">
                            {getPersonaLabel(session.buyerPersona)} · {session.buyerConfig ?? '—'}
                          </p>
                          <p className="text-[10px] text-[#52525B]">
                            {session.buyerBudget ? `₹${formatLakh(session.buyerBudget)}` : 'Budget ?'} · {days}d ago
                          </p>
                          {risk >= 40 && (
                            <p className="text-[9px] text-[#A32D2D] mt-1">⚠ Leakage risk {risk}</p>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                  {stageSessions.length === 0 && (
                    <div className="bg-[#F8FAFC] border border-dashed border-[#E4E4E7] rounded-lg p-3 text-center">
                      <p className="text-[10px] text-[#71717A]">Empty</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* List view table */}
      <div className="bg-white border border-black/[0.08] rounded-xl p-4">
        <p className="text-[12px] font-medium text-[#1A1A2E] mb-3">All buyers — list view</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[#F4F4F5]">
                {['Buyer', 'Purpose', 'Budget', 'Config', 'Area', 'Stage', 'Days in stage', 'Last contact', 'Urgency', 'Leakage risk'].map(h => (
                  <th key={h} className="text-left text-[10px] text-[#52525B] font-medium py-2 pr-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map(session => {
                const days = daysBetween(session.lastMessageAt)
                const urgency = urgencyLabel(days, session.buyerStage)
                const risk = leakageRisk(session)
                return (
<tr key={session.id} className="border-b border-[#F4F4F5] last:border-0 hover:bg-[#F8FAFC] cursor-pointer">
                    
                    <td className="py-2.5 pr-3">
                      <Link href={`/admin/buyers/${session.id}`}>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#E6F1FB] flex items-center justify-center text-[10px] font-semibold text-[#0C447C] flex-shrink-0">
                            {getPersonaLabel(session.buyerPersona).charAt(0)}
                          </div>
                          <span className="font-medium text-[#1A1A2E] hover:text-[#185FA5] whitespace-nowrap">
                            {session.id.slice(0, 8)}…
                          </span>
                        </div>
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 text-[#52525B]">{getPersonaLabel(session.buyerPersona)}</td>
                    <td className="py-2.5 pr-3 font-mono text-[#1A1A2E]">
                      {session.buyerBudget ? `₹${formatLakh(session.buyerBudget)}` : '—'}
                    </td>
                    <td className="py-2.5 pr-3 text-[#52525B]">{session.buyerConfig ?? '—'}</td>
                    <td className="py-2.5 pr-3 text-[#52525B]">—</td>
                    <td className="py-2.5 pr-3">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F0F4F8] text-[#52525B]">
                        {getStageLabel(session.buyerStage)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-[#52525B]">{days}d</td>
                    <td className="py-2.5 pr-3 text-[#52525B]">{days === 0 ? 'Today' : `${days}d ago`}</td>
                    <td className="py-2.5 pr-3">
                      {urgency ? (
                        <span className="text-[10px] font-semibold" style={{ color: urgencyColor(days) }}>{urgency}</span>
                      ) : <span className="text-[10px] text-[#52525B]">Normal</span>}
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 bg-[#E4E4E7] rounded-full">
                          <div className="h-full rounded-full"
                            style={{ width: `${risk}%`, backgroundColor: risk >= 60 ? '#A32D2D' : risk >= 30 ? '#BA7517' : '#0F6E56' }} />
                        </div>
                        <span className="text-[10px] font-mono" style={{ color: risk >= 60 ? '#A32D2D' : '#52525B' }}>{risk}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-[12px] text-[#52525B]">
                    No buyers yet. They appear here when they start chatting.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
