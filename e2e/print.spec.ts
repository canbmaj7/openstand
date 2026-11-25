import { expect, test } from '@playwright/test'

test('Share menu opens the print dialog for a clean chart page', async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as unknown as { __printed: number }).__printed = 0
    window.print = () => {
      ;(window as unknown as { __printed: number }).__printed += 1
    }
  })
  await page.goto('/')
  await expect(page.locator('[aria-label$="chord chart"]').first()).toBeVisible()

  await page.getByRole('button', { name: 'Share' }).click()
  await page.getByRole('button', { name: /Print or save as PDF/ }).click()
  await expect.poll(() => page.evaluate(() => (window as unknown as { __printed: number }).__printed)).toBe(1)

  // The print stylesheet shows only the chart
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('.topbar')).toBeHidden()
  await expect(page.locator('.transport')).toBeHidden()
  await expect(page.locator('[aria-label$="chord chart"]').first()).toBeVisible()
})
