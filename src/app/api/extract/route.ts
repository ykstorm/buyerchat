// Sprint 11.13 (2026-05-05) — Mama Page 2 §11.1 universal extract API.
// Unified endpoint replacing pdf-extract route. Accepts PDF (via Cloudinary
// URL — same indirection as /api/pdf-extract to dodge Vercel's 4.5 MB body
// cap on Mama's 30-80 MB brochures) OR plain text. Returns structured JSON
// regardless of input mode.
//
// Why text mode: Mama can Ctrl+A from any PDF reader and paste — bypasses
// vision processing entirely. ~10x cheaper, ~6x faster than vision path.
//
// Admin-gated (operator-locked decision: spec omitted the gate; preserved
// here matching /api/pdf-extract pattern). Without it any unauth caller
// would burn Anthropic credit.

import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import * as Sentry from '@sentry/nextjs'

export const runtime = 'nodejs'
export const maxDuration = 90

const MAX_PDF_BYTES = 100 * 1024 * 1024 // 100 MB ceiling on server-side fetch

const ExtractRequestSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('pdf'),
    pdfUrl: z.string().url(),
    pdfName: z.string().optional(),
  }),
  z.object({
    mode: z.literal('text'),
    text: z.string().min(50).max(50_000),
    source: z.enum(['rera', 'brochure', 'general']).default('general'),
  }),
])

const PROMPT_BROCHURE = `You are a property data extractor for Homesty AI.
Read the input and return ONLY valid JSON with these fields:
- projectName (string)
- builder (string)
- location (string)
- configurations (array of {bhk: number, carpetSqft: number, sbaSqft: number, balcony: number})
- amenities (array of strings)
- specifications (object with flooring, kitchen, bathrooms, doors, lifts, powerBackup keys)
- towers (number)
- floorsPerTower (number)
- unitsPerFloor (number)
- bankApprovals (array of strings)

If a field is not present in the source, return null. Do not invent data.
Return ONLY the JSON object, no preamble or explanation.`

const PROMPT_RERA = `You are a RERA portal data extractor for Homesty AI.
Read the pasted GujRERA portal text and return ONLY valid JSON with:
- reraNumber (string, format like PR/GJ/AHMEDABAD/...)
- projectNameOfficial (string)
- builderLegalEntity (string)
- status (enum: 'Active' | 'On Hold' | 'Expired')
- possessionDate (ISO date string)
- totalProjectArea (number, in sqm or sqft as given)
- totalUnitsPlanned (number)
- activeComplaintsCount (number)
- escrowBank (string)
- promoters (array of strings — chairman, directors)
- projectType (enum: 'Residential' | 'Commercial' | 'Mixed')
- approvalAuthority (string — AUDA/AMC/etc)

If a field is not present, return null. Do not invent data.
Return ONLY the JSON object.`

export async function POST(req: Request) {
  // Admin gate — mirrors /api/pdf-extract:83-89 pattern.
  const session = await auth()
  if (
    session?.user?.email?.toLowerCase() !==
    process.env.ADMIN_EMAIL?.toLowerCase()
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = ExtractRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const client = new Anthropic()

  try {
    let response

    if (parsed.data.mode === 'pdf') {
      // Server-side fetch from Cloudinary (or any HTTPS URL). Buffer in
      // memory, base64 once, hand to Anthropic vision. The 4.5 MB Vercel
      // body cap applies to the request *body* (URL string is tiny);
      // the fetched buffer is bounded by MAX_PDF_BYTES.
      const pdfRes = await fetch(parsed.data.pdfUrl)
      if (!pdfRes.ok) {
        return NextResponse.json(
          { error: `Failed to fetch PDF (${pdfRes.status})` },
          { status: 400 },
        )
      }
      const ab = await pdfRes.arrayBuffer()
      if (ab.byteLength > MAX_PDF_BYTES) {
        return NextResponse.json(
          { error: 'PDF exceeds 100 MB ceiling' },
          { status: 400 },
        )
      }
      const pdfBase64 = Buffer.from(ab).toString('base64')

      response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: pdfBase64,
                },
              },
              { type: 'text', text: PROMPT_BROCHURE },
            ],
          },
        ],
      })
    } else {
      const systemPrompt =
        parsed.data.source === 'rera' ? PROMPT_RERA : PROMPT_BROCHURE
      response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: parsed.data.text }],
      })
    }

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    const cleanedJson = textBlock.text
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/, '')
      .trim()

    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(cleanedJson)
    } catch {
      try {
        Sentry.captureMessage('[EXTRACT_PARSE_FAIL]', {
          level: 'warning',
          extra: {
            mode: parsed.data.mode,
            source: parsed.data.mode === 'text' ? parsed.data.source : null,
            response_preview: textBlock.text.slice(0, 300),
          },
        })
      } catch { /* Sentry best-effort */ }
      return NextResponse.json(
        {
          error: 'AI response was not valid JSON',
          preview: textBlock.text.slice(0, 200),
        },
        { status: 502 },
      )
    }

    return NextResponse.json({
      ok: true,
      data: parsedJson,
      meta: {
        mode: parsed.data.mode,
        source: parsed.data.mode === 'text' ? parsed.data.source : null,
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    })
  } catch (err) {
    try {
      Sentry.captureException(err, { tags: { context: 'extract_api' } })
    } catch { /* Sentry best-effort */ }
    return NextResponse.json(
      {
        error: 'Extraction failed',
        message: err instanceof Error ? err.message : 'unknown',
      },
      { status: 500 },
    )
  }
}
