'use client'
import { useState } from 'react'

export default function ProjectsPage() {
  const [form, setForm] = useState({
    projectName: '', builderName: '', microMarket: '',
    minPrice: '', maxPrice: '', pricePerSqft: '',
    availableUnits: '', possessionDate: '', reraNumber: '',
    latitude: '', longitude: '', constructionStatus: '',
    unitTypes: '', amenities: '',
  })
  const [status, setStatus] = useState('')

  async function handleSubmit() {
    setStatus('Saving...')
    const res = await fetch('/api/admin/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        minPrice: parseFloat(form.minPrice),
        maxPrice: parseFloat(form.maxPrice),
        pricePerSqft: parseFloat(form.pricePerSqft),
        availableUnits: parseInt(form.availableUnits),
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        possessionDate: new Date(form.possessionDate).toISOString(),
        unitTypes: form.unitTypes.split(',').map(s => s.trim()),
        amenities: form.amenities.split(',').map(s => s.trim()),
      }),
    })
    const data = await res.json()
    if (res.ok) setStatus('Project saved!')
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
      <h1 style={{ marginBottom: '8px' }}>Add Project</h1>
      <p style={{ color: '#666', marginBottom: '24px', fontSize: '13px' }}>For unitTypes and amenities — separate multiple values with commas</p>
      {input('projectName', 'Project Name')}
      {input('builderName', 'Builder Name (must match existing builder)')}
      {input('microMarket', 'Micro Market (e.g. Shela or South Bopal)')}
      {input('minPrice', 'Min Price (₹)', 'number')}
      {input('maxPrice', 'Max Price (₹)', 'number')}
      {input('pricePerSqft', 'Price per Sqft (₹)', 'number')}
      {input('availableUnits', 'Available Units', 'number')}
      {input('possessionDate', 'Possession Date', 'date')}
      {input('reraNumber', 'RERA Number')}
      {input('latitude', 'Latitude', 'number')}
      {input('longitude', 'Longitude', 'number')}
      {input('constructionStatus', 'Construction Status')}
      {input('unitTypes', 'Unit Types (e.g. 2BHK, 3BHK)')}
      {input('amenities', 'Amenities (e.g. Gym, Pool, Parking)')}
      <button
        onClick={handleSubmit}
        style={{ background: '#3de8a0', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
      >
        Save Project
      </button>
      {status && <p style={{ marginTop: '12px', color: status.includes('Error') ? 'red' : 'green' }}>{status}</p>}
    </div>
  )
}