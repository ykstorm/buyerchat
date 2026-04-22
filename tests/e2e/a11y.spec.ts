import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Accessibility baseline using axe-core.
 *
 * Policy:
 *   - FAIL on `critical` or `serious` violations.
 *   - WARN (log only) on `moderate` or `minor`.
 *
 * Audited pages:
 *   - /chat                                    (public buyer surface)
 *   - /admin                                   (admin dashboard)
 *   - /admin/projects/[id]/pricing             (admin form)
 *
 * Admin pages require a logged-in admin session; they skip unless an
 * auth stub is configured via AUTH_STATE_PATH (storageState JSON file).
 */
const severeImpacts = new Set(['critical', 'serious'])

function summarize(
  violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'],
) {
  return violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.length,
  }))
}

test.describe('a11y: public surfaces', () => {
  test('/chat has no critical/serious axe violations', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('domcontentloaded')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const severe = results.violations.filter((v) =>
      severeImpacts.has(v.impact ?? ''),
    )
    const mild = results.violations.filter(
      (v) => !severeImpacts.has(v.impact ?? ''),
    )

    if (mild.length) {
      // eslint-disable-next-line no-console
      console.warn('[a11y /chat] moderate/minor:', summarize(mild))
    }

    expect(
      severe,
      `Critical/serious a11y violations on /chat: ${JSON.stringify(
        summarize(severe),
        null,
        2,
      )}`,
    ).toEqual([])
  })
})

test.describe('a11y: admin surfaces', () => {
  test.skip(
    !process.env.AUTH_STATE_PATH,
    'Needs AUTH_STATE_PATH (Playwright storageState for an admin session)',
  )

  test.use({
    storageState: process.env.AUTH_STATE_PATH,
  })

  test('/admin has no critical/serious axe violations', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('domcontentloaded')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    const severe = results.violations.filter((v) =>
      severeImpacts.has(v.impact ?? ''),
    )
    expect(
      severe,
      `Critical/serious a11y violations on /admin: ${JSON.stringify(
        summarize(severe),
        null,
        2,
      )}`,
    ).toEqual([])
  })

  test('/admin/projects/[id]/pricing has no critical/serious axe violations', async ({
    page,
  }) => {
    const projectId = process.env.E2E_TEST_PROJECT_ID
    test.skip(!projectId, 'Needs E2E_TEST_PROJECT_ID')

    await page.goto(`/admin/projects/${projectId}/pricing`)
    await page.waitForLoadState('domcontentloaded')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    const severe = results.violations.filter((v) =>
      severeImpacts.has(v.impact ?? ''),
    )
    expect(
      severe,
      `Critical/serious a11y violations on pricing page: ${JSON.stringify(
        summarize(severe),
        null,
        2,
      )}`,
    ).toEqual([])
  })
})
