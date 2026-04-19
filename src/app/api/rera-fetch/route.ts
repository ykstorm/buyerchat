import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { reraNumber } = await req.json()
  if (!reraNumber) return NextResponse.json({ error: 'RERA number required' }, { status: 400 })
  try {
    const chromium = (await import('@sparticuz/chromium')).default
    const puppeteer = (await import('puppeteer-core')).default
    const browser = await puppeteer.launch({
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
    await browser.close()
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
    const detail = process.env.NODE_ENV === 'development' && err instanceof Error
      ? err.message
      : 'RERA fetch failed. Try again.'
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}
