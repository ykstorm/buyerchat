import { AdminNotFoundShell } from '@/components/admin/AdminStates'

export default function BuilderNotFound() {
  return (
    <AdminNotFoundShell
      title="No builder with this ID."
      body="It may have been deleted, the URL was mistyped, or the builder never existed."
      back={{ href: '/admin/builders', label: 'Browse all builders' }}
    />
  )
}
