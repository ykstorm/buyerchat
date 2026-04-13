export default function ProjectsLoading() {
  return (
    <div className="min-h-screen" style={{ background: '#0A0F1E' }}>
      <div className="flex items-center justify-between mb-5">
        <div className="h-6 w-32 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="h-8 w-28 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
        {/* Table header skeleton */}
        <div className="flex gap-4 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {[100, 60, 80, 70, 50].map((w, i) => (
            <div key={i} className="h-3 rounded animate-pulse" style={{ width: w, background: 'rgba(255,255,255,0.06)' }} />
          ))}
        </div>
        {/* Table rows skeleton */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="h-3 w-28 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
            <div className="h-3 w-16 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            <div className="h-3 w-20 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            <div className="h-3 w-14 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            <div className="h-5 w-16 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
