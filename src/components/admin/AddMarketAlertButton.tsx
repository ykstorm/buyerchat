'use client'

import { useState } from 'react'

const TYPES = [
  { value: 'price_change', label: '↑ Price change' },
  { value: 'new_launch', label: '+ New launch' },
  { value: 'delay', label: '! Delay' },
  { value: 'other', label: 'i Other' },
]

export default function AddMarketAlertButton() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('price_change')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectName, setProjectName] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!title.trim() || !description.trim()) return
    setSaving(true)
    try {
      await fetch('/api/admin/market-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, title, description, projectName: projectName || undefined }),
      })
      setOpen(false)
      setTitle(''); setDescription(''); setProjectName('')
      window.location.reload()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="text-[11px] text-[#185FA5] border border-[#185FA5]/30 px-2.5 py-1 rounded-lg hover:bg-[#EEF5FD] transition-colors">
        + Log move
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl border border-black/[0.08] p-5 w-[380px] max-w-[calc(100vw-2rem)] shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] font-semibold text-[#1A1A2E]">Log market move</p>
              <button type="button" onClick={() => setOpen(false)} className="text-[#52525B]">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-[#52525B] mb-1">Type</label>
                <div className="flex gap-2 flex-wrap">
                  {TYPES.map(t => (
                    <button key={t.value} type="button" onClick={() => setType(t.value)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${type === t.value ? 'bg-[#185FA5] text-white border-[#185FA5]' : 'border-black/10 text-[#52525B]'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-[#52525B] mb-1">Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full border border-black/10 rounded-lg px-3 py-2 text-[16px] md:text-[13px] focus:outline-none focus:border-[#185FA5]" />
              </div>
              <div>
                <label className="block text-[11px] text-[#52525B] mb-1">Details *</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                  className="w-full border border-black/10 rounded-lg px-3 py-2 text-[16px] md:text-[13px] focus:outline-none focus:border-[#185FA5] resize-none" />
              </div>
              <div>
                <label className="block text-[11px] text-[#52525B] mb-1">Project (optional)</label>
                <input value={projectName} onChange={e => setProjectName(e.target.value)}
                  className="w-full border border-black/10 rounded-lg px-3 py-2 text-[16px] md:text-[13px] focus:outline-none focus:border-[#185FA5]" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={save} disabled={saving || !title || !description}
                className="flex-1 bg-[#185FA5] text-white text-[12px] font-medium py-2 rounded-lg disabled:opacity-50">
                {saving ? 'Saving…' : 'Save move'}
              </button>
              <button type="button" onClick={() => setOpen(false)}
                className="px-4 text-[12px] text-[#52525B] border border-black/10 rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}