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
  pricePerSqftType?: string | null
  loadingFactor?: number | null
  allInPrice?: number | null
  trustScore?: number | null
  trustGrade?: string | null
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
  const [lastFailedMsg, setLastFailedMsg] = useState<string | null>(null)
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
        const prevHistory = artifactHistoryRef.current.slice(0, artifactIndexRef.current + 1)
        const alreadyExists = prevHistory.some(a => a.data.id === newArtifact.data.id)
        if (alreadyExists) return
        const newHistory = [...prevHistory, newArtifact]
        artifactHistoryRef.current = newHistory
        artifactIndexRef.current = newHistory.length - 1
        setArtifactHistory(newHistory)
        setArtifactIndex(newHistory.length - 1)
        setCurrentArtifact(newArtifact)
        setShowArtifact(true)
      }
    }
    window.addEventListener('book-visit', handler)
    return () => window.removeEventListener('book-visit', handler)
  }, [projects])

  useEffect(() => {
    const handler = (e: Event) => {
      const { projectId } = (e as CustomEvent).detail
      const project = projects.find(p => p.id === projectId)
      if (project) {
        // Check if project already exists in history — navigate to it instead of adding duplicate
        const existingIndex = artifactHistoryRef.current.findIndex(a => a.data.id === projectId)
        if (existingIndex >= 0) {
          artifactIndexRef.current = existingIndex
          setArtifactIndex(existingIndex)
          setCurrentArtifact({ type: 'project_card', data: artifactHistoryRef.current[existingIndex].data })
          setShowArtifact(true)
          return
        }
        // Not in history — add it
        const restored: Artifact = { type: 'project_card', data: project }
        const newHistory = [...artifactHistoryRef.current, restored]
        artifactHistoryRef.current = newHistory
        artifactIndexRef.current = newHistory.length - 1
        setArtifactHistory(newHistory)
        setArtifactIndex(newHistory.length - 1)
        setCurrentArtifact(restored)
        setShowArtifact(true)
      }
    }
    window.addEventListener('show-project-card', handler)
    return () => window.removeEventListener('show-project-card', handler)
  }, [projects])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const sendMessage = useCallback(async (userContent: string) => {
    if (!userContent.trim() || isLoading) return

    const userMsg: Message = { id: uid(), role: 'user', content: userContent }
    const assistantId = uid()

    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)
    setLastFailedMsg(null)

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
        setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: 'Something went wrong. Please try again.' }])
        setLastFailedMsg(userContent)
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

      // Detect project artifacts — find ALL mentioned projects
      const lower = full.toLowerCase()
      const foundProjects = projects.filter(p => lower.includes(p.projectName.toLowerCase()))
      const isVisitBooking = /book.*visit|visit.*book|schedule.*visit/i.test(full)

      if (foundProjects.length > 0) {
        let newHistory = [...artifactHistoryRef.current.slice(0, artifactIndexRef.current + 1)]
        const seenIds = new Set(newHistory.map(a => a.data.id))
        let lastArtifact: Artifact | null = null

        for (const p of foundProjects) {
          if (seenIds.has(p.id)) continue
          seenIds.add(p.id)
          const artifact: Artifact = {
            type: isVisitBooking && foundProjects.length === 1 ? 'visit_booking' : 'project_card',
            data: p
          }
          newHistory = [...newHistory, artifact]
          lastArtifact = artifact
        }

        if (lastArtifact) {
          artifactHistoryRef.current = newHistory
          artifactIndexRef.current = newHistory.length - 1
          setArtifactHistory(newHistory)
          setArtifactIndex(newHistory.length - 1)
          setCurrentArtifact(lastArtifact)
          setShowArtifact(true)
        }
      }
    } catch {
      setMessages(prev => {
        const hasAssistant = prev.some(m => m.id === assistantId)
        if (hasAssistant) {
          return prev.map(m => m.id === assistantId ? { ...m, content: 'Network error. Please try again.' } : m)
        }
        return [...prev, { id: assistantId, role: 'assistant' as const, content: 'Network error. Please try again.' }]
      })
      setLastFailedMsg(userContent)
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

  const retryLast = useCallback(() => {
    if (!lastFailedMsg) return
    // Remove the last error message from the conversation
    setMessages(prev => {
      const last = prev[prev.length - 1]
      if (last?.role === 'assistant' && (last.content.includes('try again') || last.content.includes('Network error'))) {
        return prev.slice(0, -1)
      }
      return prev
    })
    const msg = lastFailedMsg
    setLastFailedMsg(null)
    sendMessage(msg)
  }, [lastFailedMsg, sendMessage])

  const goArtifactBack = () => {
    const idx = artifactIndexRef.current
    const hist = artifactHistoryRef.current
    if (idx > 0) {
      const newIndex = idx - 1
      artifactIndexRef.current = newIndex
      setArtifactIndex(newIndex)
      setCurrentArtifact({ type: 'project_card', data: hist[newIndex].data })
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
      setCurrentArtifact({ type: 'project_card', data: hist[newIndex].data })
      setShowArtifact(true)
    }
  }

  const newChat = useCallback(() => {
    router.push('/chat')
    setMessages([])
    setInput('')
    setCurrentArtifact(null)
    setSessionId(null)
    setArtifactHistory([])
    setArtifactIndex(-1)
    artifactHistoryRef.current = []
    artifactIndexRef.current = -1
    setShowArtifact(true)
    router.replace('/chat')
  }, [router])

  const loadSession = useCallback((id: string) => {
    setCurrentArtifact(null)
    setArtifactHistory([])
    setArtifactIndex(-1)
    artifactHistoryRef.current = []
    artifactIndexRef.current = -1
    router.push(`/chat?session=${id}`)
  }, [router])

  useEffect(() => {
    // On fresh page load (not sidebar navigation), clear stale session URL
    if (urlSessionId && !document.referrer.includes('/chat')) {
      router.replace('/chat')
    }
  }, [])

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
        // Reconstruct full artifact history from all assistant messages
        const restoredHistory: Artifact[] = []
        const seenIds = new Set<string>()
        for (const msg of loaded) {
          if (msg.role !== 'assistant') continue
          const lower = msg.content.toLowerCase()
          for (const p of projects) {
            if (lower.includes(p.projectName.toLowerCase()) && !seenIds.has(p.id)) {
              seenIds.add(p.id)
              restoredHistory.push({ type: 'project_card', data: p })
            }
          }
        }
        if (restoredHistory.length > 0) {
          artifactHistoryRef.current = restoredHistory
          artifactIndexRef.current = restoredHistory.length - 1
          setArtifactHistory(restoredHistory)
          setArtifactIndex(restoredHistory.length - 1)
          setCurrentArtifact(restoredHistory[restoredHistory.length - 1])
          setShowArtifact(false)
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
        onRetry={lastFailedMsg ? retryLast : undefined}
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
          const selected = artifactHistoryRef.current[index]
          // Always show project card when navigating history — visit booking only makes sense in context
          const normalized: Artifact = { type: 'project_card', data: selected.data }
          setCurrentArtifact(normalized)
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
        artifactHistory={artifactHistory}
        onSelectArtifact={(index) => {
          artifactIndexRef.current = index
          setArtifactIndex(index)
          setCurrentArtifact({ type: 'project_card', data: artifactHistoryRef.current[index].data })
          setShowArtifact(true)
        }}
      />
    </div>
  )
}
