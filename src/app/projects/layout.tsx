import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Active Projects — South Bopal & Shela | Homesty',
  description: 'Browse RERA-verified residential projects in South Bopal and Shela, Ahmedabad. Updated prices, builder trust scores, possession dates.',
  openGraph: {
    title: 'Active Projects in South Bopal & Shela',
    description: 'RERA-verified projects with builder trust scores and live pricing.',
    type: 'website',
  }
}

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
