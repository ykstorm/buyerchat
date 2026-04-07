'use client'
import { signIn } from 'next-auth/react'
import { motion } from 'framer-motion'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex items-center gap-1.5 mb-8">
        <span
          className="text-[24px] font-semibold text-[#1C1917]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          BuyerChat
        </span>
        <span className="w-2 h-2 rounded-full bg-[#0F6E56] mt-0.5" />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="bg-white rounded-2xl shadow-sm border border-[#E7E5E4] p-8 w-full max-w-sm mx-auto"
      >
        <h1
          className="text-[28px] font-semibold text-[#1C1917] mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Sign in
        </h1>
        <p className="text-[13px] text-[#78716C] mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Access your property shortlist and visit history.
        </p>

        {/* Google button */}
        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl: '/chat' })}
          className="w-full flex items-center gap-3 border border-[#E7E5E4] rounded-xl py-3 px-4 hover:bg-[#F4F3F0] transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615Z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.8591-3.0477.8591-2.3441 0-4.3305-1.5832-5.0386-3.7105H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18Z" fill="#34A853"/>
            <path d="M3.9614 10.71A5.4113 5.4113 0 0 1 3.6818 9c0-.5905.1018-1.1645.2796-1.71V4.9582H.9573A8.9965 8.9965 0 0 0 0 9c0 1.4514.3477 2.8255.9573 4.0418L3.9614 10.71Z" fill="#FBBC05"/>
            <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.9614 7.29C4.6695 5.1627 6.6559 3.5795 9 3.5795Z" fill="#EA4335"/>
          </svg>
          <span className="text-[14px] font-medium text-[#1C1917]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Continue with Google
          </span>
        </button>
      </motion.div>

      {/* Footer note */}
      <p className="mt-6 text-[11px] text-[#A8A29E] text-center max-w-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        BuyerChat earns only when you buy. No builder pays for promotion.
      </p>
    </div>
  )
}
