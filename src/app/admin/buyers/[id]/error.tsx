'use client'

import { AdminErrorShell } from '@/components/admin/AdminStates'

export default function BuyerDetailError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <AdminErrorShell
      error={error}
      reset={reset}
      title="Couldn't load this buyer."
      body="The session may have been deleted, or the DB is briefly unreachable. Retry, or head back to the CRM."
      back={{ href: '/admin/buyers', label: 'All buyers' }}
    />
  )
}
