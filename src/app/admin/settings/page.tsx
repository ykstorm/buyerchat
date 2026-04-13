import { auth, signOut } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user || session.user.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) redirect('/')

  const userName = session.user.name ?? 'Admin'
  const initial = userName.charAt(0).toUpperCase()

  const [projectCount, buyerCount, builderCount] = await Promise.all([
    prisma.project.count({ where: { isActive: true } }),
    prisma.chatSession.count(),
    prisma.builder.count(),
  ])

  const now = new Date()
  const PROJECT_START = new Date('2026-03-07')
  const day = Math.min(Math.ceil((now.getTime() - PROJECT_START.getTime()) / 86400000), 42)

  return (
    <div style={{ background: '#0A0F1E', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[18px] font-bold text-white">Settings</h1>
          <p className="text-[12px] mt-0.5" style={{ color: '#6B7280' }}>Profile · Security · System · Builder Numbers · Notifications</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[13px] font-semibold text-white">{userName}</p>
            <p className="text-[10px]" style={{ color: '#6B7280' }}>Admin · Co-founder</p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[16px] font-bold text-white" style={{ background: '#1B4F8A' }}>{initial}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Profile */}
        <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: '#4B5563' }}>👤 Profile</p>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[22px] font-bold text-white" style={{ background: '#1B4F8A' }}>{initial}</div>
            <div>
              <p className="text-[15px] font-bold text-white">{userName}</p>
              <p className="text-[11px]" style={{ color: '#6B7280' }}>Admin · AaiGhar / BuyerChat Technologies LLP</p>
            </div>
          </div>
          <div className="space-y-2 text-[12px]">
            {[
              { label: 'Email', value: session.user.email ?? '—' },
              { label: 'Account type', value: 'Admin' },
              { label: 'Company', value: 'AaiGhar / BuyerChat Technologies LLP' },
              { label: 'City', value: 'Ahmedabad, Gujarat' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: '#6B7280' }}>{item.label}</span>
                <span className="font-medium text-white">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            <form action={async () => {
              'use server'
              await signOut({ redirectTo: '/' })
            }}>
              <button type="submit" className="w-full text-[11px] font-medium py-2 rounded-lg transition-colors" style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                Sign out
              </button>
            </form>
          </div>
        </div>

        {/* System */}
        <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: '#4B5563' }}>⚙ System</p>
          <div className="space-y-2 text-[12px] mb-4">
            {[
              { label: 'Database', value: 'Neon PostgreSQL', color: '#34D399' },
              { label: 'Status', value: '● Connected', color: '#34D399' },
              { label: 'Active projects', value: String(projectCount), color: '#60A5FA' },
              { label: 'Total buyers', value: String(buyerCount), color: '#60A5FA' },
              { label: 'Builders', value: String(builderCount), color: '#60A5FA' },
              { label: 'AI Model', value: 'GPT-4o', color: '#A78BFA' },
              { label: 'Build day', value: `Day ${day} of 42`, color: '#FBBF24' },
              { label: 'Deploy', value: 'Vercel (auto)', color: '#9CA3AF' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: '#6B7280' }}>{item.label}</span>
                <span className="font-medium" style={{ color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#4B5563' }}>Locked rules</p>
          <div className="space-y-1.5 text-[11px]" style={{ color: '#9CA3AF' }}>
            {[
              '✓ Builder phone never shown to buyer',
              '✓ Commission rate: 1.5% only',
              '✓ No paid project rankings ever',
              '✓ Avoid projects hidden from AI',
              '✓ Price quotes require Balvir review',
              '✓ Commission disputes require Balvir review',
            ].map(rule => (
              <p key={rule} style={{ color: '#34D399' }}>{rule}</p>
            ))}
          </div>
        </div>

        {/* Builder Numbers */}
        <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#4B5563' }}>🏗 Builder Numbers</p>
          <p className="text-[11px] mb-4" style={{ color: '#6B7280' }}>WhatsApp numbers for lead notification and visit brief messages. Used by Balvir only — never shared with buyers.</p>
          <div className="space-y-2">
            {[
              { name: 'Goyal & Co. / HN Safal', phone: 'Contact via admin' },
              { name: 'Venus Group', phone: 'Contact via admin' },
              { name: 'Vishwanath Builders', phone: 'Contact via admin' },
            ].map(b => (
              <div key={b.name} className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-[12px] text-white">{b.name}</span>
                <span className="text-[11px]" style={{ color: '#6B7280' }}>{b.phone}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] mt-3" style={{ color: '#374151' }}>To update builder contacts, edit directly in the Builders section.</p>
          <Link href="/admin/builders" className="inline-block mt-2 text-[11px] hover:underline" style={{ color: '#60A5FA' }}>Go to Builders →</Link>
        </div>

        {/* Notifications */}
        <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: '#4B5563' }}>🔔 Notifications</p>
          <p className="text-[11px] mb-3" style={{ color: '#6B7280' }}>Alert configuration — currently managed via environment variables. WhatsApp integration pending DLT approval.</p>
          <div className="space-y-2 text-[12px]">
            {[
              { label: 'New buyer OTP registered', status: 'Email ✓', color: '#34D399' },
              { label: 'Post-visit 48h silence alert', status: 'Admin panel ✓', color: '#34D399' },
              { label: 'Commission overdue alert', status: 'Admin panel ✓', color: '#34D399' },
              { label: 'Critical AI violation', status: 'Email ✓', color: '#34D399' },
              { label: 'WhatsApp nudges', status: 'Pending DLT', color: '#FBBF24' },
              { label: 'SMS OTP', status: 'Pending DLT', color: '#FBBF24' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: '#9CA3AF' }}>{item.label}</span>
                <span className="text-[10px] font-semibold" style={{ color: item.color }}>{item.status}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl px-3 py-3" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
            <p className="text-[11px] font-semibold" style={{ color: '#FBBF24' }}>⏳ DLT Registration Pending</p>
            <p className="text-[10px] mt-1" style={{ color: '#9CA3AF' }}>MSG91 DLT approval needed before WhatsApp/SMS automation goes live. Contact: Balvir action required.</p>
          </div>
        </div>

      </div>
    </div>
  )
}
