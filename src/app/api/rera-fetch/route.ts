import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { reraNumber } = await req.json()
  if (!reraNumber) return NextResponse.json({ error: 'RERA number required' }, { status: 400 })
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
    const data = await page.evaluate(() => {
      const getText = (selector: string) => document.querySelector(selector)?.textContent?.trim() ?? null

      return {
        projectName: getText('h1') ?? getText('.project-name') ?? getText('[class*="project"][class*="name"]'),
        builderName: getText('[class*="developer"]') ?? getText('[class*="promoter"]') ?? getText('[class*="builder"]'),
        possessionDate: getText('[class*="possession"]') ?? getText('[class*="completion"]'),
        totalUnits: getText('[class*="total"][class*="unit"]') ?? getText('[class*="units"]'),
        reraStatus: getText('[class*="status"]') ?? getText('[class*="rera-status"]'),
        escrowBank: getText('[class*="escrow"]'),
        complaints: getText('[class*="complaint"]') ?? '0',
        rawText: document.body.innerText.slice(0, 3000)
      }
    })
    // If selectors didn't work, try Claude API to parse rawText
    if (!data.projectName && data.rawText) {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const client = new Anthropic()
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Extract from this RERA page text. Return ONLY valid JSON:
{"projectName":string,"builderName":string,"possessionDate":string,"totalUnits":number,"reraStatus":string,"escrowBank":string,"complaints":number}
Page text:
${data.rawText}`
        }]
      })
      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      try {
        const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
        return NextResponse.json({ success: true, data: parsed, source: 'claude' })
      } catch {
        return NextResponse.json({ success: true, data, source: 'raw' })
      }
    }
    return NextResponse.json({ success: true, data, source: 'puppeteer' })
  } catch (err: any) {
    console.error('RERA fetch error:', err)
    try {
      const Sentry = await import('@sentry/nextjs')
      Sentry.captureException(err)
    } catch { /* Sentry not configured */ }

    // gujrera.gujarat.gov.in routinely geo-blocks non-India egress
    // (Vercel Hyderabad/SIN-1 functions, US dev laptops, etc). Treat
    // those failure modes as a soft "unavailable" so the admin UI can
    // show an inline note instead of a generic 500/error toast. Other
    // unexpected errors still surface as 500 below.
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

    const detail = process.env.NODE_ENV === 'development' && err instanceof Error
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
