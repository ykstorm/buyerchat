'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const suggestedQuestions = [
  "What 3BHK options are under ₹80L?",
  "Which builder has the best trust score?",
  "What is the possession timeline for The Planet?"
]

export default function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showPing, setShowPing] = useState(true)
  const [isError, setIsError] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setShowPing(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = textareaRef.current.scrollHeight
      const maxHeight = 4 * 24
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`
    }
  }, [input])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsStreaming(true)
    setIsError(false)

    const assistantMessageId = crypto.randomUUID()

    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      if (!response.ok) throw new Error('Failed to fetch')
      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)

        setMessages(prev => prev.map(m =>
          m.id === assistantMessageId
            ? { ...m, content: m.content + chunk }
            : m
        ))
      }
    } catch {
      setIsError(true)
      setMessages(prev => prev.map(m =>
        m.id === assistantMessageId
          ? { ...m, content: 'Something went wrong. Please try again.' }
          : m
      ))
    } finally {
      setIsStreaming(false)
    }
  }, [messages, isStreaming])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            className="fixed bottom-6 right-6 z-50"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            {showPing && (
              <span className="absolute inset-0 rounded-full bg-[#3de8a0]/30 animate-ping" />
            )}

            <motion.button
              onClick={() => setIsOpen(true)}
              className="relative w-14 h-14 rounded-full bg-[#3de8a0] shadow-[0_0_24px_rgba(61,232,160,0.4)] flex items-center justify-center group"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-6 h-6 text-[#09090b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>

              <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#1a1a24] px-3 py-1.5 text-xs text-[#e0e0ea] shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Ask BuyerChat AI
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1a1a24] rotate-45" />
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] max-h-[70vh] rounded-2xl border border-white/10 bg-[#0f0f14] shadow-2xl flex flex-col overflow-hidden"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#0f0f14]">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3de8a0] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3de8a0]" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#e0e0ea]">BuyerChat AI</p>
                  <p className="text-[11px] text-[#636380]">Answers from verified data only</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-[#636380] hover:text-[#e0e0ea] hover:bg-white/5 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-[#636380] hover:text-[#e0e0ea] hover:bg-white/5 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ✅ FIXED: Messages Area — proper div tag, overflow-x-hidden */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 space-y-3">
              {messages.length === 0 ? (
                /* Welcome State */
                <div className="flex flex-col items-center justify-center h-full py-8">
                  <div className="w-12 h-12 rounded-xl bg-[#3de8a0]/10 border border-[#3de8a0]/20 flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-[#3de8a0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                  </div>
                  <p className="text-sm text-[#8888a8] text-center mb-4 px-4">
                    Ask me anything about projects in South Bopal & Shela
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 px-2">
                    {suggestedQuestions.map((q, i) => (
                      <motion.button
                        key={i}
                        onClick={() => sendMessage(q)}
                        className="border border-white/10 bg-white/[0.03] rounded-full px-3 py-1.5 text-xs text-[#8888a8] hover:border-[#3de8a0]/30 hover:text-[#3de8a0] transition-colors"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * i }}
                      >
                        {q}
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Messages */
                <>
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                    >
                      {/* ✅ FIXED: break-words on both bubble types */}
                      <div
                        className={
                          message.role === 'user'
                            ? 'max-w-[80%] bg-[#3de8a0]/15 border border-[#3de8a0]/20 rounded-2xl rounded-br-sm px-3 py-2 break-words min-w-0'
                            : `max-w-[80%] border rounded-2xl rounded-bl-sm px-3 py-2 break-words min-w-0 ${
                                isError && index === messages.length - 1
                                  ? 'bg-red-500/10 border-red-500/20'
                                  : 'bg-white/[0.04] border-white/[0.08]'
                              }`
                        }
                      >
                        <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${isError && message.role === 'assistant' && index === messages.length - 1 ? 'text-red-400' : 'text-[#e0e0ea]'}`}>
                          {message.content}
                          {isStreaming && message.role === 'assistant' && index === messages.length - 1 && message.content && (
                            <span className="inline-block w-1 h-4 ml-0.5 bg-[#3de8a0] animate-pulse" />
                          )}
                        </p>
                        <p className="text-[10px] text-[#454560] mt-1">
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </motion.div>
                  ))}

                  {/* Typing indicator */}
                  {isStreaming && messages[messages.length - 1]?.content === '' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl rounded-bl-sm px-4 py-3">
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <motion.span
                              key={i}
                              className="w-1.5 h-1.5 rounded-full bg-[#3de8a0]/60"
                              animate={{ y: [0, -4, 0] }}
                              transition={{
                                duration: 0.6,
                                repeat: Infinity,
                                delay: i * 0.15
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-white/[0.08] px-3 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about any project..."
                  rows={1}
                  className="flex-1 bg-transparent border border-white/10 rounded-xl px-3 py-2 text-sm text-[#e0e0ea] placeholder-[#454560] resize-none focus:outline-none focus:border-[#3de8a0]/30 transition-colors"
                />
                <motion.button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isStreaming}
                  className="w-8 h-8 rounded-full bg-[#3de8a0] flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                  whileHover={{ scale: input.trim() && !isStreaming ? 1.05 : 1 }}
                  whileTap={{ scale: input.trim() && !isStreaming ? 0.95 : 1 }}
                >
                  <svg className="w-4 h-4 text-[#09090b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}