'use client'

/**
 * PageFade — global 150ms opacity fade applied to the App Router children
 * area. Eliminates the flash of white on intra-app navigation.
 *
 * Wraps only `{children}`, not `<Navbar />`, so the persistent header does
 * not re-fade on every route change. Honours prefers-reduced-motion.
 */

import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

export default function PageFade({ children }: { children: ReactNode }) {
  const prefersReduced = useReducedMotion()
  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: prefersReduced ? 0 : 0.15, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
