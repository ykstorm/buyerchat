'use client'

import { useEffect, useState } from 'react'
import { signOut } from 'next-auth/react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import Link from 'next/link'

type SessionItem = {
  id: string; buyerStage: string; buyerBudget: number | null
  buyerConfig: string | null; lastMessageAt: string; firstMessage: string; customName?: string | null
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

function getChatNames(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem('chatNames') || '{}') } catch { return {} }
}

function SwipeableSessionItem({ session, onLoad, onClose, menuOpen, setMenuOpen, hoveredSession, setHoveredSession, renamingSession, setRenamingSession, renameValue, setRenameValue, setSessions, saveRename, chatNames }: any) {
  const x = useMotionValue(0)
  const deleteOpacity = useTransform(x, [-100, -50], [1, 0])
  const itemOpacity = useTransform(x, [-100, -60], [0, 1])
  const displayTitle = chatNames[session.id] || session.customName || (session.firstMessage ? session.firstMessage.slice(0, 40) : 'New conversation')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const doDelete = async () => {
    try {
      await fetch(`/api/chat-sessions/${session.id}`, { method: 'DELETE' })
      setSessions((prev: any[]) => prev.filter((s: any) => s.id !== session.id))
    } catch {}
  }

  const handleDragEnd = async (_: any, info: any) => {
    if (info.offset.x < -80) {
      await animate(x, -500, { duration: 0.3 })
      try {
        await fetch(`/api/chat-sessions/${session.id}`, { method: 'DELETE' })
        setSessions((prev: any[]) => prev.filter(s => s.id !== session.id))
      } catch {}
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 })
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl mb-0.5">
      {/* Delete background */}
      <motion.div
        style={{ opacity: deleteOpacity }}
        className="absolute inset-0 bg-[#FEE2E2] flex items-center justify-end pr-4 rounded-xl"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A32D2D" strokeWidth="2">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
        </svg>
      </motion.div>

      {/* Session item */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x, opacity: itemOpacity }}
        className="relative px-3 py-2.5 rounded-xl cursor-pointer hover:bg-[#F7F6F4] transition-colors"
        onMouseEnter={() => setHoveredSession(session.id)}
        onClick={() => { if (renamingSession !== session.id && !confirmingDelete) { onLoad(session.id); onClose() } }}
      >
        {confirmingDelete ? (
          <div onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-2 py-2">
            <p className="text-[11px] text-[#A32D2D] font-medium mb-1.5">Delete this chat?</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={e => { e.preventDefault(); e.stopPropagation(); doDelete() }}
                className="flex-1 text-[11px] font-medium text-white bg-[#A32D2D] rounded-md py-0.5 hover:bg-[#7F1D1D] transition-colors"
              >Yes, delete</button>
              <button
                type="button"
                onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirmingDelete(false); }}
                className="flex-1 text-[11px] font-medium text-[#78716C] bg-[#F4F3F0] rounded-md py-0.5 hover:bg-[#E7E5E4] transition-colors"
              >Cancel</button>
            </div>
          </div>
        ) : renamingSession === session.id ? (
          <div onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
            <input
              autoFocus
              type="text"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') saveRename(session.id, renameValue)
                if (e.key === 'Escape') setRenamingSession(null)
              }}
              onMouseDown={e => e.stopPropagation()}
              className="text-[12px] text-[#1C1917] bg-white border border-[#1B4F8A] rounded-lg outline-none w-full px-2 py-1 mb-1.5"
            />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={e => { e.preventDefault(); e.stopPropagation(); saveRename(session.id, renameValue) }}
                className="flex-1 text-[11px] font-medium text-white bg-[#1B4F8A] rounded-md py-0.5 hover:bg-[#163d6b] transition-colors"
              >✓</button>
              <button
                type="button"
                onClick={e => { e.preventDefault(); e.stopPropagation(); setRenamingSession(null) }}
                className="flex-1 text-[11px] font-medium text-[#78716C] bg-[#F4F3F0] rounded-md py-0.5 hover:bg-[#E7E5E4] transition-colors"
              >✗</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STAGE_COLORS[session.buyerStage] ?? 'bg-[#F4F4F5] text-[#52525B]'}`}>
                {STAGE_LABELS[session.buyerStage] ?? session.buyerStage}
              </span>
              <span className="text-[10px] text-[#A8A29E]">{timeAgo(session.lastMessageAt)}</span>
            </div>
            <p className="text-[12px] font-medium text-[#1C1917] truncate leading-tight">{displayTitle}</p>
          </>
        )}

        {!confirmingDelete && renamingSession !== session.id && (session.buyerBudget || session.buyerConfig) && (
          <p className="text-[10px] text-[#A8A29E] mt-0.5">
            {session.buyerConfig}{session.buyerBudget ? ` · ₹${Math.round(session.buyerBudget / 100000)}L` : ''}
          </p>
        )}

        {hoveredSession === session.id && (
          <>
            {/* Desktop: show icons directly */}
            <div className="hidden lg:flex items-center gap-1 absolute right-2 top-1/2 -translate-y-1/2">
              <button
                type="button"
                onClick={e => { e.preventDefault(); e.stopPropagation(); setRenamingSession(session.id); setRenameValue(displayTitle); }}
                className="w-5 h-5 rounded flex items-center justify-center text-[#A8A29E] hover:text-[#1C1917] hover:bg-[#ECEAE7] transition-colors"
                title="Rename"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirmingDelete(true); setMenuOpen(null) }}
                className="w-5 h-5 rounded flex items-center justify-center text-[#A8A29E] hover:text-[#A32D2D] hover:bg-[#FEE2E2] transition-colors"
                title="Delete"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                </svg>
              </button>
            </div>

            {/* Mobile: three-dot menu button */}
            <button
              type="button"
              className="lg:hidden absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center text-[#A8A29E]"
              onClick={e => { e.preventDefault(); e.stopPropagation(); setMenuOpen(menuOpen === session.id ? null : session.id) }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
              </svg>
            </button>
          </>
        )}

        {/* Mobile dropdown menu */}
        {menuOpen === session.id && (
          <div
            onClick={e => e.stopPropagation()}
            className="absolute right-2 top-8 z-50 bg-white border border-[#E7E5E4] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] py-1 min-w-[140px]"
          >
            <button
              type="button"
              onMouseDown={e => {
                e.preventDefault(); e.stopPropagation()
                setRenamingSession(session.id)
                setRenameValue(chatNames[session.id] || (session.firstMessage ? session.firstMessage.slice(0, 40) : session.id.slice(0, 8)))
                setMenuOpen(null)
              }}
              className="w-full px-3 py-2 text-left text-[12px] text-[#1C1917] hover:bg-[#F7F6F4] flex items-center gap-2"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Rename
            </button>
            <button
              type="button"
              onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirmingDelete(true); setMenuOpen(null); setHoveredSession(null) }}
              className="w-full px-3 py-2 text-left text-[12px] text-[#A32D2D] hover:bg-[#FDF2F2] flex items-center gap-2"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
              Delete chat
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}


export default function ChatSidebar({
  open, onClose, userId, userName, userImage, onNewChat, onLoadSession
}: {
  open: boolean; onClose: () => void; userId: string | null; userName: string | null; userImage: string | null; onNewChat: () => void; onLoadSession: (sessionId: string) => void
}) {
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredSession, setHoveredSession] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
const [renamingSession, setRenamingSession] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [chatNames, setChatNames] = useState<Record<string, string>>({})

  useEffect(() => {
    setChatNames(getChatNames())
  }, [])

  useEffect(() => {
    if (!userId) return
    fetch('/api/chat-sessions')
      .then(r => r.json())
      .then(setSessions)
      .catch(() => {})
  }, [userId])

  useEffect(() => {
    const close = () => {
      setMenuOpen(null)
      setHoveredSession(null)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const saveRename = async (id: string, value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const saved = { ...getChatNames(), [id]: trimmed }
    localStorage.setItem('chatNames', JSON.stringify(saved))
    setChatNames(saved)
    setRenamingSession(null)
    try {
      await fetch(`/api/chat-sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customName: trimmed })
      })
    } catch {}
  }

  const filteredSessions = sessions.filter(s => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    const title = chatNames[s.id] || s.customName || s.firstMessage || ''
    return title.toLowerCase().includes(q) ||
      (s.buyerConfig && s.buyerConfig.toLowerCase().includes(q)) ||
      (s.buyerBudget && `${s.buyerBudget}`.includes(q))
  })

