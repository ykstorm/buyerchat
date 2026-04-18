'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error) }, [error])
  return (
    <div style={{ background: '#FAFAF8', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <p style={{ color: '#1C1917', fontSize: '16px' }}>Something went wrong</p>
      <button onClick={reset} style={{ background: '#1B4F8A', color: 'white', padding: '8px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', border: 'none' }}>Try again</button>
    </div>
  )
}
