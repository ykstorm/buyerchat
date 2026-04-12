import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#09090b' }}>
      <div className="max-w-lg w-full text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-6" style={{ color: '#3de8a0' }}>
          Homesty.ai · South Bopal & Shela, Ahmedabad
        </p>
        <h1 className="text-[42px] font-bold leading-tight mb-3" style={{ fontFamily: 'serif', color: '#e0e0ea' }}>
          Honesty is rare.
          <br />
          <span style={{ color: '#3de8a0' }}>It comes with Homesty.</span>
        </h1>
        <p className="text-[15px] mb-10" style={{ color: '#636380' }}>
          India ka pehla buyer-side property platform.<br />
          No builder ads. No paid rankings. 1.5% only on closed deals.
        </p>
        <Link href="/chat"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-[15px] font-semibold transition-all hover:opacity-90"
          style={{ background: '#3de8a0', color: '#09090b' }}>
          Shuru karo →
        </Link>
        <div className="flex items-center justify-center gap-6 mt-10">
          {[
            'Buyer side only',
            '1.5% on close only',
            'No builder ads ever',
          ].map(t => (
            <div key={t} className="flex items-center gap-1.5">
              <span style={{ color: '#3de8a0' }}>✓</span>
              <span className="text-[12px]" style={{ color: '#454560' }}>{t}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 mt-8">
          <Link href="/projects" className="text-[12px] hover:underline" style={{ color: '#454560' }}>Browse projects</Link>
          <span style={{ color: '#2a2a3a' }}>·</span>
          <Link href="/admin" className="text-[12px] hover:underline" style={{ color: '#454560' }}>Admin</Link>
        </div>
      </div>
    </main>
  )
}
