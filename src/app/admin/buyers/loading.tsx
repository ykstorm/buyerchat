export default function BuyersLoading() {
  return (
    <div className="min-h-screen" style={{ background: '#0A0F1E' }}>
      <div className="flex items-center justify-between mb-5">
        <div className="h-6 w-28 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="flex gap-2">
          <div className="h-7 w-20 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          <div className="h-7 w-20 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        </div>
      </div>
      {/* Kanban columns skeleton */}
      <div className="grid grid-cols-2 lg:flex lg:flex-row gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-1 rounded-2xl p-3" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', minWidth: 200 }}>
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 w-20 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-4 w-6 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="rounded-xl p-3 mb-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="h-3 w-24 rounded animate-pulse mb-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="h-2.5 w-16 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
