import { prisma } from '@/lib/prisma'
import { daysBetween, formatLakh, getPersonaLabel, getStageLabel, getSessionQualityScore, getQualityColor } from '@/lib/admin-utils'
import Link from 'next/link'

const STAGES = [
  { key: 'intent_capture',     label: 'A · Intent',        color: '#52525B' },
  { key: 'project_disclosure', label: 'B · Exploring',     color: '#185FA5' },
  { key: 'qualification',      label: 'C · Qualified',     color: '#BA7517' },
  { key: 'comparison',         label: 'E · Comparing',     color: '#BA7517' },
  { key: 'visit_trigger',      label: 'F · Visit Trigger', color: '#0F6E56' },
  { key: 'pre_visit',          label: 'G · Registered',    color: '#0F6E56' },
  { key: 'post_visit',         label: 'H · Post Visit',    color: '#A32D2D' },
  { key: 'decision',           label: 'Booked',            color: '#085041' },
]

function urgencyColor(days: number) {
  if (days >= 4) return '#F87171'
  if (days >= 2) return '#FBBF24'
  return '#9CA3AF'
}

function urgencyLabel(days: number, stage: string) {
  if (stage === 'post_visit' && days >= 2) return 'Urgent'
  if (stage === 'qualification' && days >= 1) return 'Urgent'
  if (days >= 4) return 'Overdue'
  if (days >= 2) return 'High'
  return null
}

function getLeakageScore(session: any): number {
  let score = 0
  const days = Math.floor((Date.now() - new Date(session.lastMessageAt).getTime()) / 86400000)
  // Days silent signals
  if (days > 3) score += 10
  if (days > 7) score += 15
  if (days > 14) score += 15
  if (days > 21) score += 10
  // Stage signals — hot stages + silence = high bypass risk
  if (['visit_trigger', 'pre_visit'].includes(session.buyerStage)) score += 20
  if (session.buyerStage === 'post_visit') score += 25
  if (session.buyerStage === 'comparison') score += 10
  // Qualification signals
  if (session.qualificationDone && days > 2) score += 15
  // Projects disclosed but gone silent
  if ((session.projectsDisclosed?.length ?? 0) > 0 && days > 5) score += 10
  // Budget known = serious buyer, silence = risk
  if (session.buyerBudget && days > 4) score += 10
  return Math.min(score, 100)
}

function LeakageBadge({ score }: { score: number }) {
  if (score >= 61) return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-[#A32D2D]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#A32D2D] flex-shrink-0" />High risk
    </span>
  )
  if (score >= 31) return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-[#BA7517]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#BA7517] flex-shrink-0" />Watch
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-[#0F6E56]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56] flex-shrink-0" />Low
    </span>
  )
}

function StageBadge({ stage }: { stage: string }) {
  const s = STAGES.find(s => s.key === stage)
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
      style={{ color: s?.color ?? '#52525B', backgroundColor: (s?.color ?? '#52525B') + '18' }}
    >
      {getStageLabel(stage)}
    </span>
  )
}

