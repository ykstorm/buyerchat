import { test, expect } from '@playwright/test'

/**
 * Admin pricing form regression: edit a Project's pricing fields and save.
 * Protects /api/admin/projects/[id]/pricing (and the UI path).
 *
 * Requires:
 *   - Dev server running
 *   - Test DB with at least one Project row
 *   - An admin session cookie (seeded OAuth stub) — today there isn't one,
 *     so this spec skips unless E2E_SKIP is explicitly false AND a test
 *     project id is supplied via E2E_TEST_PROJECT_ID.
 */
test.skip(
  process.env.E2E_SKIP !== 'false' || !process.env.E2E_TEST_PROJECT_ID,
  'Needs admin session + E2E_TEST_PROJECT_ID to run',
)

test.describe('admin: pricing save path', () => {
  const projectId = process.env.E2E_TEST_PROJECT_ID ?? ''

  test('pricing form saves without error and round-trips the value', async ({ page }) => {
    await page.goto(`/admin/projects/${projectId}/pricing`)

    // Expect the pricing form to render at least one price input.
    const priceInput = page
      .getByLabel(/price|rate|psf/i)
      .first()
      .or(page.locator('input[name*="price" i]').first())

    await expect(priceInput).toBeVisible({ timeout: 10_000 })

    const originalValue = await priceInput.inputValue()
    const newValue = String(
      Math.max(1, Number(originalValue || '0')) + 1,
    )

    await priceInput.fill(newValue)

    const saveBtn = page
      .getByRole('button', { name: /save|update/i })
      .first()
    await saveBtn.click()

    // Expect some success signal — toast, banner, or form reset.
    const successBanner = page
      .getByText(/saved|updated|success/i)
      .first()
    await expect(successBanner).toBeVisible({ timeout: 10_000 })

    // Round-trip: reload and verify value persisted.
    await page.reload()
    await expect(priceInput).toHaveValue(newValue, { timeout: 5_000 })

    // Restore so the test is idempotent.
    await priceInput.fill(originalValue)
    await saveBtn.click()
  })
})
