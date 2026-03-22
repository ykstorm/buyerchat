"use client";

import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useRef, useEffect, useState, MouseEvent } from "react";
import Link from "next/link";

function Spotlight() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const handle = (e: globalThis.MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handle);
    return () => window.removeEventListener("mousemove", handle);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      style={{
        background: useTransform(
          [mouseX, mouseY],
          ([x, y]) =>
            `radial-gradient(600px circle at ${x}px ${y}px, rgba(61,232,160,0.06), transparent 60%)`
        ),
      }}
    />
  );
}

function Grain() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "128px 128px",
      }}
    />
  );
}

function TrustBadge({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-3.5 py-1.5 text-xs font-medium tracking-wide text-[#9999b0] backdrop-blur-sm"
    >
      {children}
    </motion.div>
  );
}

function PulseDot({ color = "#3de8a0" }: { color?: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span
        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}

function MagneticButton({
  children,
  href,
  variant = "primary",
}: {
  children: React.ReactNode;
  href: string;
  variant?: "primary" | "ghost";
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 30 });
  const springY = useSpring(y, { stiffness: 300, damping: 30 });

  const handleMove = (e: MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set((e.clientX - cx) * 0.22);
    y.set((e.clientY - cy) * 0.22);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.a
      ref={ref}
      href={href}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={
        variant === "primary"
          ? "group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full bg-[#3de8a0] px-7 py-3 text-sm font-semibold text-[#09090b] transition-all duration-200"
          : "inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/4 px-7 py-3 text-sm font-medium text-[#9999b0] backdrop-blur-sm transition-all duration-200 hover:border-white/20 hover:text-[#e0e0ea]"
      }
    >
      {variant === "primary" && (
        <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-500 group-hover:translate-x-full skew-x-12" />
      )}
      {children}
    </motion.a>
  );
}

function GridBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(61,232,160,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(61,232,160,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "72px 72px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 50%, black 20%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 50%, black 20%, transparent 80%)",
        }}
      />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-[#3de8a0]/5 blur-[120px]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-[600px] bg-gradient-to-r from-transparent via-[#3de8a0]/30 to-transparent" />
    </div>
  );
}

function StatStrip() {
  const stats = [
    { value: "25+", label: "Verified Projects" },
    { value: "₹85L", label: "First Deal Closed" },
    { value: "A–F", label: "Builder Trust Scores" },
    { value: "2", label: "Micro-markets Covered" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 1.1, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/8 sm:grid-cols-4"
    >
      {stats.map((s, i) => (
        <div
          key={i}
          className="flex flex-col gap-1 bg-[#09090b] px-6 py-5 text-center"
        >
          <span
            className="text-2xl font-bold tracking-tight"
            style={{ color: "#3de8a0", fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {s.value}
          </span>
          <span className="text-xs tracking-wide text-[#9999b0]">{s.label}</span>
        </div>
      ))}
    </motion.div>
  );
}

export default function HeroSection() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
      },
    },
  };

  return (
    <section className="group relative min-h-screen overflow-hidden bg-[#09090b]">
      <Grain />
      <GridBackground />
      {mounted && <Spotlight />}

      <div className="relative z-20 mx-auto max-w-5xl px-5 pt-36 pb-20 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mb-8 flex flex-wrap items-center justify-center gap-2"
        >
          <TrustBadge delay={0.1}>
            <PulseDot />
            Shela &amp; South Bopal
          </TrustBadge>
          <TrustBadge delay={0.2}>
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" style={{ color: "#3de8a0" }}>
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
            RERA Verified Data
          </TrustBadge>
          <TrustBadge delay={0.3}>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "#3de8a0" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            Builder Trust Score
          </TrustBadge>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center"
        >
          <motion.h1
            variants={itemVariants}
            className="mx-auto max-w-4xl text-5xl font-bold leading-[1.05] tracking-[-0.03em] text-[#e0e0ea] sm:text-6xl lg:text-7xl"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Buy smarter.
            <br />
            <span className="relative inline-block">
              <span
                className="relative z-10"
                style={{
                  background: "linear-gradient(90deg, #3de8a0, #5ef0b0, #3de8a0)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Know before you visit.
              </span>
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="absolute -bottom-2 left-0 right-0 h-px origin-left"
                style={{
                  background: "linear-gradient(90deg, rgba(61,232,160,0.6), rgba(61,232,160,0.3), transparent)",
                }}
              />
            </span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mx-auto mt-7 max-w-xl text-base leading-relaxed sm:text-lg"
            style={{ color: "#707088" }}
          >
            AI-powered property intelligence for South Bopal and Shela.
            Verified projects, builder trust scores, and honest comparisons —
            so your biggest decision isn't a guess.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="mt-9 flex flex-wrap items-center justify-center gap-3"
          >
            <MagneticButton href="/projects" variant="primary">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
              Start Exploring
            </MagneticButton>
            <MagneticButton href="/projects" variant="ghost">
              View Projects
            </MagneticButton>
          </motion.div>

          <motion.p
            variants={itemVariants}
            className="mt-6 text-xs tracking-wider"
            style={{ color: "#454560" }}
          >
            Trusted by buyers in Ahmedabad's fastest-growing corridors
          </motion.p>
        </motion.div>

        <StatStrip />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.6 }}
          className="mt-16 flex flex-col items-center gap-2"
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="flex h-8 w-5 items-start justify-center rounded-full border border-white/10 p-1"
          >
            <div className="h-1.5 w-1 rounded-full" style={{ backgroundColor: "rgba(61,232,160,0.6)" }} />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}