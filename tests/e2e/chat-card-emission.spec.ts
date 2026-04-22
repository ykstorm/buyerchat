import { test, expect } from '@playwright/test'

/**
 * Regression: "4bhk under 85L" should produce a CARD artifact with no
 * mid-stream abort. Guards the comparison/intent pipeline + decision-card
 * injection path wired in /api/chat.
 *
 * Prereqs: dev server + test DB with at least one matching Project.
 * Skipped unless E2E_SKIP is not set.
 */
test.skip(
  process.env.E2E_SKIP === 'true',
  'Skipped without a test DB — set E2E_SKIP=false to run',
)

test.describe('chat: artifact card emission', () => {
  test('4bhk under 85L prompt renders a project card without abort', async ({ page }) => {
    await page.goto('/chat')

    const composer = page
      .getByRole('textbox')
      .or(page.locator('textarea'))
      .first()
    await composer.waitFor({ state: 'visible', timeout: 10_000 })
    await composer.fill('4bhk under 85L in Gurgaon')

    // Submit via Enter (most chat UIs) — fall back to a Send button if present.
    const sendBtn = page.getByRole('button', { name: /send|submit/i }).first()
    if (await sendBtn.isVisible().catch(() => false)) {
      await sendBtn.click()
    } else {
      await composer.press('Enter')
    }

    // A successful card render exposes either a data-testid on ProjectCardV2,
    // or a heading with the project name. Poll until stream resolves.
    const card = page
      .locator('[data-testid="project-card"]')
      .or(page.locator('[data-artifact-type="card"]'))
      .first()

    await expect(card).toBeVisible({ timeout: 30_000 })

    // No error banner / no "response aborted" text.
    await expect(page.getByText(/aborted|error occurred|failed to/i)).toHaveCount(0)
  })

  test('stream completes with visible assistant bubble', async ({ page }) => {
    await page.goto('/chat')
    const composer = page
      .getByRole('textbox')
      .or(page.locator('textarea'))
      .first()
    await composer.waitFor({ state: 'visible', timeout: 10_000 })

    await composer.fill('Show me 3bhk options under 1cr')
    await composer.press('Enter')

    // Assistant message appears — match either a role-tagged bubble or a
    // generic article element commonly used for chat turns.
    const assistantMsg = page
      .locator('[data-role="assistant"]')
      .or(page.getByRole('article'))
      .first()

    await expect(assistantMsg).toBeVisible({ timeout: 30_000 })
  })
})
