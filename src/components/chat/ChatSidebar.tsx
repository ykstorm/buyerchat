'use client'

import { useEffect, useState } from 'react'
import { signOut } from 'next-auth/react'
import { motion } from 'framer-motion'
import Link from 'next/link'

type SessionItem = {
  id: string; buyerStage: string; buyerBudget: number | null
  buyerConfig: string | null; lastMessageAt: string; firstMessage: string
}

const STAGE_COLORS: Record<string, string> = {
  intent_capture: 'bg-[#F4F4F5] text-[#52525B]',
  project_disclosure: 'bg-[#F4F4F5] text-[#52525B]',
  qualification: 'bg-[#E6F1FB] text-[#0C447C]',
  comparison: 'bg-[#FAEEDA] text-[#633806]',
  visit_trigger: 'bg-[#FAEEDA] text-[#633806]',
  pre_visit: 'bg-[#FCEBEB] text-[#791F1F]',
  post_visit: 'bg-[#FCEBEB] text-[#791F1F]',
  decision: 'bg-[#E1F5EE] text-[#085041]',
}

const STAGE_LABELS: Record<string, string> = {
  intent_capture: 'Intent', project_disclosure: 'Exploring',
  qualification: 'Qualified', comparison: 'Comparing',
  visit_trigger: 'Visit ready', pre_visit: 'Registered',
  post_visit: 'Post visit', decision: 'Done',
}

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 60) return `${m}m`
  if (m < 1440) return `${Math.floor(m / 60)}h`
  return `${Math.floor(m / 1440)}d`
}

export default function ChatSidebar({
  open, onClose, userId, userName, userImage, onNewChat, onLoadSession
}: {
  open: boolean; onClose: () => void; userId: string | null; userName: string | null; userImage: string | null; onNewChat: () => void; onLoadSession: (sessionId: string) => void
}) {
  const [sessions, setSessions] = useState<SessionItem[]>([])

  useEffect(() => {
    if (!userId) return
    fetch('/api/chat-sessions')
      .then(r => r.json())
      .then(setSessions)
      .catch(() => {})
  }, [userId])

  const sidebar = (
    <div className="w-60 h-full bg-[#F4F3F0] border-r border-[#E7E5E4] flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="px-4 py-4 border-b border-[#E7E5E4]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[15px] font-semibold text-[#1C1917] tracking-tight">
            BuyerChat
          </span>
          <button type="button" onClick={onClose} className="lg:hidden text-[#A8A29E] hover:text-[#1C1917]">✕</button>
        </div>
        <button type="button" onClick={onNewChat} className="w-full bg-[#1B4F8A] text-white text-[12px] font-medium py-2 rounded-lg hover:bg-[#163d6b] transition-colors">
          + New chat
        </button>
      </div>

      {/* Past chats */}
      <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-none">
        {sessions.length > 0 && (
          <p className="text-[10px] font-medium text-[#A8A29E] uppercase tracking-wider px-2 mb-2">Recent chats</p>
        )}
        {sessions.map(s => (
          <motion.div
            key={s.id}
            onClick={() => onLoadSession(s.id)}
            whileHover={{ x: 2 }}
            transition={{ duration: 0.15 }}
            className="px-2 py-2.5 rounded-lg hover:bg-[#ECEAE7] cursor-pointer mb-0.5 group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STAGE_COLORS[s.buyerStage] ?? 'bg-[#F4F4F5] text-[#52525B]'}`}>
                {STAGE_LABELS[s.buyerStage] ?? s.buyerStage}
              </span>
              <span className="text-[10px] text-[#A8A29E]">{timeAgo(s.lastMessageAt)}</span>
            </div>
            <p className="text-[12px] text-[#1C1917] font-medium truncate leading-snug">
              {s.firstMessage ? s.firstMessage.slice(0, 40) : 'New conversation'}
            </p>
            {(s.buyerBudget || s.buyerConfig) && (
              <p className="text-[10px] text-[#A8A29E] mt-0.5">
                {s.buyerConfig}{s.buyerBudget ? ` · ₹${Math.round(s.buyerBudget/100000)}L` : ''}
              </p>
            )}
          </motion.div>
        ))}
        {sessions.length === 0 && userId && (
          <p className="text-[12px] text-[#A8A29E] px-2 py-4 text-center">No past chats yet</p>
        )}
        {!userId && (
          <p className="text-[12px] text-[#A8A29E] px-2 py-4 text-center">Sign in to see chat history</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#E7E5E4]">
        {userId ? (
          <div className="flex items-center gap-2">
            {userImage && <img src={userImage} className="w-6 h-6 rounded-full" alt="" />}
            <span className="text-[11px] text-[#1C1917] truncate">{userName ?? 'You'}</span>
            <button type="button" onClick={() => signOut({ callbackUrl: '/' })} className="text-[11px] text-[#A8A29E] hover:text-[#1C1917] ml-auto">Sign out</button>
          </div>
        ) : (
          <Link href="/auth/signin" className="text-[11px] text-[#1B4F8A] font-medium">Sign in</Link>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block h-full">{sidebar}</div>
      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={onClose} />
          <div className="absolute left-0 top-0 h-full">{sidebar}</div>
        </div>
      )}
    </>
  )
}
