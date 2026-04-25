/**
 * Browser-side PDF upload helper. Used by the project edit/new admin
 * pages to bypass the Vercel 4.5 MB body limit that was previously
 * causing 413 on `/api/pdf-extract` for large RERA brochures.
 *
 * Flow:
 *   1. GET signed Cloudinary params from `/api/admin/cloudinary-sign`
 *   2. POST the raw file directly to `https://api.cloudinary.com/.../upload`
 *   3. POST `{ url: secureUrl }` to `/api/pdf-extract` (small JSON, no 413)
 */

export interface PdfExtractData {
  carpet_2bhk?: number | null
  carpet_3bhk?: number | null
  carpet_4bhk?: number | null
  sbu_2bhk?: number | null
  sbu_3bhk?: number | null
  sbu_4bhk?: number | null
  total_floors?: number | null
  total_units?: number | null
  configurations?: string | null
  amenities?: string | null
  possession_date?: string | null
  loading_factor?: number | null
}

interface SignedUpload {
  signature: string
  timestamp: number
  apiKey: string
  cloudName: string
  folder: string
}

async function getSignedParams(): Promise<SignedUpload> {
  const res = await fetch('/api/admin/cloudinary-sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder: 'pdfs' }),
  })
  if (!res.ok) {
    throw new Error(`cloudinary-sign failed (${res.status})`)
  }
  return (await res.json()) as SignedUpload
}

async function uploadToCloudinary(
  file: File,
  signed: SignedUpload,
): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('api_key', signed.apiKey)
  fd.append('timestamp', String(signed.timestamp))
  fd.append('signature', signed.signature)
  fd.append('folder', signed.folder)

  const url = `https://api.cloudinary.com/v1_1/${signed.cloudName}/auto/upload`
  const res = await fetch(url, { method: 'POST', body: fd })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Cloudinary upload failed (${res.status}) ${text}`)
  }
  const json = await res.json()
  const secure = json?.secure_url
  if (typeof secure !== 'string') {
    throw new Error('Cloudinary upload: missing secure_url')
  }
  return secure
}

export async function uploadAndExtractPdf(
  file: File,
): Promise<PdfExtractData | null> {
  const signed = await getSignedParams()
  const secureUrl = await uploadToCloudinary(file, signed)

  const res = await fetch('/api/pdf-extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: secureUrl }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`pdf-extract failed (${res.status}) ${text}`)
  }
  const json = await res.json()
  return (json?.data as PdfExtractData | undefined) ?? null
}
