'use client'

import { useState, useCallback, useEffect, useRef, FormEvent } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import dynamic from 'next/dynamic'
import { LazyMotion, domAnimation } from 'framer-motion'
import ChatCenter, { type Message } from '@/components/chat/ChatCenter'
import ChatRightPanel from '@/components/chat/ChatRightPanel'
import StageACapture from '@/components/chat/StageACapture'
import type { ProjectType, ArtifactType, Artifact } from '@/lib/types/chat'
import type { BuilderAIContext } from '@/lib/types/builder-ai-context'

// Sidebar stays lazy — closed by default, its framer-motion swipe logic
// (useMotionValue/animate) is idle until the user opens it. RightPanel is
// NOT lazy anymore: the outer-lazy + inner-lazy (artifact renderers) chain
// made the first card render silently fail (empty-div loader ignored the
// artifact prop on first message). The 6 artifact renderers inside
// ChatRightPanel remain next/dynamic — I12's real bundle win survives.
const ChatSidebar = dynamic(() => import('@/components/chat/ChatSidebar'), {
  ssr: false,
  loading: () => null,
})

let idCounter = 0
const uid = () => `msg-${++idCounter}-${Date.now()}`

export default function ChatClient({
  projects, builders = [], userId, userName, userImage
}: {
  projects: ProjectType[]; builders?: BuilderAIContext[]; userId: string | null; userName: string | null; userImage: string | null
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
  const [buyerStage, setBuyerStage] = useState<string | null>(null)
  // Stage A soft capture: render the capture card after the first project
  // artifact has been pushed and only while captureStage is null/undefined.
  // captureSubmitted hides it immediately on POST/PATCH success so the
  // buyer never sees a flash of the form on the next render. The /api/chat-
  // sessions/[id] GET refresh keeps signed-in users in sync after reload.
  const [captureStage, setCaptureStage] = useState<string | null>(null)
  const [captureSubmitted, setCaptureSubmitted] = useState(false)
  const artifactHistoryRef = useRef<Artifact[]>([])
  const artifactIndexRef = useRef<number>(-1)
  const sessionLoadingRef = useRef(false)

  useEffect(() => { if (artifact) setShowArtifact(true) }, [artifact])

  useEffect(() => {
    const handler = (e: Event) => {
      const { projectId } = (e as CustomEvent).detail
      const project = projects.find(p => p.id === projectId)
      if (project) {
        const newArtifact: Artifact = { type: 'visit_booking', data: project }
        // Check if there's already a visit booking for this project in history
        const existingIdx = artifactHistoryRef.current.findIndex(a => a.type === 'visit_booking' && a.data.id === projectId)
        if (existingIdx >= 0) {
          // Navigate to existing visit booking
          artifactIndexRef.current = existingIdx
          setArtifactIndex(existingIdx)
          setCurrentArtifact(artifactHistoryRef.current[existingIdx])
          setShowArtifact(true)
        } else {
          // Push as NEW artifact after current position (don't replace anything)
          const currentIdx = artifactIndexRef.current
          const newHistory = [...artifactHistoryRef.current.slice(0, currentIdx + 1), newArtifact]
          artifactHistoryRef.current = newHistory
          artifactIndexRef.current = newHistory.length - 1
          setArtifactHistory(newHistory)
          setArtifactIndex(newHistory.length - 1)
          setCurrentArtifact(newArtifact)
          setShowArtifact(true)
        }
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
        const existingIndex = artifactHistoryRef.current.findIndex(
          a => a.data.id === projectId && a.type === 'project_card'
        )
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

  // Compare feature: always queue first, buyer explicitly picks both
  const compareQueueRef = useRef<string | null>(null)
  const [compareToast, setCompareToast] = useState<string | null>(null)
  useEffect(() => {
    const handler = (e: Event) => {
      const { projectId } = (e as CustomEvent).detail
      const project = projects.find(p => p.id === projectId) ??
        artifactHistoryRef.current.find(a => a.data.id === projectId)?.data
      if (!project) return

      const firstId = compareQueueRef.current
      if (firstId && firstId !== projectId) {
        // Second click — create comparison
        const projectA = projects.find(p => p.id === firstId) ??
          artifactHistoryRef.current.find(a => a.data.id === firstId)?.data
        if (projectA) {
          compareQueueRef.current = null
          setCompareToast(null)
          // Check if comparison already exists
          const exists = artifactHistoryRef.current.findIndex(a =>
            a.type === 'comparison' &&
            ((a.data.id === firstId && a.dataB?.id === projectId) ||
             (a.data.id === projectId && a.dataB?.id === firstId))
          )
          if (exists >= 0) {
            artifactIndexRef.current = exists
            setArtifactIndex(exists)
            setCurrentArtifact(artifactHistoryRef.current[exists])
            setShowArtifact(true)
            return
          }
          const artifact: Artifact = { type: 'comparison', data: projectA, dataB: project }
          const newHistory = [...artifactHistoryRef.current, artifact]
          artifactHistoryRef.current = newHistory
          artifactIndexRef.current = newHistory.length - 1
          setArtifactHistory(newHistory)
          setArtifactIndex(newHistory.length - 1)
          setCurrentArtifact(artifact)
          setShowArtifact(true)
          return
        }
      }

      // First click (or same project clicked again) — queue and show toast
      compareQueueRef.current = projectId
      setCompareToast(`${project.projectName} queued — click Compare on another project`)
      setTimeout(() => setCompareToast(null), 8000)
    }
    window.addEventListener('compare-project', handler)
    return () => window.removeEventListener('compare-project', handler)
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
          messages: [
            // Filter out any failed/empty assistant turns from prior errors —
            // sending these to OpenAI corrupts the conversation and causes all
            // subsequent turns to also return empty (compounding failure).
            ...history.filter(m => m.role !== 'assistant' || (m.content && m.content.trim().length > 0)),
            { role: 'user', content: userContent }
          ],
          sessionId,
        }),
      })

      if (!res.ok || !res.body) {
        let userMsg = 'Something went wrong. Please try again.'
        let action: Message['action'] | undefined
        if (res.status === 401) {
          // JWT expired mid-session. Don't treat as a generic failure —
          // surface a sign-in CTA inline so the buyer can recover.
          userMsg = 'Session expired. Sign in to continue.'
          action = { kind: 'signin', label: 'Sign in to continue' }
        } else if (res.status === 429) {
          userMsg = "You're sending messages too fast. Please wait a moment."
        } else if (res.status === 503) {
          userMsg = 'Service temporarily unavailable. Please try again in a moment.'
        } else if (res.status === 400) {
          try {
            const errData = await res.json()
            if (typeof errData?.error === 'string') userMsg = errData.error
          } catch {}
        }
        setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: userMsg, action }])
        // 401 is a recoverable auth state — don't mark as "last failed" (retry
        // won't help without sign-in).
        if (res.status !== 401) setLastFailedMsg(userContent)
        return
      }

      const newSessionId = res.headers.get('x-session-id')
      if (newSessionId) setSessionId(newSessionId)

      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }])
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''
      let rafScheduled = false

      // Strip CARD blocks from visible text — including any unclosed block still streaming in.
      // Without this, buyers briefly see raw <!--CARD:{...}--> JSON as the stream arrives.
      const stripCardsForDisplay = (text: string): string => {
        // Remove all complete card blocks
        let cleaned = text.replace(/<!--CARD:[\s\S]*?-->/g, '')
        // Truncate at any unclosed CARD block (mid-stream, not yet complete)
        const unclosedStart = cleaned.lastIndexOf('<!--CARD:')
        if (unclosedStart !== -1) {
          cleaned = cleaned.substring(0, unclosedStart)
        }
        return cleaned.trimEnd()
      }

      // Batch streaming updates via requestAnimationFrame for 60fps feel
      const flushUpdate = () => {
        rafScheduled = false
        const snapshot = stripCardsForDisplay(full)
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: snapshot } : m
        ))
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        if (!rafScheduled) {
          rafScheduled = true
          requestAnimationFrame(flushUpdate)
        }
      }
      // Final flush to ensure last chunk is rendered
      flushUpdate()

      // Safety net: if the entire response was empty (network blip, model timeout,
      // etc), show a user-visible error instead of a silent empty bubble.
      if (!full || full.trim().length === 0) {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: 'Kuch problem hui — dubara try karein.' } : m
        ))
        return
      }

      // Parse <!--CARD:{...}--> triggers from AI response
      const cardRegex = /<!--CARD:(.*?)-->/g
      const cardMatches = [...full.matchAll(cardRegex)]
      const parsedCards: Array<{ type: string; projectId?: string; projectIdA?: string; projectIdB?: string; projectName?: string; builderId?: string; builderName?: string; grade?: string; trustScore?: number; reason?: string }> = []
      for (const match of cardMatches) {
        try { parsedCards.push(JSON.parse(match[1])) } catch {}
      }
      // Final pass — ensure fully-stripped version is committed to state.
      // If AI emitted ONLY CARDs with no prose (rule violation), inject a minimal
      // placeholder so the bubble doesn't render empty.
      if (cardMatches.length > 0) {
        full = full.replace(cardRegex, '').trimEnd()
        if (!full || full.length < 2) {
          full = 'Dekho right panel mein.'
        }
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: full } : m))
      }

      // Minimal fallback project for when CARD references an ID/name we don't have.
      // ProjectCardV2's 5-branch fallback lands on "Price on request".
      const fallbackProject = (label?: string): ProjectType => ({
        id: `missing-${Date.now()}`,
        projectName: label ?? 'Project not found in current data',
        builderName: '—',
        pricePerSqft: null,
        minPrice: 0,
        maxPrice: 0,
        possessionDate: new Date(),
        constructionStatus: '',
        microMarket: '',
        decisionTag: null,
        honestConcern: null,
        analystNote: null,
        possessionFlag: null,
        configurations: null,
        bankApprovals: null,
        priceNote: null,
        pricePerSqftType: null,
        loadingFactor: null,
        allInPrice: null,
        trustScore: null,
        trustGrade: null,
      })

      // Handle parsed CARD triggers as artifacts (CARD is the ONLY path that creates artifacts)
      for (const card of parsedCards) {
        let artifact: Artifact | null = null

        if (card.type === 'project_card' && card.projectId) {
          const project = projects.find(p => p.id === card.projectId)
          if (project) {
            artifact = { type: 'project_card', data: project }
          } else {
            console.warn('[ARTIFACT] unresolved', card)
            artifact = { type: 'project_card', data: fallbackProject(card.projectName) }
          }
        } else if (card.type === 'cost_breakdown' && card.projectId) {
          const project = projects.find(p => p.id === card.projectId)
          if (project) {
            artifact = { type: 'cost_breakdown', data: project }
          } else {
            console.warn('[ARTIFACT] unresolved', card)
            artifact = { type: 'project_card', data: fallbackProject(card.projectName) }
          }
        } else if (card.type === 'comparison' && card.projectIdA && card.projectIdB) {
          const projectA = projects.find(p => p.id === card.projectIdA)
          const projectB = projects.find(p => p.id === card.projectIdB)
          if (projectA && projectB) {
            artifact = { type: 'comparison', data: projectA, dataB: projectB }
          } else {
            console.warn('[ARTIFACT] unresolved', card)
            artifact = { type: 'project_card', data: fallbackProject() }
          }
        } else if (card.type === 'visit_prompt' && card.projectId) {
          const project = projects.find(p => p.id === card.projectId)
          if (project) {
            artifact = { type: 'visit_prompt', data: project }
          } else {
            console.warn('[ARTIFACT] unresolved', card)
            artifact = { type: 'project_card', data: fallbackProject(card.projectName) }
          }
        } else if (card.type === 'builder_trust' && card.builderName) {
          const needle = card.builderName.toLowerCase()
          // Prefer explicit builders list; fall back to project-name substring match for legacy CARDs.
          const builder = builders.find(b =>
            (b.builderName ?? '').toLowerCase() === needle ||
            (b.brandName ?? '').toLowerCase() === needle ||
            (b.builderName ?? '').toLowerCase().includes(needle) ||
            (b.brandName ?? '').toLowerCase().includes(needle)
          ) ?? null
          const project = projects.find(p => p.builderName.toLowerCase().includes(needle))
          if (project) {
            artifact = {
              type: 'builder_trust',
              data: { ...project, trustScore: card.trustScore ?? builder?.totalTrustScore ?? project.trustScore, trustGrade: card.grade ?? builder?.grade ?? project.trustGrade },
              builder,
            }
            if (!builder) console.warn('[ARTIFACT] unresolved', card)
          } else {
            console.warn('[ARTIFACT] unresolved', card)
            artifact = { type: 'project_card', data: fallbackProject(card.builderName) }
          }
        }

        if (artifact) {
          // Dedup: skip if an artifact of same type + same project(s) already in history
          const current = artifact
          const isDupe = artifactHistoryRef.current.some(a => {
            if (a.type !== current.type) return false
            if (a.data?.id !== current.data?.id) return false
            if (current.dataB && a.dataB?.id !== current.dataB.id) return false
            return true
          })
          if (isDupe) continue

          const newHist = [...artifactHistoryRef.current, artifact]
          artifactHistoryRef.current = newHist
          artifactIndexRef.current = newHist.length - 1
          setArtifactHistory(newHist)
          setArtifactIndex(newHist.length - 1)
          setCurrentArtifact(artifact)
          setShowArtifact(true)
        }
      }

      // Keyword-based artifact detection removed — CARD triggers are now the sole source of truth.
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
      // Refresh buyerStage after AI response
      if (sessionId) {
        fetch(`/api/chat-sessions/${sessionId}`)
          .then(r => r.json())
          .then(d => {
            if (d.buyerStage) setBuyerStage(d.buyerStage)
            if (d.captureStage) setCaptureStage(d.captureStage)
          })
          .catch(() => {})
      }
    }
  }, [messages, isLoading, projects, artifactHistory, artifactIndex, sessionId])

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
    setArtifactHistory([])
    setArtifactIndex(-1)
    artifactHistoryRef.current = []
    artifactIndexRef.current = -1
    setShowArtifact(true)
    setCaptureStage(null)
    setCaptureSubmitted(false)
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
    // Pre-fill input from intent query params (e.g. from project page visit button)
    const intent = searchParams.get('intent')
    const projectName = searchParams.get('project')
    if (intent === 'visit' && projectName) {
      setInput(`I want to book a site visit for ${projectName}`)
    } else if (projectName) {
      setInput(`Tell me about ${projectName}`)
    }
  }, [])

  useEffect(() => {
    if (!urlSessionId) return
    const load = async () => {
      if (sessionLoadingRef.current) return
      sessionLoadingRef.current = true
      setLoadingSession(true)
      setMessages([])
      try {
        const res = await fetch(`/api/chat-sessions/${urlSessionId}`)
        if (!res.ok) return
        const data = await res.json()
        // Strip any legacy CARD blocks from historical messages (pre-Task-1 data
        // or client-side streaming edge cases may have persisted junk).
        const stripCards = (s: string) => s.replace(/<!--CARD:[\s\S]*?-->/g, '').trimEnd()
        const loaded: Message[] = (data.messages ?? [])
          .filter((m: any) => m.role !== 'assistant' || (m.content && m.content.trim().length > 0))
          .map((m: any) => ({
            id: uid(), role: m.role, content: m.role === 'assistant' ? stripCards(m.content) : m.content
          }))
        setMessages(loaded)
        setSessionId(urlSessionId)
        if (data.session?.buyerStage) setBuyerStage(data.session.buyerStage)
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
      finally { setLoadingSession(false); sessionLoadingRef.current = false }
    }
    load()
  }, [urlSessionId])

  return (
    <LazyMotion features={domAnimation} strict>
    <div className="flex h-dvh overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden absolute top-3 left-3 z-40 w-9 h-9 rounded-lg flex items-center justify-center shadow-sm"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
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
        builders={builders}
        showArtifact={showArtifact}
        onToggleArtifact={() => setShowArtifact(v => !v)}
        onRetry={lastFailedMsg ? retryLast : undefined}
        canGoBack={artifactIndex > 0}
        canGoForward={artifactIndex < artifactHistory.length - 1}
        onArtifactBack={goArtifactBack}
        onArtifactForward={goArtifactForward}
        buyerStage={buyerStage}
        artifactCurrent={artifactIndex + 1}
        artifactTotal={artifactHistory.length}
        artifactHistory={artifactHistory}
        compareToast={compareToast}
        userId={userId}
        userName={userName}
        userImage={userImage}
        onMessageAction={(msg) => {
          if (msg.action?.kind === 'signin') {
            const callbackUrl = typeof window !== 'undefined' ? window.location.href : '/chat'
            signIn('google', { callbackUrl })
          }
        }}
        onSelectArtifact={(index) => {
          artifactIndexRef.current = index
          setArtifactIndex(index)
          const selected = artifactHistoryRef.current[index]
          setCurrentArtifact(selected)
          setShowArtifact(true)
        }}
        captureCard={
          sessionId &&
          !captureSubmitted &&
          captureStage !== 'soft' &&
          captureStage !== 'verified' &&
          captureStage !== 'skipped' &&
          artifactHistory.length >= 1 ? (
            <StageACapture
              sessionId={sessionId}
              onComplete={() => setCaptureSubmitted(true)}
            />
          ) : null
        }
      />

      <ChatRightPanel
        artifact={artifact}
        builders={builders}
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
          setCurrentArtifact(artifactHistoryRef.current[index])
          setShowArtifact(true)
        }}
      />
    </div>
    </LazyMotion>
  )
}
