import type { Metadata } from 'next'

// Sign-in is a utility route — keep it out of Google's index and discourage
// following outbound links from it. The page itself is a client component and
// cannot export metadata directly; hence this layout wrapper.
export const metadata: Metadata = {
  title: 'Sign in | Homesty',
  robots: { index: false, follow: false },
}

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children
}
