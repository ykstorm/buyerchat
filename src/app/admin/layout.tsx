import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session || session.user?.email !== process.env.ADMIN_EMAIL) {
    redirect('/auth/signin')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: '220px', background: '#111', color: '#fff', padding: '24px 16px' }}>
        <h2 style={{ color: '#3de8a0', marginBottom: '32px', fontSize: '16px' }}>BuyerChat Admin</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <a href="/admin" style={{ color: '#ccc', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px' }}>Dashboard</a>
          <a href="/admin/projects" style={{ color: '#ccc', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px' }}>Projects</a>
          <a href="/admin/builders" style={{ color: '#ccc', textDecoration: 'none', padding: '8px 12px', borderRadius: '6px' }}>Builders</a>
        </nav>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: '32px', background: '#f9f9f9' }}>
        {children}
      </div>
    </div>
  )
}