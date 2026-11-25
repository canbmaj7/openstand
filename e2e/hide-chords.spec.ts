import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()
})

test('Hide chords = All hides all chords while playing, restores them on stop, and persists across reload', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))

  const practiceBtn = page.getByRole('button', { name: 'Practice' })
  await practiceBtn.click()
  const hideSelect = page.getByLabel('Hide chords')
  await expect(hideSelect).toHaveValue('off')
  await hideSelect.selectOption('all')
  await expect(hideSelect).toHaveValue('all')
  await expect(practiceBtn).toHaveClass(/band-toggle-active/)

  // Close Practice popover before playback assertions
  await practiceBtn.click()

  const playBtn = page.getByRole('button', { name: 'Play', exact: true })
  await expect(playBtn).toBeEnabled({ timeout: 20_000 })
  await playBtn.click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()

  const chartChords = page.locator('.sheet .chord')
  const count = await chartChords.count()
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i++) {
    await expect(chartChords.nth(i)).toHaveAttribute('aria-label', 'Hidden chord')
  }

  // Clicking a hidden chord must not open the chord helper
  await chartChords.first().click()
  await expect(page.getByLabel('Chord helper')).not.toBeVisible()

  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()

  await expect(chartChords.first()).not.toHaveAttribute('aria-label', 'Hidden chord')

  // Setting persists after page reload
  await page.reload()
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()
  await page.getByRole('button', { name: 'Practice' }).click()
  await expect(page.getByLabel('Hide chords')).toHaveValue('all')

  expect(errors).toEqual([])
})
