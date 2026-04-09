// src/app/admin/layout.tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import AdminNavClient from '@/components/admin/AdminNavClient'

const PROJECT_START = new Date('2026-03-07')
const DAY_TOTAL = 42

function getDayNumber() {
  return Math.min(
    Math.ceil((Date.now() - PROJECT_START.getTime()) / 86400000),
    DAY_TOTAL
  )
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user || session.user.email !== process.env.ADMIN_EMAIL) {
    redirect('/')
  }

  const userName = session.user.name ?? 'Admin'
  const initial = userName.charAt(0).toUpperCase()
  const day = getDayNumber()

  return (
    <div className="min-h-screen bg-[#EFEFED]">
      {/* AdminNavClient renders sidebar (and its own topbar underneath) */}
      <AdminNavClient userName={userName} />

      {/* New topbar — z-[60] overrides AdminNavClient's z-50 topbar */}
      <header className="fixed top-0 left-0 right-0 h-12 bg-[#1B3A6B] z-[60] flex items-center px-4 gap-3">
        {/* Left: hamburger (mobile) + logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button id="admin-mobile-menu" type="button" className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <span className="text-[15px] font-semibold text-[#52CDAA]">Aa</span>
          <span className="text-[15px] font-semibold text-white">iGhar</span>
          <span className="text-[11px] text-[#A8C8E8] ml-1.5 hidden sm:inline">Admin</span>
        </div>

        {/* Middle: breadcrumb placeholder */}
        <div className="flex-1 hidden md:flex items-center">
          <span className="text-[11px] text-[#A8C8E8]">/ Admin Panel</span>
        </div>

        {/* Right: Live chip + Day chip + avatar */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 bg-[#52CDAA] text-[#03382B] text-[10px] font-semibold px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#03382B] animate-pulse" />
            Live
          </div>

          {/* Day chip */}
          <div className="bg-white/[0.12] text-white text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap">
            Day {day} of {DAY_TOTAL}
          </div>

          {/* Avatar */}
          <div className="w-7 h-7 rounded-full bg-[#1A5EA8] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
            {initial}
          </div>
        </div>
      </header>

      {/* Content: sidebar offset on desktop */}
      <main className="lg:ml-14 mt-12 p-5 min-h-screen">
        {children}
      </main>
    </div>
  )
}