const sidebar = (
    <div className="w-60 h-full bg-[#FAFAF9] border-r border-[#EEECE8] flex flex-col flex-shrink-0 relative grain">
      {/* Grain overlay */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'1\'/%3E%3C/svg%3E")' }}
      />
      {/* Header */}
      <div className="px-4 py-4 border-b border-[#E7E5E4]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[15px] font-semibold text-[#1C1917] tracking-tight">BuyerChat</span>
          <button type="button" onClick={onClose} className="lg:hidden text-[#A8A29E] hover:text-[#1C1917]">✕</button>
        </div>
        <button type="button" onClick={onNewChat} className="w-full bg-[#1B4F8A] text-white text-[12px] font-medium py-2 rounded-lg hover:bg-[#163d6b] transition-all duration-200 shadow-luxury-sm hover:shadow-[0_2px_8px_rgba(27,79,138,0.15)]">
          + New chat
        </button>
      </div>

      {/* Search bar */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 bg-[#F4F3F0] rounded-xl px-3 py-2 border border-[#E7E5E4]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent text-[12px] text-[#1C1917] placeholder-[#A8A29E] outline-none w-full"
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-none">

        {/* Chats section */}
        {filteredSessions.length > 0 && (
          <p className="text-[10px] font-semibold text-[#A8A29E] uppercase tracking-[0.08em] px-2 mb-2">Recent chats</p>
        )}
        {filteredSessions.map(s => (
          <SwipeableSessionItem
            key={s.id}
            session={s}
            onLoad={onLoadSession}
            onClose={onClose}
            menuOpen={menuOpen}
            setMenuOpen={setMenuOpen}
            hoveredSession={hoveredSession}
            setHoveredSession={setHoveredSession}
            renamingSession={renamingSession}
            setRenamingSession={setRenamingSession}
            renameValue={renameValue}
            setRenameValue={setRenameValue}
            setSessions={setSessions}
            saveRename={saveRename}
            chatNames={chatNames}
          />
        ))}
        {filteredSessions.length === 0 && sessions.length === 0 && userId && (
          <p className="text-[12px] text-[#A8A29E] px-2 py-4 text-center">No past chats yet</p>
        )}
        {!userId && (
          <p className="text-[12px] text-[#A8A29E] px-2 py-4 text-center">Sign in to see chat history</p>
        )}

      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#E7E5E4]">
        {userId ? (
          <div>
            <Link href="/dashboard" className="text-[10px] text-[#A8A29E] hover:text-[#1C1917] block mb-1">
              My saved projects →
            </Link>
            <div className="flex items-center gap-2">
              {userImage && <img src={userImage} className="w-6 h-6 rounded-full" alt="" />}
              <span className="text-[11px] text-[#1C1917] truncate">{userName ?? 'You'}</span>
              <button type="button" onClick={() => signOut({ callbackUrl: '/' })} className="text-[11px] text-[#A8A29E] hover:text-[#1C1917] ml-auto">Sign out</button>
            </div>
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
