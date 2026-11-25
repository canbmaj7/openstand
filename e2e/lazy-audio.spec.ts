import { expect, test } from '@playwright/test'

test('renders the chord chart before the lazy audio engine finishes loading', async ({ page }) => {
  const delayedUrls: string[] = []
  await page.route('**/*.js', async (route) => {
    const url = route.request().url()
    if (/player|spessasynth/i.test(url)) {
      delayedUrls.push(url)
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
    if (!page.isClosed()) await route.continue()
  })

  const startedAt = Date.now()
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const chart = page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()
  await expect(chart).toBeVisible({ timeout: 1500 })
  expect(Date.now() - startedAt).toBeLessThan(1500)

  await expect(page.getByRole('button', { name: 'Loading sounds' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled({ timeout: 20_000 })
  expect(delayedUrls.length).toBeGreaterThan(0)
})
