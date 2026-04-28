'use client'

import { AdminErrorShell } from '@/components/admin/AdminStates'

export default function BuilderDetailError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <AdminErrorShell
      error={error}
      reset={reset}
      title="Couldn't load this builder."
      body="The builder may have been deleted, or the DB is briefly unreachable. Retry, or head back to the registry."
      back={{ href: '/admin/builders', label: 'All builders' }}
    />
  )
}
