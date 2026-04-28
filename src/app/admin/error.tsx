'use client'

import { AdminErrorShell } from '@/components/admin/AdminStates'

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return <AdminErrorShell error={error} reset={reset} back={{ href: '/admin/overview', label: 'Overview' }} />
}
