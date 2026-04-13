'use client'
import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type ToastType = 'success' | 'error' | 'info'

interface ToastMessage {
  id: string
  text: string
  type: ToastType
}

const ICON: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

const COLORS: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)', text: '#34D399', icon: '#34D399' },
  error:   { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)', text: '#F87171', icon: '#F87171' },
  info:    { bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.25)', text: '#60A5FA', icon: '#60A5FA' },
}

// Global event bus for toast
const listeners = new Set<(msg: ToastMessage) => void>()

export function showToast(text: string, type: ToastType = 'info') {
  const msg: ToastMessage = { id: crypto.randomUUID(), text, type }
  listeners.forEach(fn => fn(msg))
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback((msg: ToastMessage) => {
    setToasts(prev => [...prev.slice(-4), msg])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== msg.id))
    }, 3000)
  }, [])

  useEffect(() => {
    listeners.add(addToast)
    return () => { listeners.delete(addToast) }
  }, [addToast])

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => {
          const c = COLORS[toast.type]
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl backdrop-blur-md max-w-[320px]"
              style={{ background: c.bg, border: `1px solid ${c.border}` }}
            >
              <span className="text-[13px] font-bold flex-shrink-0" style={{ color: c.icon }}>{ICON[toast.type]}</span>
              <p className="text-[12px] font-medium leading-snug" style={{ color: c.text }}>{toast.text}</p>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
