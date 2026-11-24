import { expect, test, type Page } from '@playwright/test'

async function play(page: Page) {
  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
}

async function stop(page: Page) {
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()
})

test('clicking a chord starts playback from that chord skipping count-in', async ({ page }) => {
  // Click a chord in measure 2 (Bar 3)
  const targetChord = page.locator('.bar[data-measure="2"] .chord').first()
  await targetChord.click()

  // Verify visual start point indicator and accessibility label while stopped
  await expect(targetChord).toHaveClass(/chord-start/)
  await expect(targetChord).toHaveAttribute('aria-label', /start point/)

  // Press Play
  await play(page)

  // Visual indicator is hidden during playback
  await expect(targetChord).not.toHaveClass(/chord-start/)

  // The first active measure shown must be the clicked chord's measure (Bar 3), count-in skipped
  await expect(page.locator('.bar[data-measure="2"] .bar-highlight')).toBeVisible()
  await expect(page.locator('.readout')).toContainText(/Bar\s3/)

  // Stop playback
  await stop(page)

  // Stop closed the chord helper: the first click reopens it and keeps the start point,
  // clicking the open chord again removes it
  await targetChord.click()
  await expect(page.getByLabel('Chord helper')).toBeVisible()
  await expect(targetChord).toHaveClass(/chord-start/)
  await targetChord.click()
  await expect(targetChord).not.toHaveClass(/chord-start/)

  // Start playback again and verify it begins with count-in / bar 1
  await play(page)
  await expect(page.locator('.readout')).toContainText(/Count-in|Bar\s1/)

  await stop(page)
})
