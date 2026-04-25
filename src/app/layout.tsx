import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans, Cormorant_Garamond } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import Navbar from '@/components/Navbar'
import ChatWidgetWrapper from '@/components/ChatWidgetWrapper'
import Providers from './providers'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['700', '800'],
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-cormorant',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'Homesty.ai — AI-powered Property Intelligence | South Bopal & Shela, Ahmedabad',
  description: 'South Bopal and Shela\'s first honest property advisor. ALL-IN prices, mandatory flaw disclosure, OTP-protected visits. Homesty AI earns from builders — not from you.',
  keywords: 'South Bopal property, Shela property, Ahmedabad real estate, honest property advisor, property without broker',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    title: 'Homesty.ai — Honest Property Advisor | South Bopal & Shela',
    description: 'South Bopal and Shela\'s first honest property advisor. ALL-IN prices, mandatory flaw disclosure, OTP-protected visits.',
    url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    siteName: 'Homesty.ai',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Homesty.ai — Honest Property Advisor',
    description: 'South Bopal and Shela\'s first honest property advisor. ALL-IN prices, OTP-protected visits.',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${cormorant.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('homesty-theme');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark')}}catch(e){}})();`
          }}
        />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'RealEstateAgent',
              name: 'Homesty.ai',
              url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://homesty.ai',
              description: 'South Bopal and Shela\'s first honest property advisor. ALL-IN prices, mandatory flaw disclosure, OTP-protected visits.',
              areaServed: {
                '@type': 'City',
                name: 'Ahmedabad',
                containedInPlace: { '@type': 'State', name: 'Gujarat' },
              },
              address: {
                '@type': 'PostalAddress',
                addressLocality: 'Ahmedabad',
                addressRegion: 'Gujarat',
                addressCountry: 'IN',
              },
              priceRange: '₹₹',
              openingHoursSpecification: {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                opens: '09:00',
                closes: '20:00',
              },
            }),
          }}
        />
      </head>
      <body className="antialiased" style={{ background: 'var(--background)' }}>
        <Providers>
          <Navbar />
          {children}
          <ChatWidgetWrapper />
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}