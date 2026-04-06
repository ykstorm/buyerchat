'use client'

import { useEffect, useState } from 'react'
import { signOut } from 'next-auth/react'
import { motion } from 'framer-motion'
import Link from 'next/link'

type SessionItem = {
  id: string; buyerStage: string; buyerBudget: number | null
  buyerConfig: string | null; lastMessageAt: string; firstMessage: string
}

type ProjectItem = {
  id: string; projectName: string; pricePerSqft: number; microMarket: string
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
  open, onClose, userId, userName, userImage, onNewChat, onLoadSession, projects = []
}: {
  open: boolean; onClose: () => void; userId: string | null; userName: string | null; userImage: string | null; onNewChat: () => void; onLoadSession: (sessionId: string) => void; projects?: ProjectItem[]
}) {
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredSession, setHoveredSession] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [starredProjects, setStarredProjects] = useState<string[]>([])

  useEffect(() => {
    if (!userId) return
    fetch('/api/chat-sessions')
      .then(r => r.json())
      .then(setSessions)
      .catch(() => {})
  }, [userId])

  const filteredSessions = sessions.filter(s =>
    !searchQuery ||
    s.id.includes(searchQuery.toLowerCase()) ||
    (s.buyerBudget && `${s.buyerBudget}`.includes(searchQuery)) ||
    (s.buyerConfig && s.buyerConfig.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const sortedProjects = [...projects].sort((a, b) => {
    const aStarred = starredProjects.includes(a.id)
    const bStarred = starredProjects.includes(b.id)
    if (aStarred && !bStarred) return -1
    if (!aStarred && bStarred) return 1
    return 0
  })

  const sidebar = (
    <div
      className="w-60 h-full bg-[#FAFAF9] border-r border-[#EEECE8] flex flex-col flex-shrink-0 relative"
      onClick={() => setMenuOpen(null)}
    >
      {/* Grain overlay */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'1\'/%3E%3C/svg%3E")' }}
      />
      {/* Header */}
      <div className="px-4 py-4 border-b border-[#E7E5E4]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[15px] font-semibold text-[#1C1917] tracking-tight">
            BuyerChat
          </span>
          <button type="button" onClick={onClose} className="lg:hidden text-[#A8A29E] hover:text-[#1C1917]">✕</button>
        </div>
        <button type="button" onClick={onNewChat} className="w-full bg-[#1B4F8A] text-white text-[12px] font-medium py-2 rounded-lg hover:bg-[#163d6b] transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_8px_rgba(27,79,138,0.15)]">
          + New chat
        </button>
      </div>

      {/* Search bar */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 bg-[#F4F3F0] rounded-xl px-3 py-2 border border-[#E7E5E4]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            placeholder="Search chats or projects..."
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
          <motion.div
            key={s.id}
            onClick={() => onLoadSession(s.id)}
            onMouseEnter={() => setHoveredSession(s.id)}
            onMouseLeave={() => setHoveredSession(null)}
            whileHover={{ x: 2 }}
            transition={{ duration: 0.15 }}
            className="relative px-2 py-2.5 rounded-lg hover:bg-[#F7F6F4] transition-all duration-200 cursor-pointer mb-0.5 group"
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

            {/* Three-dot menu button */}
            {hoveredSession === s.id && (
              <button
                type="button"
                onClick={e => { e.preventDefault(); e.stopPropagation(); setMenuOpen(menuOpen === s.id ? null : s.id) }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md hover:bg-[#ECEAE7] flex items-center justify-center text-[#A8A29E] flex-shrink-0"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                </svg>
              </button>
            )}

            {/* Dropdown menu */}
            {menuOpen === s.id && (
              <div className="absolute right-2 top-8 z-50 bg-white border border-[#E7E5E4] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] py-1 min-w-[140px]">
                <button type="button" className="w-full px-3 py-2 text-left text-[12px] text-[#1C1917] hover:bg-[#F7F6F4] flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Rename
                </button>
                <button type="button" onClick={() => { setMenuOpen(null) }} className="w-full px-3 py-2 text-left text-[12px] text-[#A32D2D] hover:bg-[#FDF2F2] flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                  Delete chat
                </button>
              </div>
            )}
          </motion.div>
        ))}
        {filteredSessions.length === 0 && sessions.length === 0 && userId && (
          <p className="text-[12px] text-[#A8A29E] px-2 py-4 text-center">No past chats yet</p>
        )}
        {!userId && (
          <p className="text-[12px] text-[#A8A29E] px-2 py-4 text-center">Sign in to see chat history</p>
        )}

        {/* Projects section */}
        {sortedProjects.length > 0 && (
          <div className="px-1 mb-2 mt-3">
            <p className="text-[10px] font-semibold text-[#A8A29E] uppercase tracking-[0.08em] mb-2 px-1">Projects</p>
            {sortedProjects
              .filter(p => !searchQuery || p.projectName.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(p => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="flex items-center px-2 py-2 rounded-lg hover:bg-[#F4F3F0] transition-colors mb-0.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-[#1C1917] truncate">{p.projectName}</p>
                    <p className="text-[10px] text-[#A8A29E]">₹{p.pricePerSqft?.toLocaleString('en-IN')}/sqft · {p.microMarket}</p>
                  </div>
                  <button
                    type="button"
                    onClick={e => {
                      e.preventDefault()
                      setStarredProjects(prev =>
                        prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                      )
                    }}
                    className="ml-auto text-[#A8A29E] hover:text-[#F59E0B] flex-shrink-0"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={starredProjects.includes(p.id) ? '#F59E0B' : 'none'} stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  </button>
                </Link>
              ))
            }
          </div>
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
