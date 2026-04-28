'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error) }, [error])
  return (
    <div style={{ background: '#09090b', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <p style={{ color: '#e0e0ea', fontSize: '16px' }}>We couldn&apos;t pull the list. This happens — click to retry.</p>
      <button onClick={reset} style={{ background: '#3de8a0', color: '#09090b', padding: '8px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', border: 'none' }}>Retry</button>
    </div>
  )
}
