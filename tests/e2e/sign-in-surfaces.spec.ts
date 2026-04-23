import { test, expect } from '@playwright/test'

/**
 * I22-DUP — Sign-in surface invariant on /chat.
 *
 * Contract:
 *   - LOGGED-OUT: exactly ONE primary "Sign in" affordance should be visible
 *     on /chat. The canonical CTA is the ChatCenter top-right pill; the
 *     sidebar footer's "Sign in" link is a duplicate pointing to the same
 *     destination and should NOT both be visible with independent meaning.
 *     (We accept at least 1; duplicate affordances are a UX smell but the
 *     hard failure case is >1 when logged IN.)
 *   - LOGGED-IN: ZERO "Sign in" text should be visible. The only auth-related
 *     affordance should be "Sign out" (rendered in the sidebar footer).
 *
 * Why this matters: prior to I22-patch (commit 42a2dd4) the ChatCenter chip
 * was gated on `userName` — Google accounts without a display name showed a
 * "Sign in" pill NEXT to the sidebar's "Sign out" button, confusing users
 * into thinking their session had dropped. I22-patch switched the gate to
 * `userId` (canonical auth signal per src/lib/auth.ts session callback).
 * I22-DUP codifies that invariant so regressions surface in CI.
 *
 * Auth stubbing: the logged-in variant requires a NextAuth session cookie.
 * Without a stub DB / OAuth harness we can't mint a real JWT, so that test
 * skips unless E2E_SKIP === 'false'. The logged-out variant runs unconditionally.
 */

test.describe('chat: sign-in surface invariant', () => {
  test('logged-out /chat renders at least one (and not zero) sign-in affordance', async ({ page }) => {
    await page.goto('/chat')

    // Wait for the composer — proves the chat UI has rendered.
    const composer = page
      .getByRole('textbox')
      .or(page.locator('textarea'))
      .first()
    await composer.waitFor({ state: 'visible', timeout: 10_000 })

    // Count visible "Sign in" affordances (case-insensitive, allow "Sign In", "sign-in").
    // We match buttons AND links to cover both the ChatCenter pill and the sidebar footer link.
    const signInAffordances = page
      .getByRole('link', { name: /sign ?in/i })
      .or(page.getByRole('button', { name: /sign ?in/i }))

    const count = await signInAffordances.count()
    // Logged-out buyer MUST have a way to sign in.
    expect(count, 'Logged-out /chat should expose at least one sign-in affordance').toBeGreaterThanOrEqual(1)
  })

  test('logged-in /chat shows zero "Sign in" text and surfaces "Sign out"', async ({ page, context }) => {
    test.skip(
      process.env.E2E_SKIP !== 'false',
      'Needs an authenticated session cookie — set E2E_SKIP=false and provide E2E_SESSION_COOKIE to run',
    )

    const sessionCookie = process.env.E2E_SESSION_COOKIE
    if (!sessionCookie) {
      test.skip(true, 'E2E_SESSION_COOKIE not set — cannot stub an authed session')
      return
    }

    // Accept either a raw JWT value or a "name=value" pair.
    const cookieName = process.env.E2E_SESSION_COOKIE_NAME ?? 'authjs.session-token'
    const url = new URL(process.env.TEST_BASE_URL ?? 'http://localhost:3000')
    await context.addCookies([
      {
        name: cookieName,
        value: sessionCookie,
        domain: url.hostname,
        path: '/',
        httpOnly: true,
        secure: url.protocol === 'https:',
        sameSite: 'Lax',
      },
    ])

    await page.goto('/chat')

    const composer = page
      .getByRole('textbox')
      .or(page.locator('textarea'))
      .first()
    await composer.waitFor({ state: 'visible', timeout: 10_000 })

    // Invariant: an authenticated buyer sees NO "Sign in" text anywhere on /chat.
    const signInNodes = page.getByText(/sign ?in/i)
    const visibleSignIn = await signInNodes.count()
    expect(visibleSignIn, 'Authenticated /chat must not render any "Sign in" text').toBe(0)

    // Positive signal — "Sign out" should be present somewhere (sidebar footer).
    const signOut = page.getByRole('button', { name: /sign ?out/i })
    await expect(signOut.first()).toBeVisible({ timeout: 5_000 })
  })
})
