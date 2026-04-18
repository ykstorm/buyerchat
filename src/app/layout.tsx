import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans, Cormorant_Garamond } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'
import Navbar from '@/components/Navbar'
import ChatWidgetWrapper from '@/components/ChatWidgetWrapper'

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
  title: 'Homesty.ai — Honest Property Advisor | South Bopal & Shela, Ahmedabad',
  description: 'South Bopal and Shela\'s first honest property advisor. ALL-IN prices, mandatory flaw disclosure, OTP-protected visits. 1.5% commission only on close.',
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
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${cormorant.variable}`}>
      <body className="antialiased" style={{ background: 'var(--background)' }}>
        <Navbar />
        {children}
        <ChatWidgetWrapper />
        <Analytics />
      </body>
    </html>
  )
}