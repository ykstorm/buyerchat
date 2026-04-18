'use client'
import { usePathname } from 'next/navigation'
import FloatingChatWidget from './FloatingChatWidget'

export default function ChatWidgetWrapper() {
  const pathname = usePathname()

  // Only show on public buyer pages (not landing, chat, or admin)
  const showWidget =
    pathname.startsWith('/projects') ||
    pathname.startsWith('/builders') ||
    pathname.startsWith('/compare')

  if (!showWidget) return null
  return <FloatingChatWidget />
}
