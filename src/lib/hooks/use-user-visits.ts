// Sprint 11.Y (2026-05-05) — BUG-11. Buyer-side hook for retrieving
// the auth'd user's visit list (with visitTokens). Backed by the
// existing GET /api/visit-requests endpoint, which is already
// auth-gated to session.user.id. No new API surface added.
//
// Why client-side hook: the visit-token "View token" affordance
// renders inline on ProjectCardV2 (an in-chat artifact). Cards
// mount mid-conversation; we need a single fetch shared across all
// project cards in the conversation, not one fetch per card.
//
// Cache strategy: in-flight promise dedup + module-level cache so
// every consuming card hits the network once. Stale-on-mount is
// acceptable — visit token is immutable once issued, only new
// visits cause cache to need refresh (forceRefresh exposed for
// post-booking refresh).
//
// Privacy: endpoint is auth-gated server-side (returns 401 for
// anonymous). Anonymous users see empty array; no token leakage
// is possible from the client cache because the hook never
// receives data the server didn't authorize.

'use client'

import { useEffect, useState, useCallback } from 'react'

export interface UserVisit {
  id: string
  projectId: string
  visitToken: string | null
  visitScheduledDate: string | Date | null
  visitCompleted: boolean
  createdAt: string | Date
  project?: {
    projectName?: string | null
    builderName?: string | null
  } | null
}

interface CacheState {
  data: UserVisit[] | null
  inflight: Promise<UserVisit[]> | null
  fetchedAt: number
}

const cache: CacheState = { data: null, inflight: null, fetchedAt: 0 }

async function fetchVisits(): Promise<UserVisit[]> {
  if (cache.inflight) return cache.inflight
  cache.inflight = (async () => {
    try {
      const res = await fetch('/api/visit-requests', {
        method: 'GET',
        credentials: 'same-origin',
      })
      if (!res.ok) {
        // 401 (anonymous) and 5xx both fall through to empty — caller
        // checks .length to decide whether to render the affordance.
        cache.data = []
        cache.fetchedAt = Date.now()
        return cache.data
      }
      const json = (await res.json()) as UserVisit[]
      cache.data = Array.isArray(json) ? json : []
      cache.fetchedAt = Date.now()
      return cache.data
    } catch {
      cache.data = []
      cache.fetchedAt = Date.now()
      return cache.data
    } finally {
      cache.inflight = null
    }
  })()
  return cache.inflight
}

// Test-only: clears module-level cache between tests. Production
// code should never need this — visits are stable per session.
export function __resetUserVisitsCacheForTests(): void {
  cache.data = null
  cache.inflight = null
  cache.fetchedAt = 0
}

export function useUserVisits(): {
  visits: UserVisit[]
  loading: boolean
  refresh: () => void
} {
  const [visits, setVisits] = useState<UserVisit[]>(cache.data ?? [])
  const [loading, setLoading] = useState<boolean>(cache.data === null)

  useEffect(() => {
    let mounted = true
    if (cache.data !== null) {
      setVisits(cache.data)
      setLoading(false)
      return
    }
    setLoading(true)
    fetchVisits().then((data) => {
      if (mounted) {
        setVisits(data)
        setLoading(false)
      }
    })
    return () => { mounted = false }
  }, [])

  const refresh = useCallback(() => {
    cache.data = null
    setLoading(true)
    fetchVisits().then((data) => {
      setVisits(data)
      setLoading(false)
    })
  }, [])

  return { visits, loading, refresh }
}

// Convenience: filter helper for ProjectCardV2 + future consumers.
// Returns the most recent unexpired token for a given projectId,
// or null when no active visit exists.
export function findActiveVisitForProject(
  visits: UserVisit[],
  projectId: string,
): UserVisit | null {
  const matches = visits.filter(
    (v) => v.projectId === projectId && v.visitToken && !v.visitCompleted,
  )
  if (matches.length === 0) return null
  // Pick the most recently created among matches.
  return matches.reduce((latest, v) => {
    const lt = new Date(latest.createdAt).getTime()
    const vt = new Date(v.createdAt).getTime()
    return vt > lt ? v : latest
  })
}
