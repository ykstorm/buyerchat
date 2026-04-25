import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

const EXTRACT_PROMPT = `Extract these fields from this RERA brochure PDF. Return ONLY valid JSON, no other text:
{
  "carpet_2bhk": number or null,
  "carpet_3bhk": number or null,
  "carpet_4bhk": number or null,
  "sbu_2bhk": number or null,
  "sbu_3bhk": number or null,
  "sbu_4bhk": number or null,
  "total_floors": number or null,
  "total_units": number or null,
  "configurations": string or null,
  "amenities": string or null,
  "possession_date": string or null,
  "loading_factor": number or null
}
Areas in sqft only. If not found use null.`

export async function POST(req: NextRequest) {
  const session = await auth()
  if (
    session?.user?.email?.toLowerCase() !==
    process.env.ADMIN_EMAIL?.toLowerCase()
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    let buffer: Buffer | null = null
    const contentType = req.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
      // New path: client uploaded directly to Cloudinary, then posted
      // back the secure URL. Bypasses the Vercel 4.5 MB body limit.
      const body = await req.json().catch(() => null)
      const url: unknown = body?.url
      if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
        return NextResponse.json(
          { error: 'Missing or invalid `url`' },
          { status: 400 },
        )
      }
      const res = await fetch(url)
      if (!res.ok) {
        return NextResponse.json(
          { error: `Failed to fetch PDF (${res.status})` },
          { status: 400 },
        )
      }
      const ab = await res.arrayBuffer()
      if (ab.byteLength > MAX_SIZE) {
        return NextResponse.json(
          { error: 'File too large. Maximum 10 MB.' },
          { status: 400 },
        )
      }
      buffer = Buffer.from(ab)
    } else {
      // Legacy fallback path: small PDFs uploaded as multipart/form-data.
      // Vercel's 4.5 MB body limit means anything larger should use the
      // Cloudinary URL path above instead.
      const formData = await req.formData()
      const file = formData.get('pdf') as File | null
      if (!file) {
        return NextResponse.json({ error: 'No PDF uploaded' }, { status: 400 })
      }
      const allowedTypes = ['application/pdf']
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: 'Only PDF files are accepted' },
          { status: 400 },
        )
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { error: 'File too large. Maximum 10 MB.' },
          { status: 400 },
        )
      }
      const ab = await file.arrayBuffer()
      buffer = Buffer.from(ab)
    }

    const base64 = buffer.toString('base64')
    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64,
              },
            },
            { type: 'text', text: EXTRACT_PROMPT },
          ],
        },
      ],
    })
    const text =
      response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()
    const extracted = JSON.parse(clean)
    return NextResponse.json({ success: true, data: extracted })
  } catch (err: unknown) {
    console.error('PDF extract error:', err)
    try {
      const Sentry = await import('@sentry/nextjs')
      Sentry.captureException(err)
    } catch {
      /* Sentry not configured */
    }
    const detail =
      process.env.NODE_ENV === 'development' && err instanceof Error
        ? err.message
        : err instanceof Error
        ? err.message
        : 'Extract failed'
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}
