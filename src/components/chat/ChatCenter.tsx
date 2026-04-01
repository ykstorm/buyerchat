'use client'

import { motion } from 'framer-motion'
import { FormEvent } from 'react'
import ReactMarkdown from 'react-markdown'

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type Props = {
  messages: Message[]
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleSubmit: (e: FormEvent) => void
  isLoading: boolean
  append: (msg: { role: 'user'; content: string }) => void
}

const STARTERS = [
  'Best 3BHK under ₹85L — family, Shela preferred',
  'What are strong options under ₹90L?',
  'Honest opinion on Riviera projects',
  "I'm confused — help me decide",
]

export default function ChatCenter({ messages, input, handleInputChange, handleSubmit, isLoading, append }: Props) {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {messages.length === 0 ? (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, #D6D3D1 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }} />
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse at center, transparent 20%, #FAFAF8 75%)'
          }} />
          <div className="relative z-10 text-center px-6 w-full max-w-xl">
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              style={{ fontFamily: 'var(--font-playfair)' }}
              className="text-[32px] text-[#1C1917] mb-2"
            >
              Find your home
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="text-[14px] text-[#78716C] mb-8"
            >
              Tell me your budget, timeline, and what matters to you.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="grid grid-cols-2 gap-3"
            >
              {STARTERS.map((text, i) => (
                <motion.button
                  key={text}
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.06 }}
                  whileHover={{ y: -2, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  onClick={() => append({ role: 'user', content: text })}
                  className="bg-white border border-[#E7E5E4] rounded-xl p-4 text-[13px] text-[#1C1917] font-medium text-left hover:border-[#1B4F8A] transition-colors"
                >
                  {text}
                </motion.button>
              ))}
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-[11px] text-[#A8A29E] mt-6"
            >
              AaiGhar earns only when you buy. No builder pays for promotion.
            </motion.p>
          </div>
        </div>
      ) : (
        /* Messages */
        <motion.div
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
          initial="hidden"
          animate="show"
        >
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              variants={{ hidden: { y: 10, opacity: 0 }, show: { y: 0, opacity: 1, transition: { duration: 0.2 } } }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-2'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-[#1B4F8A] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-1">
                  AG
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#F0EFEC] text-[#1C1917] max-w-[70%]'
                  : 'bg-white border-l-2 border-[#1B4F8A] text-[#1C1917]'
              }`}>
                {msg.role === 'assistant'
                  ? <div className="prose prose-sm max-w-none text-[#1C1917] [&>p]:mb-2 [&>p:last-child]:mb-0">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  : msg.content}
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <div className="flex justify-start gap-2">
              <div className="w-6 h-6 rounded-full bg-[#1B4F8A] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[9px] font-bold">AG</span>
              </div>
              <div className="bg-white border-l-2 border-[#1B4F8A] rounded-2xl px-4 py-3 flex gap-1 items-center">
                {[0, 150, 300].map(delay => (
                  <div key={delay} className="w-1.5 h-1.5 bg-[#A8A29E] rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Input bar */}
      <motion.div
        className="border-t border-[#E7E5E4] bg-[#FAFAF8] px-4 py-3"
        animate={isLoading ? { scale: [1, 1.005, 1] } : {}}
        transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
      >
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about properties in South Bopal & Shela..."
            maxLength={800}
            className="flex-1 bg-white border border-[#E7E5E4] rounded-xl px-4 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/20 focus:border-[#1B4F8A] transition-all duration-200"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-[#1B4F8A] text-white rounded-xl px-4 py-2.5 text-[13px] font-medium hover:bg-[#163d6b] disabled:opacity-40 transition-colors"
          >
            →
          </button>
        </form>
      </motion.div>
    </div>
  )
}
