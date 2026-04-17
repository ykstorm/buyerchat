import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'
export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const formData = await req.formData()
    const file = formData.get('pdf') as File
    if (!file) return NextResponse.json({ error: 'No PDF uploaded' }, { status: 400 })
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 }
          },
          {
            type: 'text',
            text: `Extract these fields from this RERA brochure PDF. Return ONLY valid JSON, no other text:
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
          }
        ]
      }]
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()
    const extracted = JSON.parse(clean)
    return NextResponse.json({ success: true, data: extracted })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Extract failed' }, { status: 500 })
  }
}
