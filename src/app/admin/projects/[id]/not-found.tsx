import { AdminNotFoundShell } from '@/components/admin/AdminStates'

export default function ProjectNotFound() {
  return (
    <AdminNotFoundShell
      title="No project with this ID."
      body="It may have been deleted, the URL was mistyped, or the project never existed."
      back={{ href: '/admin/projects', label: 'Browse all projects' }}
    />
  )
}
