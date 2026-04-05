'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/admin',             icon: '📊', label: 'Dash' },
  { href: '/admin/projects',    icon: '🏢', label: 'Projects' },
  { href: '/admin/buyers',      icon: '👥', label: 'Buyers' },
  { href: '/admin/builders',    icon: '🏗️', label: 'Builders' },
  { href: '/admin/followup',    icon: '📞', label: 'Follow' },
  { href: '/admin/revenue',     icon: '💰', label: 'Revenue' },
  { href: '/admin/intelligence',icon: '🧠', label: 'Intel' },
  { href: '/admin/visits',      icon: '📅', label: 'Visits' },
]

const TOP_GROUP = NAV_ITEMS.slice(0, 4)
const BOTTOM_GROUP = NAV_ITEMS.slice(4)

export default function AdminNavClient({ userName }: { userName: string }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' || pathname === '/admin/overview' : pathname.startsWith(href)

  const NavItem = ({ item }: { item: typeof NAV_ITEMS[0] }) => {
    const active = isActive(item.href)
    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`w-11 h-11 rounded-[10px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
          active
            ? 'bg-[#1A5EA8]'
            : 'hover:bg-white/[0.11]'
        }`}
      >
        <span className="text-[18px] leading-none">{item.icon}</span>
        <span className="text-[8px] font-medium text-white/70 leading-none">{item.label}</span>
      </Link>
    )
  }

  const sidebar = (
    <aside className="w-14 bg-[#0D3570] h-full flex flex-col items-center pt-2 pb-3 gap-1">
      {TOP_GROUP.map(item => <NavItem key={item.href} item={item} />)}
      <div className="w-8 h-px bg-white/10 my-1" />
      {BOTTOM_GROUP.map(item => <NavItem key={item.href} item={item} />)}
    </aside>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block fixed left-0 top-12 bottom-0 z-40">
        {sidebar}
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="bg-black/40 flex-1" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-12 bottom-0">
            {sidebar}
          </div>
        </div>
      )}
    </>
  )
}
