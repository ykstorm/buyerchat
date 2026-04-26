'use client'
import { usePathname } from 'next/navigation'
import FloatingChatWidget from './FloatingChatWidget'

// Project-detail-only matcher: `/projects/<id>` (one segment after /projects).
// Excludes `/projects` (the listing page), `/projects/<id>/anything` (sub-pages),
// `/builders/...` (own profile UX), `/compare` (its own CTA flow), 404, etc.
const PROJECT_DETAIL_RE = /^\/projects\/[^/]+\/?$/

export default function ChatWidgetWrapper() {
  const pathname = usePathname()
  if (!pathname || !PROJECT_DETAIL_RE.test(pathname)) return null
  return <FloatingChatWidget />
}
