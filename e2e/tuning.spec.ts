import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()
})

test('mixer tuning defaults to 440 Hz, updates live, persists across reloads, resets, and falls back on corrupt storage', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  const mixerButton = page.getByRole('button', { name: /Mixer/ })
  await mixerButton.click()

  const tuningGroup = page.getByRole('group', { name: 'Tuning' })
  await expect(tuningGroup).toContainText('A4 = 440 Hz')
  await expect(page.getByRole('button', { name: 'Reset tuning to 440 Hz' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Raise tuning' }).click()
  await expect(tuningGroup).toContainText('A4 = 441 Hz')
  await expect(mixerButton).toHaveClass(/band-toggle-active/)
  await expect(page.getByRole('button', { name: 'Reset tuning to 440 Hz' })).toBeVisible()

  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
  await mixerButton.click()
  await page.getByRole('button', { name: 'Raise tuning' }).click()
  await expect(tuningGroup).toContainText('A4 = 442 Hz')
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()

  await mixerButton.click()
  await expect(page.getByRole('group', { name: 'Tuning' })).toContainText('A4 = 442 Hz')

  await page.getByRole('button', { name: 'Reset tuning to 440 Hz' }).click()
  await expect(page.getByRole('group', { name: 'Tuning' })).toContainText('A4 = 440 Hz')
  await expect(page.getByRole('button', { name: 'Reset tuning to 440 Hz' })).toHaveCount(0)
  await expect(mixerButton).not.toHaveClass(/band-toggle-active/)

  await page.evaluate(() => localStorage.setItem('openstand:tuning', 'not-a-number'))
  await page.reload()
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()
  await mixerButton.click()
  await expect(page.getByRole('group', { name: 'Tuning' })).toContainText('A4 = 440 Hz')

  expect(errors).toEqual([])
})

test('mixer tuning fits within 390px phone viewport without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: /Mixer/ }).click()
  await page.getByRole('button', { name: 'Raise tuning' }).click()
  await expect(page.getByRole('button', { name: 'Reset tuning to 440 Hz' })).toBeVisible()

  const overflow = await page.evaluate(() => {
    const doc = document.documentElement.scrollWidth - window.innerWidth
    const panel = document.querySelector('.popover-panel')
    const panelOverflow = panel ? panel.scrollWidth - panel.clientWidth : 0
    return { doc, panelOverflow }
  })
  expect(overflow.doc).toBeLessThanOrEqual(0)
  expect(overflow.panelOverflow).toBeLessThanOrEqual(0)

  const box = await page.getByRole('group', { name: 'Tuning' }).boundingBox()
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(390)
})
