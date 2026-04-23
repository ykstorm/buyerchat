"use client"

import { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion"
import { useSession, signOut } from "next-auth/react"

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

  // Hide navbar on pages that have their own navigation
  if (pathname === '/' || pathname?.startsWith('/chat') || pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin') || pathname?.startsWith('/auth')) {
    return null
  }

  const navLinks = [
    { name: "Projects", href: "/projects" },
    { name: "Builders", href: "/builders" },
    { name: "Compare", href: "/compare" },
  ]

  // C2 (Sprint C): session-aware CTA. Avatar when authed, Sign In pill when not.
  const userInitial = (session?.user?.name ?? session?.user?.email ?? 'U').charAt(0).toUpperCase()

  return (
    <>
      <motion.header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "border-b border-white/[0.08] bg-[#09090b]/80 backdrop-blur-md"
            : "bg-transparent"
        }`}
      >
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3de8a0] opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#3de8a0]" />
            </span>
            <span className="font-serif text-lg font-bold text-[#e0e0ea]">
              Homesty
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-[13px] text-[#8888a8] transition-colors duration-150 hover:text-[#e0e0ea]"
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Desktop CTA — C2: session-aware */}
          <div className="hidden md:block">
            {!session ? (
              <Link
                href="/auth/signin"
                className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-[13px] text-[#e0e0ea] transition-all duration-200 hover:bg-white/[0.08]"
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
                  className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.04] text-[12px] font-semibold text-[#e0e0ea] transition-all duration-200 hover:bg-white/[0.08]"
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
                      className="absolute right-0 mt-2 min-w-[160px] rounded-lg border border-white/10 bg-[#0f0f14] p-1 shadow-lg"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsAvatarOpen(false)
                          signOut({ callbackUrl: '/' })
                        }}
                        className="block w-full rounded-md px-3 py-2 text-left text-[13px] text-[#e0e0ea] transition-colors hover:bg-white/[0.06]"
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
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] md:hidden"
            aria-label="Toggle menu"
          >
            <div className="flex flex-col gap-1">
              <span className={`block h-px w-5 bg-[#e0e0ea] transition-all duration-200 ${isMobileMenuOpen ? "translate-y-1.5 rotate-45" : ""}`} />
              <span className={`block h-px w-5 bg-[#e0e0ea] transition-all duration-200 ${isMobileMenuOpen ? "opacity-0" : ""}`} />
              <span className={`block h-px w-5 bg-[#e0e0ea] transition-all duration-200 ${isMobileMenuOpen ? "-translate-y-1.5 -rotate-45" : ""}`} />
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
              className="fixed inset-x-0 top-[73px] z-40 border-b border-white/[0.08] bg-[#09090b]/95 backdrop-blur-md md:hidden"
            >
              <div className="flex flex-col p-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex h-12 items-center text-[13px] text-[#8888a8] transition-colors duration-150 hover:text-[#e0e0ea]"
                  >
                    {link.name}
                  </Link>
                ))}
                {/* C2 (Sprint C): session-aware mobile CTA */}
                {!session ? (
                  <Link
                    href="/auth/signin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="mt-4 rounded-full border border-white/10 bg-white/[0.04] py-3 text-center text-[13px] text-[#e0e0ea] transition-all duration-200 hover:bg-white/[0.08]"
                  >
                    Sign In
                  </Link>
                ) : (
                  <div className="mt-4 flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
                    <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white/[0.06] text-[12px] font-semibold text-[#e0e0ea]" aria-hidden="true">
                      {session.user?.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={session.user.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        userInitial
                      )}
                    </span>
                    <span className="flex-1 truncate text-[12px] text-[#8888a8]">{session.user?.name ?? session.user?.email ?? 'Signed in'}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        signOut({ callbackUrl: '/' })
                      }}
                      aria-label="Sign out"
                      className="text-[12px] text-[#e0e0ea] transition-colors hover:text-[#3de8a0]"
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