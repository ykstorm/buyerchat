'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, useMotionValue, useInView } from 'framer-motion'
import Link from 'next/link'

// Noise texture overlay for depth
function Grain() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.035]" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      backgroundSize: '180px 180px'
    }} />
  )
}

// Marquee strip — scrolling trust signals
function Marquee() {
  const items = ['Honest Concern \u2014 mandatory on every project', 'ALL-IN price \u2014 no hidden charges', 'OTP visit protection \u2014 90 days valid', 'Builder Trust Score \u2014 RERA verified', '50+ projects reviewed', 'Homesty AI earns from builders — not from buyers']
  return (
    <div className="relative overflow-hidden py-3 border-y" style={{ borderColor: 'var(--landing-border)', background: 'var(--landing-bg-subtle)' }}>
      <motion.div
        className="flex gap-12 whitespace-nowrap"
        style={{ willChange: 'transform' }}
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
      >
        {[...items, ...items].map((item, i) => (
          <span key={i} className="text-[11px] font-medium uppercase tracking-[0.15em]" style={{ color: 'var(--landing-text-muted)', minWidth: 'max-content' }}>
            {i % 2 === 0 ? '\u25C6' : '\u00B7'} {item}
          </span>
        ))}
      </motion.div>
    </div>
  )
}

// Cursor follower — RAF-throttled to avoid layout thrash
function CursorGlow() {
  const [pos, setPos] = useState({ x: -200, y: -200 })
  const rafRef = useRef(0)
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (rafRef.current) return
      const cx = e.clientX, cy = e.clientY
      rafRef.current = requestAnimationFrame(() => {
        setPos({ x: cx, y: cy })
        rafRef.current = 0
      })
    }
    window.addEventListener('mousemove', h, { passive: true })
    return () => {
      window.removeEventListener('mousemove', h)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])
  return (
    <div className="pointer-events-none fixed z-0" style={{
      left: pos.x - 200, top: pos.y - 200, width: 400, height: 400,
      background: 'radial-gradient(circle, rgba(184,146,74,0.07) 0%, transparent 70%)',
      borderRadius: '50%', willChange: 'transform', transform: 'translateZ(0)',
      transition: 'left 0.15s ease, top 0.15s ease'
    }} />
  )
}

// Section reveal
function Reveal({ children, className = '', delay = 0, style = {} }: { children: React.ReactNode; className?: string; delay?: number; style?: React.CSSProperties }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div ref={ref} className={className} style={style}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94], delay }}
    >
      {children}
    </motion.div>
  )
}

