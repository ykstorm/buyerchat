'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-4"
      >
        <span
          style={{ fontFamily: "'Playfair Display', serif", fontSize: 72, lineHeight: 1, color: 'var(--border)' }}
          className="font-bold select-none"
        >
          404
        </span>
        <p className="text-[16px]" style={{ color: 'var(--text-muted)' }}>This page doesn&apos;t exist.</p>
        <Link
          href="/chat"
          className="text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{ background: 'var(--color-accent-blue)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--color-accent-blue-hover)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--color-accent-blue)' }}
        >
          Back to chat
        </Link>
      </motion.div>
    </div>
  )
}
