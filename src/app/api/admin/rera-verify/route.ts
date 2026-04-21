import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// Lazy-load heavy deps — keeps cold-start fast for non-scraper routes
async function launchBrowser() {
  const chromium = (await import('@sparticuz/chromium')).default
  const puppeteer = (await import('puppeteer-core')).default

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1280, height: 900 },
    executablePath: await chromium.executablePath(),
    headless: true,
  })
  return browser
}

export const maxDuration = 30 // Vercel serverless timeout (seconds)

/**
 * POST /api/admin/rera-verify
 * Body: { reraNumber: "PR/GJ/AHMEDABAD/..." }
 *
 * Scrapes gujrera.gujarat.gov.in for project data.
 * Returns: { projectName, legalEntity, status, possessionDate, complaints, escrowBank, ... }
 */
export async function POST(req: NextRequest) {
  // Admin gate
  const session = await auth()
  if (session?.user?.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { reraNumber } = await req.json()
  if (!reraNumber || typeof reraNumber !== 'string') {
    return NextResponse.json({ error: 'reraNumber is required' }, { status: 400 })
  }

  const cleaned = reraNumber.trim().toUpperCase()

  let browser
  try {
    browser = await launchBrowser()
    const page = await browser.newPage()

    // Set a reasonable timeout
    page.setDefaultTimeout(15_000)

    // Navigate to the GujRERA project search page
    await page.goto('https://gujrera.gujarat.gov.in/certificate-search', {
      waitUntil: 'networkidle2',
      timeout: 15_000,
    })

    // Try the RERA number search input
    // The portal typically has a search form — try common selectors
    const searchSelectors = [
      'input[name="registration_no"]',
      'input[name="regNo"]',
      'input[name="searchText"]',
      'input[placeholder*="registration"]',
      'input[placeholder*="RERA"]',
      'input[placeholder*="project"]',
      '#registration_no',
      '#searchText',
      '#regNo',
    ]

    let inputFound = false
    for (const sel of searchSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 3000 })
        await page.type(sel, cleaned, { delay: 50 })
        inputFound = true
        break
      } catch {
        continue
      }
    }

    if (!inputFound) {
      // Fallback: try the main search on homepage
      await page.goto('https://gujrera.gujarat.gov.in', {
        waitUntil: 'networkidle2',
        timeout: 15_000,
      })

      // Look for any visible text input
      const inputs = await page.$$('input[type="text"]:not([hidden])')
      if (inputs.length > 0) {
        await inputs[0].type(cleaned, { delay: 50 })
        inputFound = true
      }
    }

    if (!inputFound) {
      return NextResponse.json({
        error: 'Could not find search input on RERA portal. Portal layout may have changed.',
        suggestion: 'Enter data manually',
      }, { status: 502 })
    }

    // Click search/submit button
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Search")',
      '.btn-search',
      '#btnSearch',
      'button.btn-primary',
    ]

    for (const sel of submitSelectors) {
      try {
        await page.click(sel)
        break
      } catch {
        continue
      }
    }

    // Wait for results to load
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10_000 }).catch(() => {})
    await new Promise(r => setTimeout(r, 2000)) // extra buffer for JS-rendered content

    // Extract project details from the results page
    const data = await page.evaluate(() => {
      const getText = (selectors: string[]): string => {
        for (const sel of selectors) {
          const el = document.querySelector(sel)
          if (el?.textContent?.trim()) return el.textContent.trim()
        }
        // Fallback: search all text nodes for label patterns
        return ''
      }

      const getByLabel = (label: string): string => {
        // Search for table rows or label-value pairs
        const allCells = Array.from(document.querySelectorAll('td, th, dt, dd, span, p, div'))
        for (let i = 0; i < allCells.length; i++) {
          const text = allCells[i]?.textContent?.trim().toLowerCase() ?? ''
          if (text.includes(label.toLowerCase())) {
            // Next sibling or next cell often has the value
            const next = allCells[i + 1]
            if (next?.textContent?.trim()) return next.textContent.trim()
          }
        }
        return ''
      }

      return {
        projectName: getByLabel('project name') || getByLabel('name of project') || getText(['.project-name', '#projectName']),
        legalEntity: getByLabel('promoter name') || getByLabel('legal entity') || getByLabel('company name') || getText(['.promoter-name']),
        status: getByLabel('project status') || getByLabel('status') || getText(['.project-status']),
        possessionDate: getByLabel('proposed date of completion') || getByLabel('completion date') || getByLabel('possession') || getText(['.completion-date']),
        startDate: getByLabel('start date') || getByLabel('commencement') || '',
        totalUnits: getByLabel('total units') || getByLabel('no. of units') || getByLabel('total apartments') || '',
        complaints: getByLabel('complaints') || getByLabel('grievance') || '',
        escrowBank: getByLabel('escrow') || getByLabel('bank') || '',
        district: getByLabel('district') || '',
        address: getByLabel('address') || getByLabel('project address') || '',
        landArea: getByLabel('land area') || getByLabel('total area') || '',
        pageTitle: document.title,
        bodySnippet: document.body.innerText.substring(0, 3000),
      }
    })

    // Check if we actually got meaningful data
    const hasData = data.projectName || data.legalEntity || data.status
    if (!hasData) {
      // Try to detect "no results" message
      const bodyText = data.bodySnippet.toLowerCase()
      if (bodyText.includes('no record') || bodyText.includes('not found') || bodyText.includes('no data')) {
        return NextResponse.json({
          error: `No project found for RERA number: ${cleaned}`,
          suggestion: 'Double-check the RERA number format (e.g., PR/GJ/AHMEDABAD/AHMEDABAD/...)',
        }, { status: 404 })
      }

      return NextResponse.json({
        error: 'Scraper could not extract structured data. Portal layout may have changed.',
        suggestion: 'Enter data manually and report this to dev team',
      }, { status: 502 })
    }

    // Clean up the data
    const result = {
      projectName: data.projectName || null,
      legalEntity: data.legalEntity || null,
      status: data.status || null,
      possessionDate: data.possessionDate || null,
      startDate: data.startDate || null,
      totalUnits: data.totalUnits ? parseInt(data.totalUnits.replace(/\D/g, '')) || null : null,
      complaints: data.complaints || '0',
      escrowBank: data.escrowBank || null,
      district: data.district || null,
      address: data.address || null,
      landArea: data.landArea || null,
      reraNumber: cleaned,
      scrapedAt: new Date().toISOString(),
    }

    return NextResponse.json(result)

  } catch (err: any) {
    console.error('[rera-verify] Scraper error:', err)
    return NextResponse.json({
      error: 'Scraper failed — portal may be down or blocking automated access',
      ...(process.env.NODE_ENV === 'development' && { detail: err.message }),
      suggestion: 'Try again later or enter data manually',
    }, { status: 502 })
  } finally {
    if (browser) {
      await browser.close().catch(() => {})
    }
  }
}
