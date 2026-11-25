import { expect, test } from '@playwright/test'

test('exercises playlist is listed, opens a 48-bar ii-V-I chart, and plays/stops cleanly', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.goto('/')
  await expect(page.locator('[aria-label$="chord chart"]').first()).toBeVisible()

  const playlist = page.getByLabel('Playlist')
  await expect(playlist.locator('option', { hasText: 'Exercises' })).toBeAttached()
  await playlist.selectOption('Exercises')
  await expect(page.getByRole('button', { name: 'Remove' })).toHaveCount(0)

  await page.getByText('ii–V–I Major (Cycle of Fourths)', { exact: true }).click()
  await expect(page.locator('[aria-label$="chord chart"]').first()).toHaveAttribute(
    'aria-label',
    /ii–V–I Major \(Cycle of Fourths\)/,
  )
  await expect(page.locator('.sheet .bar[data-measure]')).toHaveCount(48)

  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
  await expect(page.locator('.readout')).toContainText(/Count-in|Bar\s\d+/)
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()

  expect(errors).toEqual([])
})
