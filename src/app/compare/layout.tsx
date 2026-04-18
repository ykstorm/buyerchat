import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Compare Projects — South Bopal & Shela | Homesty',
  description: 'Compare RERA-verified residential projects in South Bopal & Shela side by side. Honest scores, pricing, builder trust, and risk analysis.',
  openGraph: {
    title: 'Compare Projects — Homesty',
    description: 'Side-by-side comparison of South Bopal & Shela residential projects.',
    type: 'website',
  },
}

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
