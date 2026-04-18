"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion"

export default function Navbar() {
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
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

  // Hide navbar on pages that have their own navigation
  if (pathname === '/' || pathname?.startsWith('/chat') || pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin')) {
    return null
  }

  const navLinks = [
    { name: "Projects", href: "/projects" },
  ]

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

          {/* Desktop CTA */}
          <div className="hidden md:block">
            <Link
              href="/auth/signin"
              className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-[13px] text-[#e0e0ea] transition-all duration-200 hover:bg-white/[0.08]"
            >
              Sign In
            </Link>
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
                <Link
                  href="/auth/signin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="mt-4 rounded-full border border-white/10 bg-white/[0.04] py-3 text-center text-[13px] text-[#e0e0ea] transition-all duration-200 hover:bg-white/[0.08]"
                >
                  Sign In
                </Link>
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