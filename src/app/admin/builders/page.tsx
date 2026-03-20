'use client'
import { useState } from 'react'

export default function BuildersPage() {
  const [form, setForm] = useState({
    builderName: '', brandName: '',
    deliveryScore: '', reraScore: '', qualityScore: '',
    financialScore: '', responsivenessScore: '',
    contactEmail: '', contactPhone: '',
    partnerStatus: false, commissionRatePct: '1.5',
  })
  const [status, setStatus] = useState('')

  async function handleSubmit() {
    setStatus('Saving...')
    const res = await fetch('/api/admin/builders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        deliveryScore: parseFloat(form.deliveryScore),
        reraScore: parseFloat(form.reraScore),
        qualityScore: parseFloat(form.qualityScore),
        financialScore: parseFloat(form.financialScore),
        responsivenessScore: parseFloat(form.responsivenessScore),
        commissionRatePct: parseFloat(form.commissionRatePct),
      }),
    })
    const data = await res.json()
    if (res.ok) setStatus('Builder saved!')
        else setStatus('Error: ' + JSON.stringify(data.error))
  }

  const input = (field: string, label: string, type = 'text') => (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '13px' }}>{label}</label>
      <input
        type={type}
        value={(form as any)[field]}
        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
      />
    </div>
  )

  return (
    <div style={{ maxWidth: '600px' }}>
      <h1 style={{ marginBottom: '24px' }}>Add Builder</h1>
      {input('builderName', 'Builder Name')}
      {input('brandName', 'Brand Name')}
      {input('deliveryScore', 'Delivery Score (out of 20)', 'number')}
      {input('reraScore', 'RERA Score (out of 20)', 'number')}
      {input('qualityScore', 'Quality Score (out of 20)', 'number')}
      {input('financialScore', 'Financial Score (out of 15)', 'number')}
      {input('responsivenessScore', 'Responsiveness Score (out of 15)', 'number')}
      {input('contactEmail', 'Contact Email')}
      {input('contactPhone', 'Contact Phone')}
      {input('commissionRatePct', 'Commission Rate %', 'number')}
      <button
        onClick={handleSubmit}
        style={{ background: '#3de8a0', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
      >
        Save Builder
      </button>
      {status && <p style={{ marginTop: '12px', color: status.includes('Error') ? 'red' : 'green' }}>{status}</p>}
    </div>
  )
}