import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()
})

test('setting Count-in to Off skips count-in and starts immediately at Bar 1', async ({ page }) => {
  await page.getByRole('button', { name: 'Practice' }).click()
  const countInSelect = page.getByLabel('Count-in')
  await countInSelect.selectOption('off')
  await expect(countInSelect).toHaveValue('off')

  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()

  const readout = page.locator('.readout')
  await expect(readout).toContainText(/Bar\s1/)
  await expect(readout).not.toContainText('Count-in')

  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()

  // Preference persists across reload
  await page.reload()
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()
  await page.getByRole('button', { name: 'Practice' }).click()
  await expect(page.getByLabel('Count-in')).toHaveValue('off')
})

test('ChordHelper switches to Ukulele view and renders 4-string diagrams', async ({ page }) => {
  await page.locator('.chord:not(.chord-nc)').first().click()
  const helper = page.getByLabel('Chord helper')
  await expect(helper).toBeVisible()

  const ukuleleBtn = helper.getByRole('button', { name: 'Ukulele' })
  await ukuleleBtn.click()
  await expect(ukuleleBtn).toHaveAttribute('aria-pressed', 'true')
  await expect(helper.locator('.chords-piano')).not.toBeVisible()

  const diagrams = helper.locator('.chords-guitars svg[aria-label*="on ukulele"]')
  await expect(diagrams).toHaveCount(2)
  await expect(diagrams.nth(0)).toBeVisible()
  await expect(diagrams.nth(1)).toBeVisible()
  await expect(diagrams.nth(0).locator('.guitar-string')).toHaveCount(4)
  await expect(diagrams.nth(1).locator('.guitar-string')).toHaveCount(4)

  // Preference persists across reload
  await page.reload()
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()
  await page.locator('.chord:not(.chord-nc)').first().click()
  await expect(helper.getByRole('button', { name: 'Ukulele' })).toHaveAttribute('aria-pressed', 'true')
  await expect(helper.locator('.chords-guitars svg[aria-label*="on ukulele"]')).toHaveCount(2)
})
