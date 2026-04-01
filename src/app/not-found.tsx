'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-4"
      >
        <span
          style={{ fontFamily: "'Playfair Display', serif", fontSize: 72, lineHeight: 1 }}
          className="text-[#E7E5E4] font-bold select-none"
        >
          404
        </span>
        <p className="text-[16px] text-[#78716C]">This page doesn&apos;t exist.</p>
        <Link
          href="/chat"
          className="bg-[#1B4F8A] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#163d6b] transition-colors"
        >
          Back to chat
        </Link>
      </motion.div>
    </div>
  )
}
