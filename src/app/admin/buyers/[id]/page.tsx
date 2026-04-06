// src/app/admin/buyers/[id]/page.tsx
import { prisma } from '@/lib/prisma'
import { AdminCard } from '@/components/admin/AdminComponents'
import { BadgeStatus } from '@/components/admin/AdminComponents'
import { formatLakh, formatDate, getStageLabel, getPersonaLabel } from '@/lib/admin-utils'
import { notFound } from 'next/navigation'

const stripMarkdown = (text: string) => text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')

export default async function BuyerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let session: any = null
  try {
    session = await prisma.chatSession.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    })
  } catch (err) {
    console.error('Buyer detail error:', err)
  }

  if (!session) notFound()

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-4">
        <a href="/admin/buyers" className="text-[12px] text-[#52525B] hover:text-[#1A1A2E]">← Buyers</a>
        <span className="text-[#52525B]">/</span>
        <span className="text-[12px] text-[#1A1A2E] font-mono">{id.slice(0, 16)}…</span>
      </div>

      {/* Session metadata */}
      <div className="bg-white border border-black/[0.08] rounded-xl p-4 mb-4">
        <p className="text-[12px] font-medium text-[#1A1A2E] mb-3">Session Profile</p>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Persona', value: getPersonaLabel(session.buyerPersona) },
            { label: 'Config', value: session.buyerConfig ?? '—' },
            { label: 'Budget', value: session.buyerBudget ? `₹${formatLakh(session.buyerBudget)}` : '—' },
            { label: 'Stage', value: getStageLabel(session.buyerStage) },
            { label: 'Purpose', value: session.buyerPurpose ?? '—' },
            { label: 'Qualified', value: session.qualificationDone ? 'Yes' : 'No' },
            { label: 'Projects seen', value: session.projectsDisclosed?.length ?? 0 },
            { label: 'Messages', value: session.messages?.length ?? 0 },
          ].map(item => (
            <div key={item.label}>
              <p className="text-[11px] text-[#52525B]">{item.label}</p>
              <p className="text-[13px] font-medium text-[#1A1A2E]">{String(item.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Conversation */}
      <AdminCard title="Conversation">
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {session.messages?.map((msg: any) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl px-3 py-2 ${
                msg.role === 'user'
                  ? 'bg-[#E6F1FB] text-[#0C447C]'
                  : 'bg-[#F4F4F5] text-[#1A1A2E]'
              }`}>
                <p className="text-[12px] whitespace-pre-wrap">{stripMarkdown(msg.content)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-[#71717A]">
                    {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.tokensUsed && <span className="text-[10px] text-[#71717A]">{msg.tokensUsed} tokens</span>}
                  {msg.violations?.length > 0 && (
                    <BadgeStatus label="⚠ Violation" color="red" />
                  )}
                </div>
              </div>
            </div>
          ))}
          {(!session.messages || session.messages.length === 0) && (
            <p className="text-[12px] text-[#52525B] text-center py-4">No messages logged yet.</p>
          )}
        </div>
      </AdminCard>
    </div>
  )
}
