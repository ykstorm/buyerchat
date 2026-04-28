'use client'

import { AdminErrorShell } from '@/components/admin/AdminStates'

export default function BuildersError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <AdminErrorShell
      error={error}
      reset={reset}
      title="Couldn't load the builder registry."
      body="Likely a transient DB blip. Retry once — if it sticks, check Neon connection limits."
      back={{ href: '/admin/overview', label: 'Overview' }}
    />
  )
}
