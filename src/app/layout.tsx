import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
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

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['300', '400', '500'],
})

export const metadata: Metadata = {
  title: 'BuyerChat — Property Intelligence for South Bopal & Shela',
  description: 'AI-powered property advisor for home buyers in South Bopal and Shela, Ahmedabad. Verified RERA data, builder trust scores, and OTP-verified site visits.',
  keywords: 'South Bopal flats, Shela property, 3BHK Ahmedabad, property advisor, RERA verified',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    title: 'BuyerChat — Find Your Home in South Bopal & Shela',
    description: 'Tell me your budget and what matters to you. I will do the rest.',
    url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    siteName: 'BuyerChat',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BuyerChat — Property Intelligence',
    description: 'AI-powered property advisor for South Bopal & Shela, Ahmedabad.',
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
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
   <body className="bg-[#09090b] antialiased">
  <Navbar />
  {children}
  <ChatWidgetWrapper />
  <Analytics />
</body>
      
    </html>
  )
}