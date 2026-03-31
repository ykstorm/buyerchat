'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'Overview',      href: '/admin/overview',      slug: 'overview' },
  { label: 'Projects',      href: '/admin/projects',      slug: 'projects' },
  { label: 'Buyers',        href: '/admin/buyers',        slug: 'buyers' },
  { label: 'Builders',      href: '/admin/builders',      slug: 'builders' },
  { label: 'Follow-Up',     href: '/admin/followup',      slug: 'followup' },
  { label: 'Revenue',       href: '/admin/revenue',       slug: 'revenue' },
  { label: 'Intelligence',  href: '/admin/intelligence',  slug: 'intelligence' },
]

const SIDEBAR_ICONS = [
  { href: '/admin/overview',     label: 'Overview',     icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
  { href: '/admin/projects',     label: 'Projects',     icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/></svg> },
  { href: '/admin/buyers',       label: 'Buyers',       icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> },
  { href: '/admin/builders',     label: 'Builders',     icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg> },
  { href: '/admin/followup',     label: 'Follow-Up',    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg> },
  { href: '/admin/revenue',      label: 'Revenue',      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
  { href: '/admin/intelligence', label: 'Intelligence', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
]

export default function AdminNavClient({ userName }: { userName: string }) {
  const pathname = usePathname()

  return (
    <>
      {/* Topbar */}
      <header className="fixed top-0 left-0 right-0 h-12 bg-[#1F3864] z-50 flex items-center px-4 gap-6">
        <div className="flex items-center gap-1 mr-4">
          <span className="font-sans text-base font-medium text-white">Buyer</span>
          <span className="font-sans text-base font-medium text-[#5DCAA5]">Chat</span>
          <span className="font-sans text-base font-medium text-[#B5D4F4] ml-1">Admin</span>
        </div>
        <nav className="flex items-center gap-1 flex-1">
          {NAV_ITEMS.map(item => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.slug}
                href={item.href}
                className={`font-sans text-xs px-3 py-1 rounded-full transition-colors ${
                  isActive
                    ? 'bg-[#5DCAA5] text-[#04342C] font-medium'
                    : 'text-[#B5D4F4] hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <span className="font-sans text-xs text-[#B5D4F4]">{userName}</span>
      </header>

      {/* Sidebar */}
      <aside className="fixed left-0 top-12 bottom-0 w-14 bg-[#0C447C] z-40 flex flex-col items-center pt-3 gap-1">
        {SIDEBAR_ICONS.map(item => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors text-white ${
                isActive ? 'bg-[#185FA5]' : 'hover:bg-[#185FA5]/60'
              }`}
            >
              {item.icon}
            </Link>
          )
        })}
      </aside>
    </>
  )
}
