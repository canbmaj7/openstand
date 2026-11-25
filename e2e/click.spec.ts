import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()
})

test('mixer has Click row that defaults to off, has no sound selector or active dot, and persists across reloads', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  const mixerButton = page.getByRole('button', { name: /Mixer/ })
  await expect(mixerButton).not.toHaveClass(/band-toggle-active/)
  await mixerButton.click()

  const clickStrip = page.locator('.mixer .strip').nth(3)
  await expect(clickStrip.locator('.label')).toHaveText('Click')
  await expect(clickStrip.locator('select')).toHaveCount(0)

  const clickSlider = clickStrip.getByRole('slider', { name: 'Click volume' })
  await expect(clickSlider).toBeVisible()
  const clickMute = clickStrip.getByRole('button', { name: 'Mute' })
  await expect(clickMute).toHaveAttribute('aria-pressed', 'true')

  // Enable Click and adjust volume
  await clickMute.click()
  await expect(clickMute).toHaveAttribute('aria-pressed', 'false')
  await expect(mixerButton).not.toHaveClass(/band-toggle-active/)
  await clickSlider.fill('80')
  await expect(clickSlider).toHaveValue('80')

  await page.reload()
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()

  await page.getByRole('button', { name: /Mixer/ }).click()
  const reloadedStrip = page.locator('.mixer .strip').nth(3)
  await expect(reloadedStrip.getByRole('button', { name: 'Mute' })).toHaveAttribute('aria-pressed', 'false')
  await expect(reloadedStrip.getByRole('slider', { name: 'Click volume' })).toHaveValue('80')
  await expect(page.getByRole('button', { name: /Mixer/ })).not.toHaveClass(/band-toggle-active/)

  // Legacy saved settings without a click key keep Click off by default
  await page.evaluate(() => {
    localStorage.setItem('openstand:muted', JSON.stringify({ bass: false, comp: false, drums: false }))
  })
  await page.reload()
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()
  await page.getByRole('button', { name: /Mixer/ }).click()
  await expect(page.locator('.mixer .strip').nth(3).getByRole('button', { name: 'Mute' })).toHaveAttribute('aria-pressed', 'true')

  expect(errors).toEqual([])
})
