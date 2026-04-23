'use client'

// C2 (Sprint C): Client-side SessionProvider wrapper so components under
// `layout.tsx` (e.g. Navbar) can call `useSession()`. Added because no
// SessionProvider existed previously — useSession would have thrown.
// See docs/diagnostics/i40-deep-audit.md §I + §N.

import { SessionProvider } from 'next-auth/react'
import type { ReactNode } from 'react'

export default function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
