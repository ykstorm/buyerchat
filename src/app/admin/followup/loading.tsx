export default function FollowUpLoading() {
  return (
    <div className="min-h-screen" style={{ background: '#0A0F1E' }}>
      <div className="flex items-center justify-between mb-5">
        <div className="h-6 w-32 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-4 flex items-center justify-between" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div>
                <div className="h-3 w-32 rounded animate-pulse mb-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="h-2.5 w-20 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-7 w-20 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
              <div className="h-7 w-16 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
