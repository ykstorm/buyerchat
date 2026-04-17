'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACETERNITY PATTERNS (native implementation)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Background Beams — animated diagonal beams
function BackgroundBeams() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-px opacity-20"
          style={{
            background: 'linear-gradient(90deg, transparent, #3de8a0, transparent)',
            width: '60%',
            top: `${15 + i * 15}%`,
            left: `-${10 + i * 5}%`,
            rotate: -35,
          }}
          animate={{ x: ['0%', '200%'] }}
          transition={{ duration: 8 + i * 2, repeat: Infinity, ease: 'linear', delay: i * 1.5 }}
        />
      ))}
    </div>
  )
}

// Spotlight — mouse following radial glow
function Spotlight({ className }: { className?: string }) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springX = useSpring(mouseX, { stiffness: 80, damping: 20 })
  const springY = useSpring(mouseY, { stiffness: 80, damping: 20 })

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }
    window.addEventListener('mousemove', handle)
    return () => window.removeEventListener('mousemove', handle)
  }, [])

  return (
    <motion.div
      className={`pointer-events-none fixed inset-0 z-10 ${className}`}
      style={{
        background: useTransform(
          [springX, springY],
          ([x, y]) => `radial-gradient(600px at ${x}px ${y}px, rgba(61,232,160,0.04), transparent 60%)`
        )
      }}
    />
  )
}

// Text Reveal — word by word animation
function TextReveal({ text, className }: { text: string; className?: string }) {
  const words = text.split(' ')
  return (
    <span className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block mr-[0.25em]"
          initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  )
}

// Moving Border — conic gradient rotation on CTA
function MovingBorder({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative p-[1px] rounded-full overflow-hidden">
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: 'conic-gradient(from 0deg, #1B4F8A, #3de8a0, #1B4F8A, #2563EB, #1B4F8A)' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      />
      <div className="relative">{children}</div>
    </div>
  )
}

