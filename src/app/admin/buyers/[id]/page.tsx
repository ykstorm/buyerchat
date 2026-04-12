import { prisma } from '@/lib/prisma'
import { DarkBadge } from '@/components/admin/DarkCard'
import { formatLakh, getStageLabel, getPersonaLabel } from '@/lib/admin-utils'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const stripMarkdown = (text: string) => text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')

export default async function BuyerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let session: any = null
  try {
    session = await prisma.chatSession.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } }
      }
    })
  } catch (err) {
    console.error('Buyer detail error:', err)
  }

  if (!session) notFound()

  return (
    <div className="max-w-3xl" style={{ background: '#0A0F1E', minHeight: '100vh' }}>
      <div className="flex items-center gap-3 mb-5">
        <Link href="/admin/buyers" className="text-[12px] hover:underline" style={{ color: '#60A5FA' }}>← Buyers</Link>
        <span style={{ color: '#374151' }}>/</span>
        <span className="text-[12px] font-mono" style={{ color: '#6B7280' }}>{id.slice(0, 16)}…</span>
      </div>

      {/* Session metadata */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-[13px] font-semibold text-white mb-4">Session Profile</p>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Persona', value: getPersonaLabel(session.buyerPersona) },
            { label: 'Config', value: session.buyerConfig ?? '—' },
            { label: 'Budget', value: session.buyerBudget ? `₹${formatLakh(session.buyerBudget)}` : '—' },
            { label: 'Stage', value: getStageLabel(session.buyerStage) },
            { label: 'Purpose', value: session.buyerPurpose ?? '—' },
            { label: 'Qualified', value: session.qualificationDone ? 'Yes ✓' : 'No' },
            { label: 'Messages', value: session.messages?.length ?? 0 },
            { label: 'Site visits', value: session.siteVisits?.length ?? 0 },
          ].map(item => (
            <div key={item.label}>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#4B5563' }}>{item.label}</p>
              <p className="text-[13px] font-medium text-white">{String(item.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Conversation */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[13px] font-semibold text-white">Conversation</p>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: '60vh' }}>
          {session.messages?.map((msg: any) => {
            const isUser = msg.role === 'user'
            return (
              <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[80%] rounded-xl px-3 py-2" style={{
                  background: isUser ? '#1B4F8A' : 'rgba(255,255,255,0.06)',
                  color: isUser ? 'white' : '#D1D5DB',
                  borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px'
                }}>
                  <p className="text-[12px] whitespace-pre-wrap">{stripMarkdown(msg.content)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px]" style={{ color: isUser ? 'rgba(255,255,255,0.5)' : '#4B5563' }}>
                      {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.tokensUsed && <span className="text-[10px]" style={{ color: '#4B5563' }}>{msg.tokensUsed} tokens</span>}
                    {msg.violations?.length > 0 && <DarkBadge label="⚠ Violation" color="red" />}
                  </div>
                </div>
              </div>
            )
          })}
          {(!session.messages || session.messages.length === 0) && (
            <p className="text-[12px] text-center py-4" style={{ color: '#4B5563' }}>No messages logged yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
