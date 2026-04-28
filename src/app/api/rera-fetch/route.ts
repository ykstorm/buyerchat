import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import * as Sentry from '@sentry/nextjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { auditWrite } from '@/lib/audit-write'

export const runtime = 'nodejs'
export const maxDuration = 30

const RERA_REGEX = /^[A-Z0-9\-/]+$/i
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

type ScrapedFields = {
  projectName: string | null
  builderName: string | null
  possessionDate: string | null
  totalUnits: string | number | null
  reraStatus: string | null
  escrowBank: string | null
  complaints: string | number | null
  rawText?: string
}

interface RequestBody {
  reraNumber?: string
  projectId?: string
  force?: boolean
}

async function persistVerification(
  projectId: string,
  source: 'puppeteer' | 'claude' | 'raw',
  data: ScrapedFields | Record<string, unknown>,
  rawText: string | null,
  actor: string,
): Promise<void> {
  const verifiedAt = new Date()
  const reraDataPayload: Prisma.InputJsonValue = {
    source,
    fetchedAt: verifiedAt.toISOString(),
    scrapedFields: data as Prisma.InputJsonValue,
    rawTextSample: rawText ? rawText.slice(0, 500) : null,
  }
  await prisma.project.update({
    where: { id: projectId },
    data: {
      reraVerified: true,
      reraData: reraDataPayload,
      reraVerifiedAt: verifiedAt,
    },
  })
  await auditWrite({
    entity: 'Project',
    entityId: projectId,
    action: 'verify_rera',
    after: { reraVerified: true, source },
    actor,
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  const email = session?.user?.email?.toLowerCase()
  if (!email || email !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: RequestBody = {}
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const reraNumber = (body.reraNumber ?? '').trim()
  if (!reraNumber) {
    return NextResponse.json({ error: 'RERA number required' }, { status: 400 })
  }
  // Block E4: enforce RERA shape on the single-fetch path. Bulk-upload
  // closes the same regex; this brings parity to the per-row admin fetch.
  if (!RERA_REGEX.test(reraNumber)) {
    return NextResponse.json(
      { error: 'reraNumber must match /^[A-Z0-9\\-/]+$/i' },
      { status: 400 },
    )
  }

  const projectId = body.projectId
  const force = body.force === true

  if (projectId && !force) {
    const cached = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        reraData: true,
        reraVerified: true,
        reraVerifiedAt: true,
        reraNumber: true,
      },
    })
    if (
      cached?.reraVerified &&
      cached.reraVerifiedAt &&
      Date.now() - cached.reraVerifiedAt.getTime() < CACHE_TTL_MS
    ) {
      return NextResponse.json({
        success: true,
        data: cached.reraData,
        source: 'cache',
        verifiedAt: cached.reraVerifiedAt,
      })
    }
  }

  let browser: Awaited<ReturnType<typeof import('puppeteer-core').default.launch>> | null = null
  try {
    const chromium = (await import('@sparticuz/chromium')).default
    const puppeteer = (await import('puppeteer-core')).default
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')

    const url = `https://gujrera.gujarat.gov.in/project-details?projectno=${encodeURIComponent(reraNumber)}`
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    const data = (await page.evaluate(() => {
      const getText = (selector: string) =>
        document.querySelector(selector)?.textContent?.trim() ?? null

      return {
        projectName:
          getText('h1') ??
          getText('.project-name') ??
          getText('[class*="project"][class*="name"]'),
        builderName:
          getText('[class*="developer"]') ??
          getText('[class*="promoter"]') ??
          getText('[class*="builder"]'),
        possessionDate:
          getText('[class*="possession"]') ?? getText('[class*="completion"]'),
        totalUnits:
          getText('[class*="total"][class*="unit"]') ?? getText('[class*="units"]'),
        reraStatus: getText('[class*="status"]') ?? getText('[class*="rera-status"]'),
        escrowBank: getText('[class*="escrow"]'),
        complaints: getText('[class*="complaint"]') ?? '0',
        rawText: document.body.innerText.slice(0, 3000),
      }
    })) as ScrapedFields

    // If selectors didn't work, try Claude API to parse rawText
    if (!data.projectName && data.rawText) {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const client = new Anthropic()
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `Extract from this RERA page text. Return ONLY valid JSON:
{"projectName":string,"builderName":string,"possessionDate":string,"totalUnits":number,"reraStatus":string,"escrowBank":string,"complaints":number}
Page text:
${data.rawText}`,
          },
        ],
      })
      const text =
        response.content[0].type === 'text' ? response.content[0].text : ''
      try {
        const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
        if (projectId) {
          await persistVerification(projectId, 'claude', parsed, data.rawText, email)
        }
        return NextResponse.json({ success: true, data: parsed, source: 'claude' })
      } catch {
        if (projectId) {
          await persistVerification(projectId, 'raw', data, data.rawText, email)
        }
        return NextResponse.json({ success: true, data, source: 'raw' })
      }
    }
    if (projectId) {
      await persistVerification(projectId, 'puppeteer', data, data.rawText ?? null, email)
    }
    return NextResponse.json({ success: true, data, source: 'puppeteer' })
  } catch (err) {
    console.error('RERA fetch error:', err)
    Sentry.captureException(err, { tags: { module: 'rera-fetch' } })

    // gujrera.gujarat.gov.in routinely geo-blocks non-India egress
    // (Vercel Hyderabad/SIN-1 functions, US dev laptops, etc). Treat
    // those failure modes as a soft "unavailable" so the admin UI can
    // show an inline note instead of a generic 500/error toast.
    //
    // Per Day 1 Q5: geo-block must NOT flip reraVerified=true. The branch
    // returns 200 + ok:false WITHOUT calling persistVerification.
    const msg = err instanceof Error ? err.message.toLowerCase() : ''
    const isGeoOrTimeout =
      msg.includes('timeout') ||
      msg.includes('etimedout') ||
      msg.includes('econnrefused') ||
      msg.includes('econnreset') ||
      msg.includes('enotfound') ||
      msg.includes('navigation') ||
      msg.includes('net::err') ||
      msg.includes('blocked') ||
      msg.includes('403') ||
      msg.includes('502') ||
      msg.includes('503') ||
      msg.includes('504')
    if (isGeoOrTimeout) {
      return NextResponse.json(
        {
          ok: false,
          reason: 'RERA portal unavailable from this region',
          suggestion: 'Verify manually on https://gujrera.gujarat.gov.in',
          code: 'RERA_GEO_BLOCKED',
        },
        { status: 200 },
      )
    }

    const detail =
      process.env.NODE_ENV === 'development' && err instanceof Error
        ? err.message
        : 'RERA fetch failed. Try again.'
    return NextResponse.json({ error: detail }, { status: 500 })
  } finally {
    if (browser) {
      try {
        await browser.close()
      } catch (closeErr) {
        console.error('RERA browser close error:', closeErr)
      }
    }
  }
}
