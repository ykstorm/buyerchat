import { test, expect, devices } from '@playwright/test'

/**
 * Smoke tests — verify critical public surfaces render without errors.
 * These DO NOT require a test DB or OAuth, but do need a running dev server.
 * Run via: npm run test:smoke
 */
test.describe('@smoke basic page loads', () => {
  test('GET /chat renders and is interactive', async ({ page }) => {
    await page.goto('/chat')
    await expect(page).toHaveTitle(/./)

    // Chat surface should expose a composer input (textarea or role=textbox).
    const composer = page
      .getByRole('textbox')
      .or(page.locator('textarea'))
      .first()
    await expect(composer).toBeVisible({ timeout: 10_000 })
  })

  test('dark mode toggle flips html class', async ({ page }) => {
    await page.goto('/chat')

    const html = page.locator('html')
    const initialHasDark = await html.evaluate((el) => el.classList.contains('dark'))

    // Attempt to find a theme toggle — skip gracefully if the control is absent.
    const toggle = page
      .getByRole('button', { name: /theme|dark|light/i })
      .first()

    if ((await toggle.count()) === 0) {
      test.skip(true, 'No theme toggle found on /chat — skip dark-mode assertion')
      return
    }

    await toggle.click()
    await expect
      .poll(async () => html.evaluate((el) => el.classList.contains('dark')), {
        timeout: 3_000,
      })
      .not.toBe(initialHasDark)
  })

  test('sign-in entrypoint is visible from /chat', async ({ page }) => {
    await page.goto('/chat')
    const signIn = page
      .getByRole('link', { name: /sign ?in/i })
      .or(page.getByRole('button', { name: /sign ?in/i }))
      .first()
    await expect(signIn).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('@smoke mobile viewport', () => {
  test('/chat renders on 375x667 without horizontal overflow', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['Pixel 5'],
      viewport: { width: 375, height: 667 },
    })
    const page = await context.newPage()
    try {
      await page.goto('/chat')
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
      // Allow a 2px slack for scrollbar gutters.
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)
    } finally {
      await context.close()
    }
  })
})
