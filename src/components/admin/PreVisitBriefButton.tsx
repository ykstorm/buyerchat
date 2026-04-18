'use client'
import { useState } from 'react'

export default function PreVisitBriefButton({
  projectName, builderName, visitDate, buyerName, visitToken
}: {
  projectName: string
  builderName: string
  visitDate: string
  buyerName?: string | null
  visitToken: string
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const date = new Date(visitDate).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const brief = `Namaste,

${projectName} (${builderName}) ke liye ek verified buyer visit scheduled hai.

📅 Visit Date: ${date}
👤 Buyer: ${buyerName ?? 'Verified Buyer'}
🔐 Visit Token: ${visitToken}

Yeh buyer Homesty.ai platform se aaya hai — commission protected visit hai. Token verify karna zaroori hai site pe.

Please site manager ko inform kar dena.

Regards,
Balvir Singh
Homesty.ai`

  const copy = () => {
    navigator.clipboard.writeText(brief)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <button type="button" onClick={() => setOpen(!open)}
        className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors"
        style={{ background: 'rgba(167,139,250,0.1)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.2)' }}>
        Send Brief
      </button>
      {open && (
        <div className="mt-2 rounded-xl p-3" style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)', minWidth: '280px' }}>
          <pre className="text-[11px] whitespace-pre-wrap mb-2" style={{ color: '#D1D5DB', fontFamily: 'inherit' }}>{brief}</pre>
          <button type="button" onClick={copy}
            className="text-[11px] font-medium px-3 py-1.5 rounded-lg w-full transition-colors"
            style={{ background: copied ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)', color: copied ? '#34D399' : '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}>
            {copied ? '✓ Copied — paste in WhatsApp' : 'Copy brief'}
          </button>
        </div>
      )}
    </div>
  )
}
