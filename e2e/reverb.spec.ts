import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()
})

test('mixer has a reverb fader that defaults to 64, updates live, persists across reloads, and falls back on corrupt storage', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  await page.getByRole('button', { name: /Mixer/ }).click()
  const reverb = page.getByRole('slider', { name: 'Reverb' })
  await expect(reverb).toBeVisible()
  await expect(reverb).toHaveValue('64')

  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
  await page.getByRole('button', { name: /Mixer/ }).click()
  await reverb.fill('95')
  await expect(reverb).toHaveValue('95')
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()

  await page.getByRole('button', { name: /Mixer/ }).click()
  await expect(page.getByRole('slider', { name: 'Reverb' })).toHaveValue('95')

  await page.evaluate(() => localStorage.setItem('openstand:reverb', 'not-a-number'))
  await page.reload()
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()
  await page.getByRole('button', { name: /Mixer/ }).click()
  await expect(page.getByRole('slider', { name: 'Reverb' })).toHaveValue('64')

  expect(errors).toEqual([])
})
