'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Brand 2.0 minimalist landing — locked spec.
// No founder quotes, no 4-pillar grid, no project preview, no marquee,
// no sample data. Single dominant CTA -> /chat.
export default function HomePage() {
  const [dark, setDark] = useState(false)
  const router = useRouter()

  // Mirror the pre-hydration script (`homesty-theme`) — see src/app/layout.tsx.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('homesty-theme')
      const attr = document.documentElement.getAttribute('data-theme')
      const isDark = saved === 'dark' || (!saved && attr === 'dark')
      setDark(isDark)
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    } catch {
      /* localStorage unavailable */
    }
  }, [])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    try {
      window.localStorage.setItem('homesty-theme', next ? 'dark' : 'light')
    } catch {
      /* localStorage unavailable */
    }
  }

  const beginSearch = () => router.push('/chat')

  // Brand mark color — same DaVinci-gold in both modes per locked spec.
  const BRAND_GOLD = '#B8860B'

  // CTA inverts in dark mode (white bg, black text) vs light (black bg, white text).
  const ctaBg = dark ? '#FAFAF8' : '#000000'
  const ctaText = dark ? '#000000' : '#FFFFFF'

  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center px-6"
      style={{
        background: 'var(--bg-base)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
      }}
    >
      {/* ── Top right: theme toggle + sign in ── */}
      <div className="absolute right-6 top-6 flex items-center gap-4">
        <button
          type="button"
          onClick={toggleDark}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex h-7 w-7 items-center justify-center rounded-md transition-opacity hover:opacity-80"
          style={{ color: '#888', background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          {dark ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
        </button>
        <Link
          href="/auth/signin"
          className="text-[12px] transition-opacity hover:opacity-80"
          style={{ color: '#888', textDecoration: 'none' }}
        >
          Sign in
        </Link>
      </div>

      {/* ── Centered content column ── */}
      <div className="flex w-full max-w-[480px] flex-col items-center text-center">
        {/* Brand mark */}
        <h1
          className="brand-mark"
          style={{
            fontFamily: 'var(--font-cormorant), "Cormorant Garamond", Georgia, serif',
            color: BRAND_GOLD,
            fontWeight: 600,
            lineHeight: 1,
            letterSpacing: '-0.01em',
            margin: 0,
          }}
        >
          Homesty.ai
        </h1>

        {/* Positioning — small caps */}
        <p
          style={{
            marginTop: '16px',
            fontSize: '13px',
            color: '#888',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            fontWeight: 500,
            lineHeight: 1.3,
          }}
        >
          AI-Powered Property Intelligence Platform
        </p>

        {/* Tagline */}
        <p
          className="tagline"
          style={{
            marginTop: '32px',
            fontFamily: 'var(--font-cormorant), "Cormorant Garamond", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 400,
            lineHeight: 1.25,
            color: dark ? '#BBB' : '#444',
            margin: '32px 0 0 0',
          }}
        >
          Honesty is rare.
          <br />
          It comes with Homesty.
        </p>

        {/* CTA */}
        <button
          type="button"
          onClick={beginSearch}
          className="cta"
          style={{
            marginTop: '48px',
            background: ctaBg,
            color: ctaText,
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            fontSize: '15px',
            fontWeight: 500,
            letterSpacing: '0.01em',
            padding: '14px 28px',
            borderRadius: '4px',
            border: 'none',
            cursor: 'pointer',
            transition: 'opacity 200ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          Begin your HomeSearch →
        </button>

        {/* Location */}
        <p style={{ marginTop: '24px', fontSize: '12px', color: '#888', lineHeight: 1.4 }}>
          South Bopal &amp; Shela, Ahmedabad
        </p>

        {/* Security */}
        <p
          style={{
            marginTop: '16px',
            fontSize: '11px',
            color: '#888',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            lineHeight: 1.4,
          }}
        >
          <span aria-hidden="true">🔒</span>
          No spam · No calls until you book a visit
        </p>
      </div>

      {/* ── Footer ── */}
      <footer
        className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-2 px-6 text-center"
        style={{ fontSize: '12px', color: '#888' }}
      >
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <Link href="/how-it-works" style={{ color: '#888', textDecoration: 'none' }} className="hover:opacity-80">
            How it works
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/about" style={{ color: '#888', textDecoration: 'none' }} className="hover:opacity-80">
            About
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/privacy" style={{ color: '#888', textDecoration: 'none' }} className="hover:opacity-80">
            Privacy
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/contact" style={{ color: '#888', textDecoration: 'none' }} className="hover:opacity-80">
            Contact
          </Link>
        </div>
        <span>© 2026 Homesty AI Technology LLP</span>
      </footer>

      {/* Scoped responsive type — keeps Tailwind purge unaffected. */}
      <style>{`
        .brand-mark { font-size: 64px; }
        .tagline { font-size: 22px; }
        @media (max-width: 480px) {
          .brand-mark { font-size: 48px; }
          .tagline { font-size: 18px; }
          .cta { width: 100%; padding-left: 16px; padding-right: 16px; }
        }
      `}</style>
    </main>
  )
}
