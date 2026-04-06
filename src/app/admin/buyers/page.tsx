import { prisma } from '@/lib/prisma'
import { daysBetween, formatLakh, getPersonaLabel, getStageLabel } from '@/lib/admin-utils'
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

function getLeakageScore(session: any): number {
  let score = 0
  const days = Math.floor((Date.now() - new Date(session.lastMessageAt).getTime()) / 86400000)
  if (days > 7) score += 20
  if (days > 14) score += 10
  if (['visit_trigger', 'pre_visit', 'post_visit'].includes(session.buyerStage)) score += 25
  if (session.qualificationDone && days > 3) score += 15
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
  searchParams: Promise<{ tab?: string; session?: string }>
}) {
  const { tab, session: selectedSessionId } = await searchParams
  const activeTab = tab === 'chat-logs' ? 'chat-logs' : 'buyers'

  // --- Buyers tab data ---
  let sessions: any[] = []
  try {
    sessions = await prisma.chatSession.findMany({
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
      include: { _count: { select: { messages: true } } },
    })
  } catch (err) { console.error('Buyers fetch error:', err) }

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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[14px] font-medium text-[#1A1A2E]">Buyers / CRM</h1>
          <p className="text-[12px] text-[#52525B]">{totalActive} active buyers · intent tracking · journey stage</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-4 border-b border-[#E4E4E7]">
        <Link
          href="/admin/buyers"
          className={`px-4 py-2 text-[12px] font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'buyers'
              ? 'border-[#185FA5] text-[#185FA5]'
              : 'border-transparent text-[#52525B] hover:text-[#1A1A2E]'
          }`}
        >
          Buyers
        </Link>
        <Link
          href="/admin/buyers?tab=chat-logs"
          className={`px-4 py-2 text-[12px] font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'chat-logs'
              ? 'border-[#185FA5] text-[#185FA5]'
              : 'border-transparent text-[#52525B] hover:text-[#1A1A2E]'
          }`}
        >
          Chat Logs
        </Link>
      </div>

      {/* ── BUYERS TAB ── */}
      {activeTab === 'buyers' && (
        <>
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
                        const risk = getLeakageScore(session)
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
                              <div className="mt-1"><LeakageBadge score={risk} /></div>
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
                    const risk = getLeakageScore(session)
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
                          <LeakageBadge score={risk} />
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
        </>
      )}

      {/* ── CHAT LOGS TAB ── */}
      {activeTab === 'chat-logs' && (
        <div className="grid grid-cols-5 gap-3">
          {/* Session list */}
          <div className="col-span-2 bg-white border border-black/[0.08] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#F4F4F5]">
              <p className="text-[12px] font-medium text-[#1A1A2E]">{chatSessions.length} conversations</p>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: '72vh' }}>
              {chatSessions.length === 0 && (
                <p className="text-[12px] text-[#52525B] p-4">No conversations yet.</p>
              )}
              {chatSessions.map(s => {
                const firstMsg = s.messages?.[0]
                const isSelected = s.id === selectedSessionId
                return (
                  <Link
                    key={s.id}
                    href={`/admin/buyers?tab=chat-logs&session=${s.id}`}
                    className={`block px-4 py-3 border-b border-[#F4F4F5] last:border-0 hover:bg-[#F8FAFC] transition-colors ${isSelected ? 'bg-[#EBF3FD]' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <StageBadge stage={s.buyerStage} />
                      <span className="text-[10px] text-[#71717A]">{s._count.messages} msgs</span>
                    </div>
                    <p className="text-[11px] text-[#1A1A2E] truncate mb-0.5">
                      {firstMsg
                        ? (firstMsg.content.length > 60 ? firstMsg.content.slice(0, 60) + '…' : firstMsg.content)
                        : 'No messages'}
                    </p>
                    <p className="text-[10px] text-[#71717A]">
                      {new Date(s.lastMessageAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Message thread */}
          <div className="col-span-3 bg-white border border-black/[0.08] rounded-xl overflow-hidden flex flex-col">
            {!selectedSession ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[13px] text-[#71717A]">Select a conversation to view messages</p>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-[#F4F4F5] flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-medium text-[#1A1A2E]">
                      {getPersonaLabel(selectedSession.buyerPersona)} · {selectedSession.buyerConfig ?? '—'}
                    </p>
                    <p className="text-[10px] text-[#71717A]">
                      {selectedSession.messages.length} messages · {getStageLabel(selectedSession.buyerStage)}
                      {selectedSession.buyerBudget ? ` · ₹${formatLakh(selectedSession.buyerBudget)}` : ''}
                    </p>
                  </div>
                  <Link
                    href={`/admin/buyers/${selectedSession.id}`}
                    className="text-[11px] text-[#185FA5] hover:underline"
                  >
                    Full profile →
                  </Link>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ maxHeight: '68vh' }}>
                  {selectedSession.messages.map((msg: any) => {
                    const isUser = msg.role === 'user'
                    return (
                      <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] px-3 py-2 rounded-xl text-[12px] leading-relaxed ${
                            isUser
                              ? 'bg-[#1B4F8A] text-white rounded-br-sm'
                              : 'bg-[#F4F4F5] text-[#1A1A2E] rounded-bl-sm'
                          }`}
                        >
                          <p>{msg.content.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
                          <p className={`text-[9px] mt-1 ${isUser ? 'text-white/60 text-right' : 'text-[#71717A]'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  {selectedSession.messages.length === 0 && (
                    <p className="text-[12px] text-[#71717A] text-center py-8">No messages in this session.</p>
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