// Floating Card — 3D tilt on hover
function FloatingCard({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useTransform(y, [-50, 50], [5, -5])
  const rotateY = useTransform(x, [-50, 50], [-5, 5])

  return (
    <motion.div
      className={className}
      style={{ ...style, rotateX, rotateY, transformStyle: 'preserve-3d' }}
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect()
        x.set(e.clientX - rect.left - rect.width / 2)
        y.set(e.clientY - rect.top - rect.height / 2)
      }}
      onMouseLeave={() => { x.set(0); y.set(0) }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {children}
    </motion.div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN LANDING PAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function HomePage() {
  const [scrolled, setScrolled] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef })
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '20%'])

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handle)
    return () => window.removeEventListener('scroll', handle)
  }, [])

  const stats = [
    { value: '118', label: 'Buyers advised', suffix: '+' },
    { value: '16', label: 'Verified projects', suffix: '' },
    { value: '100', label: 'Commission on close', suffix: '%', prefix: '1.5%' },
    { value: '0', label: 'Builder ads, ever', suffix: '' },
  ]

  const features = [
    {
      icon: '\u26A0',
      title: 'Honest Concern',
      desc: 'Every project comes with a mandatory flaw disclosure. We tell you what brokers hide.',
      color: '#F59E0B',
    },
    {
      icon: '\u20B9',
      title: 'ALL-IN Price',
      desc: 'Base price + GST + Stamp Duty + all charges \u2014 one number. No surprise costs at registration.',
      color: '#3de8a0',
    },
    {
      icon: '\uD83D\uDD10',
      title: 'OTP Commission Protection',
      desc: 'Your visit token protects your relationship. Valid 90 days. Builder cannot claim you walked in.',
      color: '#60A5FA',
    },
  ]

  const howItWorks = [
    { step: '01', title: 'Tell us your needs', desc: 'Budget, BHK, family or investment \u2014 the AI asks what matters.' },
    { step: '02', title: 'Get honest advice', desc: 'Projects shortlisted with real concerns, trust scores, and ALL-IN prices.' },
    { step: '03', title: 'Visit with OTP', desc: 'Book a site visit. Token generated. Commission protected. Balvir accompanies.' },
  ]

  return (
    <div style={{ background: '#09090b', color: '#e0e0ea', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <Spotlight />

      {/* -- NAVBAR -- */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
        style={{
          background: scrolled ? 'rgba(9,9,11,0.9)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        }}
        animate={{ y: 0 }}
        initial={{ y: -20, opacity: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 700, color: '#3de8a0' }}>Homesty</span>
          <span style={{ fontSize: '11px', color: '#636380', marginTop: '2px' }}>.ai</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/projects" style={{ color: '#9CA3AF', fontSize: '13px', textDecoration: 'none' }} className="hover:text-white transition-colors hidden sm:block">Projects</Link>
          <Link href="/chat">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              style={{ background: '#1B4F8A', color: 'white', padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
            >
              Start chat &rarr;
            </motion.button>
          </Link>
        </div>
      </motion.nav>

      {/* -- HERO -- */}
      <div ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden" style={{ paddingTop: '80px' }}>
        <BackgroundBeams />

        {/* Ambient glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #1B4F8A, transparent)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full opacity-[0.08] pointer-events-none" style={{ background: 'radial-gradient(circle, #3de8a0, transparent)', filter: 'blur(100px)' }} />

        <motion.div
          className="relative z-20 text-center max-w-4xl mx-auto"
          style={{ opacity: heroOpacity, y: heroY }}
        >
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
            style={{ background: 'rgba(61,232,160,0.08)', border: '1px solid rgba(61,232,160,0.2)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#3de8a0' }} />
            <span style={{ color: '#3de8a0', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em' }}>SOUTH BOPAL &amp; SHELA &middot; AHMEDABAD</span>
          </motion.div>

          {/* Main headline */}
          <h1 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 700, lineHeight: 1.1, marginBottom: '24px', color: '#F5F5F0' }}>
            <TextReveal text="Honesty is rare." />
            <br />
            <span style={{ color: '#3de8a0' }}>
              <TextReveal text="It comes with Homesty." />
            </span>
          </h1>

          {/* Subline */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            style={{ color: '#9CA3AF', fontSize: 'clamp(15px, 2vw, 18px)', lineHeight: 1.6, maxWidth: '560px', margin: '0 auto 40px' }}
          >
            South Bopal aur Shela ka pehla honest property advisor. Har project ki asli problem bata dete hain &mdash; broker ki tarah nahi.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/chat">
              <MovingBorder>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  style={{ background: '#09090b', color: '#F5F5F0', padding: '14px 36px', borderRadius: '20px', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  Find my home
                  <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>&rarr;</motion.span>
                </motion.button>
              </MovingBorder>
            </Link>
            <Link href="/projects" style={{ textDecoration: 'none' }}>
              <motion.button
                whileHover={{ scale: 1.02, borderColor: 'rgba(255,255,255,0.2)' }}
                whileTap={{ scale: 0.97 }}
                style={{ background: 'transparent', color: '#9CA3AF', padding: '14px 36px', borderRadius: '20px', fontSize: '15px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
              >
                Browse projects
              </motion.button>
            </Link>
          </motion.div>

          {/* Trust stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.3 }}
            className="flex flex-wrap justify-center gap-8 mt-16"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 + i * 0.1 }}
                className="text-center"
              >
                <p style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: 700, color: '#F5F5F0' }}>
                  {stat.prefix ?? stat.value}{stat.suffix}
                </p>
                <p style={{ color: '#636380', fontSize: '11px', letterSpacing: '0.06em', marginTop: '4px' }}>{stat.label.toUpperCase()}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ color: '#454560', fontSize: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
        >
          <span>scroll</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
        </motion.div>
      </div>

      {/* -- HOW IT WORKS (warm paper section) -- */}
      <section style={{ background: '#FAFAF8', padding: '100px 24px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p style={{ color: '#A8A29E', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', marginBottom: '12px' }}>HOW IT WORKS</p>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, color: '#1C1917', lineHeight: 1.2 }}>
              Three steps to your honest decision
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {howItWorks.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                style={{ padding: '32px', borderRadius: '20px', background: 'white', border: '1px solid #E7E5E4', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}
              >
                <p style={{ fontFamily: 'Georgia, serif', fontSize: '48px', fontWeight: 700, color: '#F4F3F0', marginBottom: '16px', lineHeight: 1 }}>{item.step}</p>
                <p style={{ fontSize: '17px', fontWeight: 600, color: '#1C1917', marginBottom: '8px' }}>{item.title}</p>
                <p style={{ fontSize: '14px', color: '#78716C', lineHeight: 1.6 }}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* -- WHY HOMESTY (dark section with 3D cards) -- */}
      <section style={{ background: '#0D0D10', padding: '100px 24px' }}>
        <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p style={{ color: '#454560', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', marginBottom: '12px' }}>WHY HOMESTY</p>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, color: '#F5F5F0', lineHeight: 1.2 }}>
              Built for buyers. Not builders.
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
              >
                <FloatingCard
                  style={{
                    padding: '32px',
                    borderRadius: '20px',
                    background: '#111116',
                    border: '1px solid rgba(255,255,255,0.06)',
                    height: '100%',
                  }}
                >
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${f.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '20px', border: `1px solid ${f.color}25` }}>
                    {f.icon}
                  </div>
                  <p style={{ fontSize: '17px', fontWeight: 600, color: '#F5F5F0', marginBottom: '10px' }}>{f.title}</p>
                  <p style={{ fontSize: '14px', color: '#636380', lineHeight: 1.65 }}>{f.desc}</p>
                </FloatingCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* -- HONEST SECTION (warm) -- */}
      <section style={{ background: '#FAFAF8', padding: '100px 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p style={{ color: '#A8A29E', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', marginBottom: '16px' }}>OUR PROMISE</p>
            <blockquote style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 500, color: '#1C1917', lineHeight: 1.4, marginBottom: '32px' }}>
              &ldquo;We will tell you the real problem with every project &mdash; even if it means you buy nothing.&rdquo;
            </blockquote>
            <p style={{ color: '#78716C', fontSize: '14px' }}>&mdash; Balvir Rao, Founder, Homesty.ai</p>
          </motion.div>

          {/* Honest Concern example card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            style={{ marginTop: '48px', padding: '24px', borderRadius: '16px', background: '#FEF3C7', border: '1px solid #FDE68A', textAlign: 'left' }}
          >
            <p style={{ fontSize: '10px', fontWeight: 700, color: '#92400E', letterSpacing: '0.1em', marginBottom: '6px' }}>{'\u26A0'} HONEST CONCERN &mdash; EXAMPLE</p>
            <p style={{ fontSize: '14px', color: '#78350F', lineHeight: 1.6 }}>
              &ldquo;Only 3 units remaining. Dec 2026 OC timeline must be independently verified. 1 active RERA complaint (Oct 2025). Builder has 2 delayed projects in portfolio &mdash; ask for written possession commitment.&rdquo;
            </p>
          </motion.div>
        </div>
      </section>

      {/* -- FINAL CTA (dark) -- */}
      <section style={{ background: '#09090b', padding: '120px 24px', position: 'relative', overflow: 'hidden' }}>
        <BackgroundBeams />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(27,79,138,0.15), transparent 70%)' }} />
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 10 }}
        >
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 700, color: '#F5F5F0', lineHeight: 1.15, marginBottom: '20px' }}>
            Ready for your honest answer?
          </h2>
          <p style={{ color: '#636380', fontSize: '16px', lineHeight: 1.6, marginBottom: '40px' }}>
            South Bopal aur Shela mein 16 verified projects. Koi bhi fees nahi. Commission sirf deal close pe.
          </p>
          <Link href="/chat">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              style={{ background: 'linear-gradient(135deg, #1B4F8A, #2563EB)', color: 'white', padding: '16px 48px', borderRadius: '28px', fontSize: '16px', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 32px rgba(27,79,138,0.3)' }}
            >
              Shuru karo
              <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>&rarr;</motion.span>
            </motion.button>
          </Link>
          <p style={{ color: '#454560', fontSize: '12px', marginTop: '16px' }}>Free &middot; No signup required &middot; OTP verified visits</p>
        </motion.div>
      </section>

      {/* -- FOOTER -- */}
      <footer style={{ background: '#09090b', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 24px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '16px', fontWeight: 700, color: '#3de8a0' }}>Homesty</span>
            <span style={{ fontSize: '11px', color: '#454560' }}>.ai</span>
          </div>
          <div className="flex gap-6">
            <Link href="/chat" style={{ color: '#636380', fontSize: '12px', textDecoration: 'none' }} className="hover:text-white transition-colors">Chat</Link>
            <Link href="/projects" style={{ color: '#636380', fontSize: '12px', textDecoration: 'none' }} className="hover:text-white transition-colors">Projects</Link>
            <Link href="/admin" style={{ color: '#636380', fontSize: '12px', textDecoration: 'none' }} className="hover:text-white transition-colors">Admin</Link>
          </div>
          <p style={{ color: '#454560', fontSize: '11px' }}>&copy; 2026 Homesty AI Technology LLP &middot; South Bopal &amp; Shela, Ahmedabad</p>
        </div>
      </footer>
    </div>
  )
}
