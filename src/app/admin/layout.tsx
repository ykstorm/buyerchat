// src/app/admin/layout.tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import AdminNavClient from '@/components/admin/AdminNavClient'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user || session.user.email !== process.env.ADMIN_EMAIL) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      <AdminNavClient userName={session.user.name ?? 'Admin'} />
      <main className="ml-14 mt-12 p-5 min-h-screen">
        {children}
      </main>
    </div>
  )
}
