import type { Metadata } from 'next'

// Dashboard is user-only. `/dashboard` is already disallowed in robots.txt,
// but noindex belts-and-braces prevents URL-only listing if it ever leaks.
// The page is a client component, so metadata lives in this layout.
export const metadata: Metadata = {
  title: 'Dashboard | Homesty',
  robots: { index: false, follow: false },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
