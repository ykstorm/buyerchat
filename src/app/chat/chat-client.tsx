'use client'

import { useState, useCallback, useEffect, FormEvent } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ChatSidebar from '@/components/chat/ChatSidebar'
import ChatCenter, { type Message } from '@/components/chat/ChatCenter'
import ChatRightPanel from '@/components/chat/ChatRightPanel'

type ProjectType = {
  id: string; projectName: string; builderName: string
  pricePerSqft: number; minPrice: number; maxPrice: number
  possessionDate: Date | string; constructionStatus: string
  microMarket: string
}

type ArtifactType = 'project_card' | 'visit_booking'
type Artifact = { type: ArtifactType; data: ProjectType }

let idCounter = 0
const uid = () => `msg-${++idCounter}-${Date.now()}`

export default function ChatClient({
  projects, userId
}: {
  projects: ProjectType[]; userId: string | null
}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const urlSessionId = searchParams.get('session')

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingSession, setLoadingSession] = useState(false)
  const [artifact, setCurrentArtifact] = useState<Artifact | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const { projectId, projectName } = (e as CustomEvent).detail
      const project = projects.find(p => p.id === projectId)
      if (project) setCurrentArtifact({ type: 'visit_booking', data: project })
    }
    window.addEventListener('book-visit', handler)
    return () => window.removeEventListener('book-visit', handler)
  }, [projects])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const sendMessage = useCallback(async (userContent: string) => {
    if (!userContent.trim() || isLoading) return

    const userMsg: Message = { id: uid(), role: 'user', content: userContent }
    const assistantId = uid()

    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...history, { role: 'user', content: userContent }],
          sessionId,
        }),
      })

      if (!res.ok || !res.body) {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: 'Something went wrong. Please try again.' } : m
        ))
        return
      }

      const newSessionId = res.headers.get('x-session-id')
      if (newSessionId) setSessionId(newSessionId)

      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }])
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        const snapshot = full
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: snapshot } : m
        ))
      }

      // Detect project artifact
      const lower = full.toLowerCase()
      const found = projects.find(p => lower.includes(p.projectName.toLowerCase()))
      if (found && /book.*visit|visit.*book|schedule.*visit/i.test(full)) {
        setCurrentArtifact({ type: 'visit_booking', data: found })
      } else if (found) {
        setCurrentArtifact({ type: 'project_card', data: found })
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: 'Network error. Please try again.' } : m
      ))
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading, projects])

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault()
    const val = input.trim()
    if (!val) return
    setInput('')
    sendMessage(val)
  }, [input, sendMessage])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }, [])

  const append = useCallback(({ role, content }: { role: 'user'; content: string }) => {
    void role
    sendMessage(content)
  }, [sendMessage])

  const newChat = useCallback(() => {
    router.push('/chat')
    setMessages([])
    setInput('')
    setCurrentArtifact(null)
    setSessionId(null)
  }, [router])

  const loadSession = useCallback((id: string) => {
    router.push(`/chat?session=${id}`)
  }, [router])

  useEffect(() => {
    if (!urlSessionId) return
    const load = async () => {
      setLoadingSession(true)
      setMessages([])
      try {
        const res = await fetch(`/api/chat-sessions/${urlSessionId}`)
        if (!res.ok) return
        const data = await res.json()
        const loaded: Message[] = (data.messages ?? []).map((m: any) => ({
          id: uid(), role: m.role, content: m.content
        }))
        setMessages(loaded)
        setSessionId(urlSessionId)
      } catch {}
      finally { setLoadingSession(false) }
    }
    load()
  }, [urlSessionId])

  return (
    <div className="flex h-screen bg-[#FAFAF8] overflow-hidden">
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden absolute top-3 left-3 z-40 w-9 h-9 bg-white border border-[#E7E5E4] rounded-lg flex items-center justify-center text-[#52525B] shadow-sm"
      >
        ☰
      </button>

      <ChatSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userId={userId}
        onNewChat={newChat}
        onLoadSession={loadSession}
      />

      <ChatCenter
        messages={messages}
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
        append={append}
        loadingSession={loadingSession}
      />

      <ChatRightPanel artifact={artifact} />
    </div>
  )
}
