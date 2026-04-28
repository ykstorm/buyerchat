import { AdminNotFoundShell } from '@/components/admin/AdminStates'

export default function BuyerNotFound() {
  return (
    <AdminNotFoundShell
      title="No buyer session with this ID."
      body="It may have been deleted, the URL was mistyped, or the session never existed."
      back={{ href: '/admin/buyers', label: 'Browse all buyers' }}
    />
  )
}
