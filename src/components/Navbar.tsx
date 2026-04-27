"use client"

import { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion"
import { useSession, signOut } from "next-auth/react"

// Routes that render their own shell (Option 2 contextual shells, per
// docs/diagnostics/dashboard-revamp-audit.md). Navbar must hide entirely on
// these to avoid double-headers.
//   - /chat:      Chat shell (ChatSidebar + ChatCenter)
//   - /admin:     Admin shell (AdminNavClient)
//   - /auth:      Sign-in pages have their own minimal layout
//   - /dashboard: Luxury warm-tone shell (sticky header on the page itself,
//                 P2-DASHBOARD revamp 2026-04-27)
// Landing `/` still ships a bespoke hero header (custom dark toggle,
// "Begin" CTA, philosophy anchor) — keep it suppressed here; merging into
// the canonical Navbar is a follow-up beyond the consistency refactor.
const HIDE_PREFIXES = ['/chat', '/admin', '/auth', '/dashboard']
const HIDE_EXACT = ['/']

function isActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export default function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAvatarOpen, setIsAvatarOpen] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 20)
  })

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [isMobileMenuOpen])

  // C2 (Sprint C): close avatar dropdown on outside click
  useEffect(() => {
    if (!isAvatarOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setIsAvatarOpen(false)
      }
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [isAvatarOpen])

  // Hide navbar on routes that own their shell (chat, admin, auth signin, landing).
  // Projects + builders + compare + dashboard share this navbar (Option 2 — Q audit).
  if (HIDE_EXACT.includes(pathname ?? '')) return null
  if (HIDE_PREFIXES.some(prefix => pathname?.startsWith(prefix))) return null

  // Public links — `Dashboard` is gated to authenticated users (Q audit fix #2).
  // `/builders` index removed 2026-04-27 (P2-CRITICAL-7 Bug #4): only the
  // dynamic `/builders/[id]` route exists, so the index link 404'd in prod.
  // Builder profiles are reachable via project detail page; bringing back the
  // top-level Builders directory is a Phase 3 task.
  const navLinks: Array<{ name: string; href: string; authOnly?: boolean }> = [
    { name: "Projects", href: "/projects" },
    { name: "Compare", href: "/compare" },
    { name: "Dashboard", href: "/dashboard", authOnly: true },
  ]
  const visibleLinks = navLinks.filter(l => !l.authOnly || session)

  // C2 (Sprint C): session-aware CTA. Avatar when authed, Sign In pill when not.
  const userInitial = (session?.user?.name ?? session?.user?.email ?? 'U').charAt(0).toUpperCase()

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: isScrolled
            ? 'color-mix(in srgb, var(--bg-base) 80%, transparent)'
            : 'transparent',
          backdropFilter: isScrolled ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: isScrolled ? 'blur(12px)' : 'none',
          borderBottom: isScrolled ? '1px solid var(--border-subtle)' : '1px solid transparent',
        }}
      >
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                style={{ backgroundColor: 'var(--accent)' }}
              />
              <span
                className="relative inline-flex h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: 'var(--accent)' }}
              />
            </span>
            <span
              className="font-serif text-lg font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              Homesty.ai
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden items-center gap-8 md:flex">
            {visibleLinks.map((link) => {
              const active = isActive(link.href, pathname)
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-[13px] transition-colors duration-150"
                  style={{
                    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontWeight: active ? 500 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.color = 'var(--text-primary)'
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.color = 'var(--text-muted)'
                  }}
                  aria-current={active ? 'page' : undefined}
                >
                  {link.name}
                </Link>
              )
            })}
          </div>

          {/* Desktop CTA — C2: session-aware */}
          <div className="hidden md:block">
            {!session ? (
              <Link
                href="/auth/signin"
                className="rounded-full px-5 py-2 text-[13px] transition-all duration-200"
                style={{
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                }}
              >
                Sign In
              </Link>
            ) : (
              <div ref={avatarRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsAvatarOpen(v => !v)}
                  aria-label="Account menu"
                  aria-haspopup="menu"
                  aria-expanded={isAvatarOpen}
                  className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full text-[12px] font-semibold transition-all duration-200"
                  style={{
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {session.user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={session.user.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    userInitial
                  )}
                </button>
                <AnimatePresence>
                  {isAvatarOpen && (
                    <motion.div
                      role="menu"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 min-w-[180px] rounded-lg p-1 shadow-lg"
                      style={{
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-surface)',
                      }}
                    >
                      <Link
                        href="/dashboard"
                        role="menuitem"
                        onClick={() => setIsAvatarOpen(false)}
                        className="block rounded-md px-3 py-2 text-[13px] transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-subtle)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/chat"
                        role="menuitem"
                        onClick={() => setIsAvatarOpen(false)}
                        className="block rounded-md px-3 py-2 text-[13px] transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-subtle)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                      >
                        Chat
                      </Link>
                      <div style={{ height: 1, backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsAvatarOpen(false)
                          signOut({ callbackUrl: '/' })
                        }}
                        className="block w-full rounded-md px-3 py-2 text-left text-[13px] transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-subtle)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                      >
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg md:hidden"
            style={{
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-surface)',
            }}
            aria-label="Toggle menu"
          >
            <div className="flex flex-col gap-1">
              <span
                className={`block h-px w-5 transition-all duration-200 ${isMobileMenuOpen ? "translate-y-1.5 rotate-45" : ""}`}
                style={{ backgroundColor: 'var(--text-primary)' }}
              />
              <span
                className={`block h-px w-5 transition-all duration-200 ${isMobileMenuOpen ? "opacity-0" : ""}`}
                style={{ backgroundColor: 'var(--text-primary)' }}
              />
              <span
                className={`block h-px w-5 transition-all duration-200 ${isMobileMenuOpen ? "-translate-y-1.5 -rotate-45" : ""}`}
                style={{ backgroundColor: 'var(--text-primary)' }}
              />
            </div>
          </button>
        </nav>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-x-0 top-[73px] z-40 md:hidden"
              style={{
                borderBottom: '1px solid var(--border-subtle)',
                backgroundColor: 'color-mix(in srgb, var(--bg-base) 95%, transparent)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              <div className="flex flex-col p-6">
                {visibleLinks.map((link) => {
                  const active = isActive(link.href, pathname)
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex h-12 items-center text-[13px] transition-colors duration-150"
                      style={{
                        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontWeight: active ? 500 : 400,
                      }}
                      aria-current={active ? 'page' : undefined}
                    >
                      {link.name}
                    </Link>
                  )
                })}
                {/* C2 (Sprint C): session-aware mobile CTA */}
                {!session ? (
                  <Link
                    href="/auth/signin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="mt-4 rounded-full py-3 text-center text-[13px] transition-all duration-200"
                    style={{
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Sign In
                  </Link>
                ) : (
                  <div
                    className="mt-4 flex items-center gap-3 rounded-full px-4 py-2"
                    style={{
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-surface)',
                    }}
                  >
                    <span
                      className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full text-[12px] font-semibold"
                      style={{
                        backgroundColor: 'var(--bg-subtle)',
                        color: 'var(--text-primary)',
                      }}
                      aria-hidden="true"
                    >
                      {session.user?.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={session.user.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        userInitial
                      )}
                    </span>
                    <span className="flex-1 truncate text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      {session.user?.name ?? session.user?.email ?? 'Signed in'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        signOut({ callbackUrl: '/' })
                      }}
                      aria-label="Sign out"
                      className="text-[12px] transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-30 bg-black/50 md:hidden"
            />
          </>
        )}
      </AnimatePresence>
    </>
  )
}
