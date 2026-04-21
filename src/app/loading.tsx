export default function Loading() {
  return (
    <div className="flex h-screen items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <div
        className="w-5 h-5 rounded-full animate-spin"
        style={{
          border: '2px solid var(--border)',
          borderTopColor: 'var(--text-primary)',
        }}
      />
    </div>
  )
}
