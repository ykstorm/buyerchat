'use client'
import { useState } from 'react'
import Link from 'next/link'

const TABS = ['Profile', 'System', 'Builder Numbers', 'Notifications']

export default function SettingsTabs({
  userName, email, projectCount, buyerCount, builderCount, day
}: {
  userName: string
  email: string
  projectCount: number
  buyerCount: number
  builderCount: number
  day: number
}) {
  const [active, setActive] = useState('Profile')
  const [saved, setSaved] = useState(false)

  const save = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {TABS.map(tab => (
          <button key={tab} type="button" onClick={() => setActive(tab)}
            className="px-4 py-2 text-[12px] font-medium border-b-2 -mb-px transition-colors"
            style={{ borderColor: active === tab ? '#60A5FA' : 'transparent', color: active === tab ? '#60A5FA' : '#6B7280' }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Profile */}
      {active === 'Profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: '#4B5563' }}>Profile Information</p>
            <div className="space-y-3">
              {[
                { label: 'Full Name', value: userName, type: 'text' },
                { label: 'Email', value: email, type: 'email' },
                { label: 'Role', value: 'Admin · Co-founder', type: 'text' },
                { label: 'Company', value: 'AaiGhar / BuyerChat Technologies LLP', type: 'text' },
                { label: 'City', value: 'Ahmedabad, Gujarat', type: 'text' },
              ].map(field => (
                <div key={field.label}>
                  <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: '#4B5563' }}>{field.label}</label>
                  <input type={field.type} defaultValue={field.value}
                    className="w-full px-3 py-2 rounded-lg text-[12px] text-white outline-none transition-colors"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(96,165,250,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </div>
              ))}
            </div>
            <button type="button" onClick={save} className="mt-4 text-[11px] font-medium px-4 py-2 rounded-lg transition-colors" style={{ background: saved ? 'rgba(52,211,153,0.1)' : 'rgba(96,165,250,0.1)', color: saved ? '#34D399' : '#60A5FA', border: `1px solid ${saved ? 'rgba(52,211,153,0.2)' : 'rgba(96,165,250,0.2)'}` }}>
              {saved ? '✓ Saved' : 'Save profile'}
            </button>
          </div>
          <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: '#4B5563' }}>Account Info</p>
            <div className="space-y-2 text-[12px] mb-4">
              {[
                { label: 'Account type', value: 'Admin', color: '#60A5FA' },
                { label: 'Co-admin', value: 'Lakshyaraj (Dev)', color: '#9CA3AF' },
                { label: 'Platform', value: 'BuyerChat.in + Admin', color: '#9CA3AF' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: '#6B7280' }}>{item.label}</span>
                  <span className="font-medium" style={{ color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#4B5563' }}>Danger Zone</p>
            <form action={async () => { 'use server' }}>
              <button type="button" onClick={() => { if (confirm('Sign out of all devices?')) save() }}
                className="w-full text-[11px] font-medium py-2 rounded-lg mb-2 transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}>
                Log out all devices
              </button>
            </form>
          </div>
        </div>
      )}

      {/* System */}
      {active === 'System' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: '#4B5563' }}>Database & System</p>
            <div className="space-y-2 text-[12px]">
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
          </div>
          <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: '#4B5563' }}>Locked Rules</p>
            <div className="space-y-1.5">
              {[
                'Builder phone never shown to buyer',
                'Commission rate: 1.5% only',
                'No paid project rankings ever',
                'Avoid projects hidden from AI',
                'Price quotes require Balvir review',
                'Commission disputes require Balvir review',
              ].map(rule => (
                <div key={rule} className="flex items-center gap-2 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: '#34D399' }}>✓</span>
                  <span className="text-[11px]" style={{ color: '#9CA3AF' }}>{rule}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Builder Numbers */}
      {active === 'Builder Numbers' && (
        <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#4B5563' }}>Builder WhatsApp Numbers</p>
          <p className="text-[11px] mb-4" style={{ color: '#6B7280' }}>Used for lead notification and visit brief. Never shared with buyers.</p>
          <div className="space-y-3">
            {['Goyal & Co. / HN Safal', 'Venus Group', 'Vishwanath Builders'].map(name => (
              <div key={name} className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: '#4B5563' }}>Builder</label>
                  <input type="text" defaultValue={name} readOnly className="w-full px-3 py-2 rounded-lg text-[12px] text-white outline-none" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: '#4B5563' }}>WhatsApp</label>
                  <input type="tel" placeholder="+91 XXXXX XXXXX" className="w-full px-3 py-2 rounded-lg text-[12px] text-white outline-none transition-colors" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} onFocus={e => e.target.style.borderColor = 'rgba(96,165,250,0.4)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={save} className="mt-4 text-[11px] font-medium px-4 py-2 rounded-lg" style={{ background: 'rgba(96,165,250,0.1)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.2)' }}>
            {saved ? '✓ Saved' : 'Save numbers'}
          </button>
          <Link href="/admin/builders" className="block mt-3 text-[11px] hover:underline" style={{ color: '#6B7280' }}>Manage full builder profiles →</Link>
        </div>
      )}

      {/* Notifications */}
      {active === 'Notifications' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: '#4B5563' }}>Alert Status</p>
            <div className="space-y-2 text-[12px]">
              {[
                { label: 'New buyer OTP registered', status: 'Email ✓', color: '#34D399' },
                { label: 'Post-visit 48h silence', status: 'Admin panel ✓', color: '#34D399' },
                { label: 'Commission overdue', status: 'Admin panel ✓', color: '#34D399' },
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
              <p className="text-[10px] mt-1" style={{ color: '#9CA3AF' }}>MSG91 DLT approval needed. Balvir action required.</p>
            </div>
          </div>
          <div className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: '#4B5563' }}>Alert Email</p>
            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: '#4B5563' }}>Email address</label>
            <input type="email" defaultValue={email} className="w-full px-3 py-2 rounded-lg text-[12px] text-white outline-none mb-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} onFocus={e => e.target.style.borderColor = 'rgba(96,165,250,0.4)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
            <button type="button" onClick={save} className="text-[11px] font-medium px-4 py-2 rounded-lg" style={{ background: 'rgba(96,165,250,0.1)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.2)' }}>
              {saved ? '✓ Saved' : 'Save email'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
