// Skeleton loader for admin overview — shown by Next.js while page.tsx data loads
export default function OverviewLoading() {
  return (
    <div className="min-h-screen" style={{ background: '#0A0F1E' }}>
      {/* Header skeleton */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="h-6 w-44 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-3 w-56 rounded mt-2 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        </div>
        <div className="h-7 w-40 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>

      {/* KPI grid skeleton */}
      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-xl px-4 py-3" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="h-2.5 w-16 rounded animate-pulse mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="h-7 w-12 rounded animate-pulse mb-2" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-2 w-20 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          </div>
        ))}
      </div>

      {/* Bottom grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 w-24 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <div className="h-3 w-16 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <div className="h-3 flex-1 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  <div className="h-3 w-8 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