// Split text animation character by character
function SplitText({ text, className = '', delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <span className={className}>
      {text.split('').map((char, i) => (
        <motion.span key={i} className="inline-block"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: delay + i * 0.02, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </span>
  )
}

// Horizontal scroll project preview
function ProjectPreview({ projects }: { projects: { name: string; area: string; price: string; tag: string }[] }) {
  return (
    <div className="flex gap-5 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide">
      {projects.map((p, i) => (
        <Link key={i} href="/chat" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <motion.div
            whileHover={{ y: -4, borderColor: 'var(--landing-accent)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{ width: '200px', padding: '24px 20px', borderRadius: '16px', background: 'var(--landing-bg-card)', border: '1px solid var(--landing-border)', cursor: 'pointer', transition: 'border-color 300ms' }}
          >
            <div style={{ width: '32px', height: '2px', background: 'var(--landing-accent)', marginBottom: '16px', borderRadius: '1px' }} />
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--landing-text-primary)', marginBottom: '4px', fontFamily: 'var(--font-landing-display)' }}>{p.name}</p>
            <p style={{ fontSize: '11px', color: 'var(--landing-text-muted)', marginBottom: '12px' }}>{p.area}</p>
            <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--landing-accent)', fontFamily: 'var(--font-mono, monospace)' }}>{p.price}</p>
            <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--landing-text-muted)', textTransform: 'uppercase' as const }}>{p.tag}</span>
          </motion.div>
        </Link>
      ))}
      <Link href="/projects" style={{ textDecoration: 'none', flexShrink: 0 }}>
        <motion.div
          whileHover={{ y: -4 }}
          style={{ width: '200px', padding: '24px 20px', borderRadius: '16px', border: '1px dashed var(--landing-border)', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '8px', height: '100%' }}
        >
          <p style={{ fontSize: '11px', color: 'var(--landing-text-muted)', textAlign: 'center' }}>View all 50+ verified projects &rarr;</p>
        </motion.div>
      </Link>
    </div>
  )
}

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    // Check system preference or saved preference
    const saved = typeof window !== 'undefined' ? window.localStorage?.getItem('homesty-theme') : null
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDark(true)
      document.documentElement.setAttribute('data-theme', 'dark')
    }
    const h = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    try { window.localStorage.setItem('homesty-theme', next ? 'dark' : 'light') } catch {}
  }

  const sampleProjects = [
    { name: 'Riviera Springs', area: 'Shela', price: '\u20B96,000/sqft', tag: 'Strong Buy' },
    { name: 'Riviera Bliss', area: 'Shela', price: '\u20B95,800/sqft', tag: 'Buy w/ Cond' },
    { name: 'Vishwanath Sarathya', area: 'South Bopal', price: '\u20B95,200/sqft', tag: 'Strong Buy' },
  ]

  const pillars = [
    { label: 'I', title: 'Honest Concern', body: 'Every project comes with a mandatory flaw disclosure. The thing brokers never say \u2014 we say first.' },
    { label: 'II', title: 'ALL-IN Price', body: 'Base rate, GST, Stamp Duty, charges \u2014 one final number. No surprises at registration.' },
    { label: 'III', title: 'Builder Trust Score', body: 'RERA data, delivery history, active complaints \u2014 distilled into a single verified score.' },
    { label: 'IV', title: 'OTP Protection', body: 'Your visit token protects your commission relationship. 90 days. Non-transferable.' },
  ]

  return (
    <>
      {/* Landing-scope CSS tokens (--landing-*) live in globals.css so the
          pre-hydration theme script covers them — prevents dark-mode FOUC. */}
      <div style={{ background: 'var(--landing-bg)', color: 'var(--landing-text-primary)', fontFamily: 'var(--font-landing-body)', transition: 'background-color 400ms ease, color 400ms ease' }}>
        <Grain />
        <CursorGlow />

        {/* \u2500\u2500 NAVBAR \u2500\u2500 */}
        <motion.header
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
            background: scrolled ? (dark ? 'rgba(14,12,10,0.92)' : 'rgba(247,245,242,0.92)') : 'transparent',
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            borderBottom: scrolled ? '1px solid var(--landing-border)' : 'none',
            transition: 'all 300ms ease',
            padding: '0 24px',
          }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span style={{ fontFamily: 'var(--font-landing-display)', fontSize: '22px', fontWeight: 600, color: 'var(--landing-text-primary)', letterSpacing: '-0.01em' }}>Homesty</span>
              <span style={{ fontFamily: 'var(--font-landing-body)', fontSize: '11px', color: 'var(--landing-accent)', fontWeight: 500 }}>.ai</span>
            </Link>
            <nav style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
              <Link href="/projects" className="hidden sm:inline" style={{ fontFamily: 'var(--font-landing-body)', fontSize: '13px', color: 'var(--landing-text-secondary)', textDecoration: 'none', letterSpacing: '0.02em', transition: 'color 200ms' }}>Projects</Link>
              <a href="#philosophy" className="hidden sm:inline" style={{ fontFamily: 'var(--font-landing-body)', fontSize: '13px', color: 'var(--landing-text-secondary)', textDecoration: 'none', letterSpacing: '0.02em', transition: 'color 200ms' }}>Philosophy</a>
              {/* Dark mode toggle */}
              <button onClick={toggleDark} style={{ width: '36px', height: '20px', borderRadius: '10px', background: dark ? 'var(--landing-accent)' : 'var(--landing-border)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 300ms' }}>
                <motion.div animate={{ x: dark ? 18 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  style={{ width: '16px', height: '16px', borderRadius: '50%', background: dark ? '#0E0C0A' : '#F7F5F2', position: 'absolute', top: '2px' }} />
              </button>
              <Link href="/chat">
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  style={{ fontFamily: 'var(--font-landing-body)', fontSize: '13px', fontWeight: 500, color: 'var(--landing-bg)', background: 'var(--landing-text-primary)', padding: '9px 22px', borderRadius: '4px', border: 'none', cursor: 'pointer', letterSpacing: '0.03em', transition: 'background 300ms' }}
                >
                  Begin &rarr;
                </motion.button>
              </Link>
            </nav>
          </div>
        </motion.header>

        {/* \u2500\u2500 HERO \u2500\u2500 */}
        <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '120px 24px 80px', position: 'relative', overflow: 'hidden' }}>
          {/* Diagonal line decoration */}
          <div style={{ position: 'absolute', top: 0, right: '15%', width: '1px', height: '100%', background: 'linear-gradient(180deg, transparent, var(--landing-border), transparent)', opacity: 0.5 }} />
          <div style={{ position: 'absolute', top: 0, right: '30%', width: '1px', height: '60%', background: 'linear-gradient(180deg, transparent, var(--landing-accent), transparent)', opacity: 0.15 }} />

          <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            {/* Eyebrow */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
              <div style={{ width: '40px', height: '1px', background: 'var(--landing-accent)' }} />
              <span style={{ fontFamily: 'var(--font-landing-body)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.2em', color: 'var(--landing-accent)', textTransform: 'uppercase' as const }}>South Bopal &amp; Shela &middot; Ahmedabad</span>
            </motion.div>

            {/* Main headline */}
            <div style={{ marginBottom: '40px' }}>
              <h1 style={{ fontFamily: 'var(--font-landing-display)', fontSize: 'clamp(52px, 8vw, 110px)', fontWeight: 600, lineHeight: 0.95, letterSpacing: '-0.03em', color: 'var(--landing-text-primary)' }}>
                <SplitText text="Honesty" delay={0.2} />
                <br />
                <span style={{ fontStyle: 'italic', color: 'var(--landing-accent)' }}>
                  <SplitText text="is rare." delay={0.5} />
                </span>
              </h1>
            </div>

            {/* Subline + CTA */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '32px' }}>
              <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.9 }}
                style={{ fontFamily: 'var(--font-landing-body)', fontSize: 'clamp(15px, 2vw, 18px)', color: 'var(--landing-text-secondary)', lineHeight: 1.7, maxWidth: '440px', fontWeight: 300 }}
              >
                South Bopal and Shela&apos;s first honest property advisor. Every project&apos;s real flaw &mdash; disclosed. Every price &mdash; all-in. Every visit &mdash; OTP protected.
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1.1 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start' }}
              >
                <Link href="/chat">
                  <motion.button whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}
                    style={{ fontFamily: 'var(--font-landing-body)', fontSize: '15px', fontWeight: 500, color: 'var(--landing-bg)', background: 'var(--landing-text-primary)', padding: '14px 36px', borderRadius: '4px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '0.02em' }}
                  >
                    Find your home
                    <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>&rarr;</motion.span>
                  </motion.button>
                </Link>
                <Link href="/projects" style={{ fontFamily: 'var(--font-landing-body)', fontSize: '12px', color: 'var(--landing-text-muted)', textDecoration: 'none', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '20px', height: '1px', background: 'var(--landing-text-muted)', display: 'inline-block' }} />
                  Browse 50+ projects
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {/* \u2500\u2500 MARQUEE \u2500\u2500 */}
        <Marquee />

        {/* \u2500\u2500 PROJECT PREVIEW \u2500\u2500 */}
        <section style={{ padding: '80px 24px', background: 'var(--landing-bg-subtle)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <Reveal style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ fontFamily: 'var(--font-landing-display)', fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 600, color: 'var(--landing-text-primary)', letterSpacing: '-0.02em' }}>
                Shortlisted for you
              </h2>
              <Link href="/projects" style={{ fontFamily: 'var(--font-landing-body)', fontSize: '12px', color: 'var(--landing-accent)', textDecoration: 'none', letterSpacing: '0.05em' }}>View all &rarr;</Link>
            </Reveal>
            <ProjectPreview projects={sampleProjects} />
          </div>
        </section>

        {/* \u2500\u2500 PHILOSOPHY \u2500\u2500 */}
        <section id="philosophy" style={{ padding: '120px 24px', background: 'var(--landing-bg)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <Reveal style={{ marginBottom: '80px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ width: '40px', height: '1px', background: 'var(--landing-accent)' }} />
                <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.2em', color: 'var(--landing-accent)', textTransform: 'uppercase' as const }}>Our Philosophy</span>
              </div>
              <h2 style={{ fontFamily: 'var(--font-landing-display)', fontSize: 'clamp(32px, 4vw, 56px)', fontWeight: 600, color: 'var(--landing-text-primary)', lineHeight: 1.1, letterSpacing: '-0.02em', maxWidth: '700px' }}>
                Built for buyers.<br />
                <span style={{ fontStyle: 'italic', color: 'var(--landing-text-secondary)' }}>Not builders.</span>
              </h2>
            </Reveal>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2px' }}>
              {pillars.map((p, i) => (
                <Reveal key={p.label} delay={i * 0.1}>
                  <motion.div whileHover={{ background: 'var(--landing-bg-subtle)' }}
                    style={{ padding: '40px 32px', border: '1px solid var(--landing-border)', cursor: 'default', transition: 'background 300ms' }}
                  >
                    <p style={{ fontFamily: 'var(--font-landing-display)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.2em', color: 'var(--landing-accent)', marginBottom: '20px', textTransform: 'uppercase' as const }}>{p.label}</p>
                    <p style={{ fontFamily: 'var(--font-landing-display)', fontSize: '22px', fontWeight: 600, color: 'var(--landing-text-primary)', marginBottom: '12px', letterSpacing: '-0.01em' }}>{p.title}</p>
                    <p style={{ fontFamily: 'var(--font-landing-body)', fontSize: '14px', color: 'var(--landing-text-secondary)', lineHeight: 1.75, fontWeight: 300 }}>{p.body}</p>
                  </motion.div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* \u2500\u2500 HONEST CONCERN EXAMPLE \u2500\u2500 */}
        <section style={{ padding: '80px 24px', background: 'var(--landing-bg-subtle)' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Reveal>
              <div style={{ padding: '48px', border: '1px solid var(--landing-border)', borderLeft: '3px solid var(--landing-accent)', background: 'var(--landing-bg-card)' }}>
                <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.2em', color: 'var(--landing-accent)', textTransform: 'uppercase' as const, marginBottom: '20px' }}>{'\u26A0'} Honest Concern &mdash; Example Disclosure</p>
                <blockquote style={{ fontFamily: 'var(--font-landing-display)', fontSize: 'clamp(17px, 2.5vw, 22px)', fontWeight: 400, color: 'var(--landing-text-primary)', lineHeight: 1.65, fontStyle: 'italic', marginBottom: '24px' }}>
                  &ldquo;Only 3 units remaining. Dec 2026 OC timeline needs independent verification. One active RERA complaint filed Oct 2025. Builder&apos;s track record shows 2 delayed projects &mdash; request a written possession commitment before booking.&rdquo;
                </blockquote>
                <p style={{ fontSize: '12px', color: 'var(--landing-text-muted)', letterSpacing: '0.05em' }}>This is what we tell every buyer &mdash; before they visit.</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* \u2500\u2500 FOUNDER \u2500\u2500 */}
        <section style={{ padding: '120px 24px', background: 'var(--landing-bg)' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
            <Reveal>
              <div style={{ width: '1px', height: '60px', background: 'linear-gradient(180deg, transparent, var(--landing-accent))', margin: '0 auto 40px' }} />
              <blockquote style={{ fontFamily: 'var(--font-landing-display)', fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 500, fontStyle: 'italic', color: 'var(--landing-text-primary)', lineHeight: 1.5, marginBottom: '32px' }}>
                &ldquo;I will tell you the real problem with every project &mdash; even if that means you buy nothing from me.&rdquo;
              </blockquote>
              <p style={{ fontFamily: 'var(--font-landing-body)', fontSize: '12px', letterSpacing: '0.1em', color: 'var(--landing-text-muted)', textTransform: 'uppercase' as const }}>Balvir Singh &middot; Founder, Homesty.ai &middot; Ahmedabad</p>
            </Reveal>
          </div>
        </section>

        {/* \u2500\u2500 CTA \u2500\u2500 */}
        <section style={{ padding: '120px 24px', background: 'var(--landing-text-primary)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`, backgroundSize: '180px' }} />
          <Reveal className="text-center" style={{ maxWidth: '600px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontFamily: 'var(--font-landing-display)', fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 600, color: 'var(--landing-bg)', lineHeight: 1.05, letterSpacing: '-0.03em', marginBottom: '24px' }}>
              Ready for your honest answer?
            </h2>
            <p style={{ fontFamily: 'var(--font-landing-body)', fontSize: '16px', color: dark ? 'rgba(237,232,227,0.55)' : 'rgba(247,245,242,0.55)', lineHeight: 1.7, marginBottom: '44px', fontWeight: 300 }}>
              50+ verified projects. No platform fee. Commission only when you close.
            </p>
            <Link href="/chat">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                style={{ fontFamily: 'var(--font-landing-body)', fontSize: '15px', fontWeight: 500, color: 'var(--landing-text-primary)', background: 'var(--landing-bg)', padding: '16px 48px', borderRadius: '4px', border: 'none', cursor: 'pointer', letterSpacing: '0.03em', transition: 'background 300ms, color 300ms', display: 'inline-flex', alignItems: 'center', gap: '10px' }}
              >
                Begin your search
                <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.8, repeat: Infinity }}>&rarr;</motion.span>
              </motion.button>
            </Link>
          </Reveal>
        </section>

        {/* \u2500\u2500 FOOTER \u2500\u2500 */}
        <footer style={{ padding: '32px 24px', background: 'var(--landing-text-primary)', borderTop: dark ? '1px solid rgba(237,232,227,0.08)' : '1px solid rgba(247,245,242,0.08)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <span style={{ fontFamily: 'var(--font-landing-display)', fontSize: '14px', fontWeight: 600, color: dark ? 'rgba(237,232,227,0.4)' : 'rgba(247,245,242,0.4)' }}>Homesty.ai</span>
            <div style={{ display: 'flex', gap: '24px' }}>
              {[{ label: 'Chat', href: '/chat' }, { label: 'Projects', href: '/projects' }, { label: 'Philosophy', href: '#philosophy' }].map(l => (
                <Link key={l.label} href={l.href} style={{ fontFamily: 'var(--font-landing-body)', fontSize: '12px', color: dark ? 'rgba(237,232,227,0.3)' : 'rgba(247,245,242,0.3)', textDecoration: 'none', letterSpacing: '0.05em', transition: 'color 200ms' }}>{l.label}</Link>
              ))}
            </div>
            <span style={{ fontFamily: 'var(--font-landing-body)', fontSize: '11px', color: dark ? 'rgba(237,232,227,0.2)' : 'rgba(247,245,242,0.2)' }}>&copy; 2026 Homesty AI Technology LLP</span>
          </div>
        </footer>
      </div>
    </>
  )
}
