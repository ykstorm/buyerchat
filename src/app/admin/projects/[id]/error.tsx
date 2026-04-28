'use client'

import { AdminErrorShell } from '@/components/admin/AdminStates'

export default function ProjectDetailError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <AdminErrorShell
      error={error}
      reset={reset}
      title="Couldn't load this project."
      body="The project may have been deleted, or the DB is briefly unreachable. Retry, or head back to the list."
      back={{ href: '/admin/projects', label: 'All projects' }}
    />
  )
}
