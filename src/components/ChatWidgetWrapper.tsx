'use client'
import { usePathname } from 'next/navigation'
import FloatingChatWidget from './FloatingChatWidget'
export default function ChatWidgetWrapper() {
  const pathname = usePathname()
  if (pathname.startsWith('/chat')) return null
  return <FloatingChatWidget />
}