export default async function BuyersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; session?: string; limit?: string }>
}) {
  const { tab, session: selectedSessionId, limit: limitParam } = await searchParams
  const activeTab = tab === 'chat-logs' ? 'chat-logs' : 'buyers'
  const buyerLimit = Math.min(Number(limitParam) || 50, 500)

  // --- Buyers tab data ---
  let sessions: any[] = []
  try {
    sessions = await prisma.chatSession.findMany({
      orderBy: { lastMessageAt: 'desc' },
      take: buyerLimit + 1,
      include: { _count: { select: { messages: true } } },
    })
  } catch (err) { console.error('Buyers fetch error:', err) }
  const hasMoreBuyers = sessions.length > buyerLimit
  if (hasMoreBuyers) sessions = sessions.slice(0, buyerLimit)

  // --- Chat Logs tab data ---
  let chatSessions: any[] = []
  let selectedSession: any = null
  if (activeTab === 'chat-logs') {
    try {
      chatSessions = await prisma.chatSession.findMany({
        orderBy: { lastMessageAt: 'desc' },
        take: 80,
        include: {
          _count: { select: { messages: true } },
          messages: { orderBy: { createdAt: 'asc' }, take: 1, select: { content: true, role: true } },
        },
      })
    } catch (err) { console.error('Chat logs fetch error:', err) }

    if (selectedSessionId) {
      try {
        selectedSession = await prisma.chatSession.findUnique({
          where: { id: selectedSessionId },
          include: {
            messages: { orderBy: { createdAt: 'asc' } },
          },
        })
      } catch (err) { console.error('Session fetch error:', err) }
    }
  }

  const byStage = STAGES.reduce((acc, s) => {
    acc[s.key] = sessions.filter(session => session.buyerStage === s.key)
    return acc
  }, {} as Record<string, any[]>)

  const totalActive = sessions.filter(s => s.buyerStage !== 'decision').length

  return (
    <div style={{ background: '#0A0F1E', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[18px] font-bold text-white">Buyers / CRM</h1>
          <p className="text-[12px] mt-0.5" style={{ color: '#6B7280' }}>{totalActive} active · intent tracking · journey stage</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Link href="/admin/buyers" className={`px-4 py-2 text-[12px] font-medium border-b-2 -mb-px transition-colors ${activeTab === 'buyers' ? 'border-[#60A5FA] text-[#60A5FA]' : 'border-transparent text-[#6B7280] hover:text-white'}`}>
          Buyers
        </Link>
        <Link href="/admin/buyers?tab=chat-logs" className={`px-4 py-2 text-[12px] font-medium border-b-2 -mb-px transition-colors ${activeTab === 'chat-logs' ? 'border-[#60A5FA] text-[#60A5FA]' : 'border-transparent text-[#6B7280] hover:text-white'}`}>
          Sessions
        </Link>
      </div>

      {/* BUYERS TAB */}
      {activeTab === 'buyers' && (
        <>
          {/* Kanban */}
          <div className="overflow-x-auto pb-4 mb-4">
            <div className="grid grid-cols-2 lg:flex lg:flex-row gap-3">
              {STAGES.map(stage => {
                const stageSessions = byStage[stage.key] ?? []
                const hotStage = ['comparison','visit_trigger','pre_visit','post_visit'].includes(stage.key)
                return (
                  <div key={stage.key} className="w-full lg:w-[180px] lg:flex-shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-semibold" style={{ color: hotStage ? '#FBBF24' : '#9CA3AF' }}>{stage.label}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: '#9CA3AF' }}>{stageSessions.length}</span>
                    </div>
                    <div className="space-y-2">
                      {stageSessions.slice(0, 5).map(session => {
                        const days = daysBetween(session.lastMessageAt)
                        const urgency = urgencyLabel(days, session.buyerStage)
                        const risk = getLeakageScore(session)
                        return (
                          <Link key={session.id} href={`/admin/buyers/${session.id}`}>
                            <div className="rounded-xl p-2.5 transition-all hover:scale-[1.02]" style={{ background: hotStage ? 'rgba(251,191,36,0.06)' : '#111827', border: `1px solid ${hotStage ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.07)'}` }}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ background: 'rgba(96,165,250,0.15)', color: '#60A5FA' }}>
                                  {getPersonaLabel(session.buyerPersona).charAt(0)}
                                </div>
                                {urgency && (
                                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: urgencyColor(days) === '#F87171' ? '#F87171' : '#FBBF24', background: urgencyColor(days) === '#F87171' ? 'rgba(248,113,113,0.15)' : 'rgba(251,191,36,0.15)' }}>{urgency}</span>
                                )}
                              </div>
                              <p className="text-[11px] font-medium text-white truncate">{getPersonaLabel(session.buyerPersona)} · {session.buyerConfig ?? '—'}</p>
                              <p className="text-[10px] mt-0.5" style={{ color: '#6B7280' }}>{session.buyerBudget ? `₹${formatLakh(session.buyerBudget)}` : 'Budget ?'} · {days}d ago</p>
                              <div className="mt-1 flex items-center gap-1.5">
                                <LeakageBadge score={risk} />
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: getQualityColor(getSessionQualityScore(session)) + '22', color: getQualityColor(getSessionQualityScore(session)) }}>
                                  Q{getSessionQualityScore(session)}
                                </span>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                      {stageSessions.length === 0 && (
                        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                          <p className="text-[10px]" style={{ color: '#374151' }}>Empty</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* List view */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[13px] font-semibold text-white">All buyers — list view</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr>
                    {['Buyer','Purpose','Budget','Config','Stage','Days','Last contact','Urgency','Leakage'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#4B5563', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(session => {
                    const days = daysBetween(session.lastMessageAt)
                    const urgency = urgencyLabel(days, session.buyerStage)
                    const risk = getLeakageScore(session)
                    return (
                      <tr key={session.id} className="hover:bg-white/5 transition-colors cursor-pointer" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="py-2.5 px-3">
                          <Link href={`/admin/buyers/${session.id}`} className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0" style={{ background: 'rgba(96,165,250,0.15)', color: '#60A5FA' }}>
                              {getPersonaLabel(session.buyerPersona).charAt(0)}
                            </div>
                            <span className="font-medium text-white hover:text-[#60A5FA] whitespace-nowrap transition-colors">
                              {session.customName || (session.buyerBudget ? `₹${Math.round(session.buyerBudget/100000)}L · ${session.buyerConfig ?? ''}` : session.id.slice(0, 8))}…
                            </span>
                          </Link>
                        </td>
                        <td className="py-2.5 px-3" style={{ color: '#9CA3AF' }}>{getPersonaLabel(session.buyerPersona)}</td>
                        <td className="py-2.5 px-3 font-mono" style={{ color: '#D1D5DB' }}>{session.buyerBudget ? `₹${formatLakh(session.buyerBudget)}` : '—'}</td>
                        <td className="py-2.5 px-3" style={{ color: '#9CA3AF' }}>{session.buyerConfig ?? '—'}</td>
                        <td className="py-2.5 px-3"><StageBadge stage={session.buyerStage} /></td>
                        <td className="py-2.5 px-3" style={{ color: '#6B7280' }}>{days}d</td>
                        <td className="py-2.5 px-3" style={{ color: '#6B7280' }}>{days === 0 ? 'Today' : `${days}d ago`}</td>
                        <td className="py-2.5 px-3">
                          {urgency ? <span className="text-[10px] font-semibold" style={{ color: urgencyColor(days) === '#F87171' ? '#F87171' : '#FBBF24' }}>{urgency}</span> : <span className="text-[10px]" style={{ color: '#4B5563' }}>Normal</span>}
                        </td>
                        <td className="py-2.5 px-3"><LeakageBadge score={risk} /></td>
                      </tr>
                    )
                  })}
                  {sessions.length === 0 && (
                    <tr><td colSpan={9} className="py-6 text-center text-[12px]" style={{ color: '#4B5563' }}>No buyers yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {hasMoreBuyers && (
              <div className="px-4 py-3 flex justify-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <Link
                  href={`/admin/buyers?limit=${buyerLimit + 50}`}
                  className="text-[11px] font-medium px-4 py-1.5 rounded-lg transition-colors"
                  style={{ color: '#60A5FA', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}
                >
                  Load more ({buyerLimit} shown)
                </Link>
              </div>
            )}
          </div>
        </>
      )}

      {/* CHAT LOGS TAB */}
      {activeTab === 'chat-logs' && (
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-2 rounded-xl overflow-hidden" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[12px] font-medium text-white">{chatSessions.length} conversations</p>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: '72vh' }}>
              {chatSessions.length === 0 && <p className="text-[12px] p-4" style={{ color: '#4B5563' }}>Click any session to view full conversation</p>}
              {chatSessions.map(s => {
                const firstMsg = s.messages?.[0]
                const isSelected = s.id === selectedSessionId
                return (
                  <Link key={s.id} href={`/admin/buyers?tab=chat-logs&session=${s.id}`}
                    className="block px-4 py-3 transition-colors hover:bg-white/5"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: isSelected ? 'rgba(96,165,250,0.08)' : '' }}>
                    <div className="flex items-center justify-between mb-1">
                      <StageBadge stage={s.buyerStage} />
                      <span className="text-[10px]" style={{ color: '#4B5563' }}>{s._count.messages} msgs</span>
                    </div>
                    <p className="text-[11px] text-white truncate mb-0.5">
                      {s.customName || (s.buyerBudget ? `₹${Math.round(s.buyerBudget/100000)}L · ${s.buyerConfig ?? 'buyer'}` : firstMsg ? firstMsg.content.slice(0, 50) + '…' : 'New session')}
                    </p>
                    <p className="text-[10px]" style={{ color: '#4B5563' }}>
                      {new Date(s.lastMessageAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="col-span-3 rounded-xl overflow-hidden flex flex-col" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
            {!selectedSession ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-[13px]" style={{ color: '#4B5563' }}>Select a conversation to view messages</p>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <p className="text-[12px] font-medium text-white">{getPersonaLabel(selectedSession.buyerPersona)} · {selectedSession.buyerConfig ?? '—'}</p>
                    <p className="text-[10px]" style={{ color: '#6B7280' }}>
                      {selectedSession.messages.length} messages · {getStageLabel(selectedSession.buyerStage)}
                      {selectedSession.buyerBudget ? ` · ₹${formatLakh(selectedSession.buyerBudget)}` : ''}
                    </p>
                  </div>
                  <Link href={`/admin/buyers/${selectedSession.id}`} className="text-[11px] hover:underline" style={{ color: '#60A5FA' }}>Full profile →</Link>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ maxHeight: '68vh' }}>
                  {selectedSession.messages.map((msg: any) => {
                    const isUser = msg.role === 'user'
                    return (
                      <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-[75%] px-3 py-2 rounded-xl text-[12px] leading-relaxed" style={{
                          background: isUser ? '#1B4F8A' : 'rgba(255,255,255,0.06)',
                          color: isUser ? 'white' : '#D1D5DB',
                          borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px'
                        }}>
                          <p>{msg.content.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
                          <p className="text-[9px] mt-1" style={{ color: isUser ? 'rgba(255,255,255,0.5)' : '#4B5563', textAlign: isUser ? 'right' : 'left' }}>
                            {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  {selectedSession.messages.length === 0 && (
                    <p className="text-[12px] text-center py-8" style={{ color: '#4B5563' }}>No messages in this session.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
