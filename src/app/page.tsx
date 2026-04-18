'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring, AnimatePresence, useInView } from 'framer-motion'
import Link from 'next/link'
// ── ACETERNITY PATTERNS (pure Framer Motion, no npm) ──
// Spotlight cursor follow
function Spotlight() {
  const mouseX = useMotionValue(typeof window !== 'undefined' ? window.innerWidth / 2 : 0)
  const mouseY = useMotionValue(typeof window !== 'undefined' ? window.innerHeight / 2 : 0)
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 })
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 })
  const [pos, setPos] = useState({ x: 0, y: 0 })
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }
    window.addEventListener('mousemove', handle)
    const unsub = springX.on('change', x => setPos(p => ({ ...p, x })))
    const unsub2 = springY.on('change', y => setPos(p => ({ ...p, y: y })))
    return () => { window.removeEventListener('mousemove', handle); unsub(); unsub2() }
  }, [])
  return (
    <div className="pointer-events-none fixed inset-0 z-10" style={{
      background: `radial-gradient(500px at ${pos.x}px ${pos.y}px, rgba(61,232,160,0.05), transparent 60%)`
    }} />
  )
}
// Animated beam line
function Beam({ delay = 0, top = '20%', opacity = 0.15 }: { delay?: number; top?: string; opacity?: number }) {
  return (
    <motion.div
      className="absolute h-px pointer-events-none"
      style={{ top, left: '-20%', width: '140%', background: 'linear-gradient(90deg, transparent 0%, rgba(61,232,160,0.6) 50%, transparent 100%)', opacity }}
      initial={{ x: '-100%' }}
      animate={{ x: '100%' }}
      transition={{ duration: 6, repeat: Infinity, ease: 'linear', delay }}
    />
  )
}
// Fade in on scroll
function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay }}
    >
      {children}
    </motion.div>
  )
}
// Magnetic button effect
function MagneticButton({ children, href, className = '', style = {} }: { children: React.ReactNode; href: string; className?: string; style?: React.CSSProperties }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 500, damping: 30 })
  const springY = useSpring(y, { stiffness: 500, damping: 30 })
  return (
    <Link href={href}>
      <motion.button
        style={{ x: springX, y: springY, ...style }}
        className={className}
        onMouseMove={e => {
          const rect = e.currentTarget.getBoundingClientRect()
          const cx = rect.left + rect.width / 2
          const cy = rect.top + rect.height / 2
          x.set((e.clientX - cx) * 0.3)
          y.set((e.clientY - cy) * 0.3)
        }}
        onMouseLeave={() => { x.set(0); y.set(0) }}
        whileTap={{ scale: 0.96 }}
      >
        {children}
      </motion.button>
    </Link>
  )
}
// Floating 3D card
function Card3D({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const rotX = useSpring(0, { stiffness: 300, damping: 30 })
  const rotY = useSpring(0, { stiffness: 300, damping: 30 })
  return (
    <motion.div
      className={className}
      style={{ rotateX: rotX, rotateY: rotY, transformStyle: 'preserve-3d' }}
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect()
        const px = (e.clientX - rect.left) / rect.width - 0.5
        const py = (e.clientY - rect.top) / rect.height - 0.5
        rotY.set(px * 8)
        rotX.set(-py * 8)
      }}
      onMouseLeave={() => { rotX.set(0); rotY.set(0) }}
    >
      {children}
    </motion.div>
  )
}
// ── MAIN PAGE ──
export default function HomePage() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', handle, { passive: true })
    return () => window.removeEventListener('scroll', handle)
  }, [])
  const stats = [
    { value: '50+', label: 'Projects verified' },
    { value: '\u20B90', label: 'Platform fee' },
    { value: '1.5%', label: 'Commission on close' },
    { value: '100%', label: 'Buyer side only' },
  ]
  const pillars = [
    {
      icon: '\u26A0',
      title: 'Honest Concern',
      desc: 'Har project ki asli problem batate hain. Jo broker chhupaate hain, hum dikhate hain.',
      accent: '#F59E0B',
    },
    {
      icon: '\u20B9',
      title: 'ALL-IN Price',
      desc: 'Base + GST + Stamp Duty + all charges \u2014 ek number mein. Koi hidden cost nahi.',
      accent: '#3de8a0',
    },
    {
      icon: '\uD83D\uDD10',
      title: 'OTP Visit Protection',
      desc: 'Site visit ke liye OTP token. 90 days valid. Commission protect hoti hai automatically.',
      accent: '#60A5FA',
    },
    {
      icon: '\uD83C\uDFD7',
      title: 'Builder Trust Score',
      desc: 'RERA data + delivery history + complaints \u2014 ek score mein. Koi guesswork nahi.',
      accent: '#A78BFA',
    },
  ]
  const steps = [
    { n: '01', title: 'Chat karo', desc: 'Budget, BHK, family ya investment \u2014 AI samajhta hai. Hinglish mein baat karo.' },
    { n: '02', title: 'Honest advice pao', desc: 'Trust score, ALL-IN price, aur mandatory flaw disclosure \u2014 sabke saath.' },
    { n: '03', title: 'OTP se visit karo', desc: 'Token generate hota hai. Commission protect hoti hai. Balvir saath aate hain.' },
  ]
  return (
    <div style={{ background: '#09090b', color: '#e0e0ea', overflowX: 'hidden' }}>
      <Spotlight />
      {/* \u2500\u2500 NAVBAR \u2500\u2500 */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-50"
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }}
        style={{
          background: scrolled ? 'rgba(9,9,11,0.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(24px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
          transition: 'background 300ms, border-color 300ms',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" style={{ display: 'flex', alignItems: 'baseline', gap: '2px', textDecoration: 'none' }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 700, color: '#3de8a0', letterSpacing: '-0.02em' }}>Homesty</span>
            <span style={{ fontSize: '12px', color: '#454560', fontWeight: 400 }}>.ai</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-8">
            <Link href="/projects" style={{ color: '#636380', fontSize: '13px', textDecoration: 'none', transition: 'color 200ms' }} className="hover:text-white">Projects</Link>
            <a href="#how" style={{ color: '#636380', fontSize: '13px', textDecoration: 'none', transition: 'color 200ms' }} className="hover:text-white">How it works</a>
          </nav>
          <MagneticButton href="/chat"
            style={{ background: 'linear-gradient(135deg, #1B4F8A, #2563EB)', color: 'white', padding: '9px 22px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
          >
            Chat karo &rarr;
          </MagneticButton>
        </div>
      </motion.header>
      {/* \u2500\u2500 HERO \u2500\u2500 */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ paddingTop: '80px' }}>
        {/* Background beams */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Beam delay={0} top="25%" opacity={0.12} />
          <Beam delay={2} top="45%" opacity={0.08} />
          <Beam delay={4} top="65%" opacity={0.1} />
          {/* Ambient glows */}
          <div className="absolute top-1/3 left-1/3 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(27,79,138,0.2), transparent)', filter: 'blur(60px)' }} />
          <div className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(61,232,160,0.1), transparent)', filter: 'blur(80px)' }} />
        </div>
        <div className="relative z-20 max-w-3xl mx-auto">
          {/* Pill badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-10"
            style={{ background: 'rgba(61,232,160,0.08)', border: '1px solid rgba(61,232,160,0.18)' }}
          >
            <motion.span className="w-1.5 h-1.5 rounded-full" style={{ background: '#3de8a0' }}
              animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
            <span style={{ color: '#3de8a0', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em' }}>SOUTH BOPAL &amp; SHELA &middot; AHMEDABAD</span>
          </motion.div>
          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.3 }}
            style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 'clamp(38px, 6vw, 72px)', fontWeight: 700, lineHeight: 1.08, marginBottom: '20px', color: '#F5F5F0', letterSpacing: '-0.02em' }}
          >
            Honesty is rare.
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #3de8a0, #60A5FA)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              It comes with Homesty.
            </span>
          </motion.h1>
          {/* Subline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.45 }}
            style={{ color: '#9CA3AF', fontSize: 'clamp(15px, 2vw, 18px)', lineHeight: 1.65, maxWidth: '500px', margin: '0 auto 40px' }}
          >
            South Bopal aur Shela ka pehla honest property advisor. Broker nahi &mdash; buyer ki taraf.
          </motion.p>
          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.55 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <MagneticButton href="/chat"
              style={{ background: 'linear-gradient(135deg, #1B4F8A, #2563EB)', color: 'white', padding: '14px 40px', borderRadius: '24px', fontSize: '15px', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 8px 32px rgba(27,79,138,0.35)', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span>Apna ghar dhundho</span>
              <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}>&rarr;</motion.span>
            </MagneticButton>
            <MagneticButton href="/projects"
              style={{ background: 'rgba(255,255,255,0.04)', color: '#9CA3AF', padding: '14px 32px', borderRadius: '24px', fontSize: '14px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
            >
              Projects dekhao
            </MagneticButton>
          </motion.div>
          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-20 max-w-xl mx-auto"
          >
            {stats.map((s, i) => (
              <motion.div key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.85 + i * 0.08 }}
                className="text-center"
              >
                <p style={{ fontFamily: 'Georgia, serif', fontSize: '26px', fontWeight: 700, color: '#F5F5F0', letterSpacing: '-0.02em' }}>{s.value}</p>
                <p style={{ color: '#454560', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', marginTop: '4px' }}>{s.label.toUpperCase()}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
        {/* Scroll cue */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          style={{ color: '#2a2a3a' }}
        >
          <motion.div
            style={{ width: '1px', height: '48px', background: 'linear-gradient(180deg, transparent, #3de8a0)' }}
            animate={{ scaleY: [0, 1, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </section>
      {/* \u2500\u2500 HOW IT WORKS \u2500\u2500 */}
      <section id="how" style={{ background: '#0D0D0F', padding: '120px 24px' }}>
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-16">
            <p style={{ color: '#454560', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', marginBottom: '14px' }}>HOW IT WORKS</p>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 700, color: '#F5F5F0', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
              Teen steps, ek honest decision
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <FadeIn key={s.n} delay={i * 0.12}>
                <Card3D className="h-full">
                  <div style={{ padding: '36px 28px', borderRadius: '20px', background: '#111116', border: '1px solid rgba(255,255,255,0.06)', height: '100%' }}>
                    <p style={{ fontFamily: 'Georgia, serif', fontSize: '52px', fontWeight: 700, color: 'rgba(255,255,255,0.04)', lineHeight: 1, marginBottom: '20px' }}>{s.n}</p>
                    <p style={{ fontSize: '17px', fontWeight: 600, color: '#F5F5F0', marginBottom: '10px' }}>{s.title}</p>
                    <p style={{ fontSize: '14px', color: '#636380', lineHeight: 1.7 }}>{s.desc}</p>
                  </div>
                </Card3D>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
      {/* \u2500\u2500 PILLARS \u2500\u2500 */}
      <section style={{ background: '#09090b', padding: '120px 24px', position: 'relative', overflow: 'hidden' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Beam delay={1} top="30%" opacity={0.07} />
          <Beam delay={3} top="70%" opacity={0.05} />
        </div>
        <div className="max-w-5xl mx-auto relative z-10">
          <FadeIn className="text-center mb-16">
            <p style={{ color: '#454560', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', marginBottom: '14px' }}>WHY HOMESTY</p>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 700, color: '#F5F5F0', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
              Buyers ke liye banaya gaya. Builders ke liye nahi.
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {pillars.map((p, i) => (
              <FadeIn key={p.title} delay={i * 0.1}>
                <Card3D className="h-full">
                  <div style={{ padding: '32px', borderRadius: '20px', background: '#0D0D0F', border: '1px solid rgba(255,255,255,0.06)', height: '100%', transition: 'border-color 300ms' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = `${p.accent}30`)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${p.accent}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', marginBottom: '18px', border: `1px solid ${p.accent}20` }}>
                      {p.icon}
                    </div>
                    <p style={{ fontSize: '16px', fontWeight: 600, color: '#F5F5F0', marginBottom: '8px' }}>{p.title}</p>
                    <p style={{ fontSize: '14px', color: '#636380', lineHeight: 1.7 }}>{p.desc}</p>
                  </div>
                </Card3D>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
      {/* \u2500\u2500 HONEST PROMISE \u2500\u2500 */}
      <section style={{ background: '#0D0D0F', padding: '120px 24px' }}>
        <div className="max-w-3xl mx-auto">
          <FadeIn className="text-center">
            <p style={{ color: '#454560', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', marginBottom: '24px' }}>OUR PROMISE</p>
            <blockquote style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(20px, 3vw, 32px)', fontWeight: 500, color: '#C8C8D0', lineHeight: 1.5, marginBottom: '28px', fontStyle: 'italic' }}>
              &ldquo;Hum aapko har project ki asli problem batayenge &mdash; chahe iska matlab ho ki aap kuch bhi na khareedein.&rdquo;
            </blockquote>
            <p style={{ color: '#454560', fontSize: '13px' }}>&mdash; Balvir Singh, Founder, Homesty.ai</p>
          </FadeIn>
          <FadeIn delay={0.2} className="mt-12">
            <div style={{ padding: '24px 28px', borderRadius: '16px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#F59E0B', letterSpacing: '0.12em', marginBottom: '10px' }}>{'\u26A0'} HONEST CONCERN &mdash; EXAMPLE</p>
              <p style={{ fontSize: '14px', color: '#9CA3AF', lineHeight: 1.7 }}>
                &ldquo;Sirf 3 units bachi hain. Dec 2026 OC timeline independently verify karna zaroori hai. 1 active RERA complaint (Oct 2025). Builder ke portfolio mein 2 delayed projects hain &mdash; likhit possession commitment maango.&rdquo;
              </p>
            </div>
          </FadeIn>
        </div>
      </section>
      {/* \u2500\u2500 FINAL CTA \u2500\u2500 */}
      <section style={{ background: '#09090b', padding: '140px 24px', position: 'relative', overflow: 'hidden' }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(27,79,138,0.18), transparent 70%)', filter: 'blur(40px)' }} />
          <Beam delay={0.5} top="40%" opacity={0.1} />
          <Beam delay={2.5} top="60%" opacity={0.08} />
        </div>
        <FadeIn className="relative z-10 max-w-lg mx-auto text-center">
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(32px, 5vw, 54px)', fontWeight: 700, color: '#F5F5F0', lineHeight: 1.12, marginBottom: '18px', letterSpacing: '-0.02em' }}>
            Ready for your honest answer?
          </h2>
          <p style={{ color: '#636380', fontSize: '16px', lineHeight: 1.65, marginBottom: '40px' }}>
            South Bopal aur Shela ke 50+ verified projects. Koi fees nahi. Commission sirf deal close pe.
          </p>
          <MagneticButton href="/chat"
            style={{ background: 'linear-gradient(135deg, #1B4F8A, #2563EB)', color: 'white', padding: '16px 52px', borderRadius: '28px', fontSize: '16px', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 12px 40px rgba(27,79,138,0.4)', display: 'inline-flex', alignItems: 'center', gap: '10px' }}
          >
            <span>Shuru karo &mdash; free hai</span>
            <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}>&rarr;</motion.span>
          </MagneticButton>
          <p style={{ color: '#2a2a3a', fontSize: '12px', marginTop: '16px' }}>No signup &middot; No broker &middot; OTP protected</p>
        </FadeIn>
      </section>
      {/* \u2500\u2500 FOOTER \u2500\u2500 */}
      <footer style={{ background: '#09090b', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '28px 24px' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-baseline gap-1">
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '15px', fontWeight: 700, color: '#3de8a0' }}>Homesty</span>
            <span style={{ fontSize: '11px', color: '#2a2a3a' }}>.ai</span>
          </div>
          <div className="flex gap-6">
            <Link href="/chat" style={{ color: '#454560', fontSize: '12px', textDecoration: 'none' }} className="hover:text-white transition-colors">Chat</Link>
            <Link href="/projects" style={{ color: '#454560', fontSize: '12px', textDecoration: 'none' }} className="hover:text-white transition-colors">Projects</Link>
            <a href="#how" style={{ color: '#454560', fontSize: '12px', textDecoration: 'none' }} className="hover:text-white transition-colors">How it works</a>
          </div>
          <p style={{ color: '#2a2a3a', fontSize: '11px' }}>&copy; 2026 Homesty AI Technology LLP</p>
        </div>
      </footer>
    </div>
  )
}
