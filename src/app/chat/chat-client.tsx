'use client'

import { useState, useCallback, useEffect, useRef, FormEvent } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ChatSidebar from '@/components/chat/ChatSidebar'
import ChatCenter, { type Message } from '@/components/chat/ChatCenter'
import ChatRightPanel from '@/components/chat/ChatRightPanel'

type ProjectType = {
  id: string; projectName: string; builderName: string
  pricePerSqft: number | null; minPrice: number; maxPrice: number
  possessionDate: Date | string; constructionStatus: string
  microMarket: string
  decisionTag?: string | null
  honestConcern?: string | null
  analystNote?: string | null
  possessionFlag?: string | null
  configurations?: string | null
  bankApprovals?: string | null
  priceNote?: string | null
}

type ArtifactType = 'project_card' | 'visit_booking'
type Artifact = { type: ArtifactType; data: ProjectType }

let idCounter = 0
const uid = () => `msg-${++idCounter}-${Date.now()}`

export default function ChatClient({
  projects, userId, userName, userImage
}: {
  projects: ProjectType[]; userId: string | null; userName: string | null; userImage: string | null
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
  const [showArtifact, setShowArtifact] = useState(true)
  const [artifactHistory, setArtifactHistory] = useState<Artifact[]>([])
  const [artifactIndex, setArtifactIndex] = useState(-1)
  const artifactHistoryRef = useRef<Artifact[]>([])
  const artifactIndexRef = useRef<number>(-1)

  useEffect(() => { if (artifact) setShowArtifact(true) }, [artifact])

  useEffect(() => {
    const handler = (e: Event) => {
      const { projectId, projectName } = (e as CustomEvent).detail
      const project = projects.find(p => p.id === projectId)
      if (project) {
        const newArtifact: Artifact = { type: 'visit_booking', data: project }
        const newHistory = [...artifactHistory.slice(0, artifactIndex + 1), newArtifact]
        setArtifactHistory(newHistory)
        setArtifactIndex(newHistory.length - 1)
        setCurrentArtifact(newArtifact)
        setShowArtifact(true)
      }
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
        const newArtifact1: Artifact = { type: 'visit_booking', data: found }
        const newHistory1 = [...artifactHistory.slice(0, artifactIndex + 1), newArtifact1]
        setArtifactHistory(newHistory1)
        setArtifactIndex(newHistory1.length - 1)
        artifactHistoryRef.current = newHistory1
        artifactIndexRef.current = newHistory1.length - 1
        setCurrentArtifact(newArtifact1)
        setShowArtifact(true)
      } else if (found) {
        const newArtifact2: Artifact = { type: 'project_card', data: found }
        const newHistory2 = [...artifactHistory.slice(0, artifactIndex + 1), newArtifact2]
        setArtifactHistory(newHistory2)
        setArtifactIndex(newHistory2.length - 1)
        artifactHistoryRef.current = newHistory2
        artifactIndexRef.current = newHistory2.length - 1
        setCurrentArtifact(newArtifact2)
        setShowArtifact(true)
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: 'Network error. Please try again.' } : m
      ))
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading, projects, artifactHistory, artifactIndex])

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

  const goArtifactBack = () => {
    const idx = artifactIndexRef.current
    const hist = artifactHistoryRef.current
    if (idx > 0) {
      const newIndex = idx - 1
      artifactIndexRef.current = newIndex
      setArtifactIndex(newIndex)
      setCurrentArtifact(hist[newIndex])
      setShowArtifact(true)
    }
  }

  const goArtifactForward = () => {
    const idx = artifactIndexRef.current
    const hist = artifactHistoryRef.current
    if (idx < hist.length - 1) {
      const newIndex = idx + 1
      artifactIndexRef.current = newIndex
      setArtifactIndex(newIndex)
      setCurrentArtifact(hist[newIndex])
      setShowArtifact(true)
    }
  }

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
        // Restore last artifact from session history
        const lastAssistant = [...loaded].reverse().find(m => m.role === 'assistant')
        if (lastAssistant) {
          const lower = lastAssistant.content.toLowerCase()
          const found = projects.find(p => lower.includes(p.projectName.toLowerCase()))
          if (found) {
            const restored: Artifact = { type: 'project_card', data: found }
            setArtifactHistory([restored])
            setArtifactIndex(0)
            setCurrentArtifact(restored)
            setShowArtifact(true)
          }
        }
      } catch {}
      finally { setLoadingSession(false) }
    }
    load()
  }, [urlSessionId])

  return (
    <div className="flex h-dvh bg-[#FAFAF8] overflow-hidden">
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
        userName={userName}
        userImage={userImage}
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
        artifact={artifact}
        showArtifact={showArtifact}
        onToggleArtifact={() => setShowArtifact(v => !v)}
        canGoBack={artifactIndex > 0}
        canGoForward={artifactIndex < artifactHistory.length - 1}
        onArtifactBack={goArtifactBack}
        onArtifactForward={goArtifactForward}
        artifactCurrent={artifactIndex + 1}
        artifactTotal={artifactHistory.length}
        artifactHistory={artifactHistory}
        onSelectArtifact={(index) => {
          artifactIndexRef.current = index
          setArtifactIndex(index)
          setCurrentArtifact(artifactHistoryRef.current[index])
          setShowArtifact(true)
        }}
      />

      <ChatRightPanel
        artifact={artifact}
        onArtifactBack={goArtifactBack}
        onArtifactForward={goArtifactForward}
        canGoBack={artifactIndex > 0}
        canGoForward={artifactIndex < artifactHistory.length - 1}
        artifactCurrent={artifactIndex + 1}
        artifactTotal={artifactHistory.length}
      />
    </div>
  )
}
