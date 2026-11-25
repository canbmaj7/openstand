import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[aria-label$="chord chart"]').first()).toBeVisible()
})

test('shows Roman numerals and Nashville numbers via Aa popover, persists across reload, and shows letters in Edit mode', async ({ page }) => {
  const firstMain = page.locator('[data-measure="0"] .chord-main').first()
  const secondMain = page.locator('[data-measure="1"] .chord-main').first()
  const altChord = page.locator('[data-measure="7"] .chord-alt').first()
  const displayButton = page.getByRole('button', { name: 'Chord names and font' })

  // Default: letter roots (Jazz Blues in F: F7, Bb7, ...)
  await expect(firstMain).toHaveText('F7')
  await expect(secondMain).toHaveText(/^B.*7$/)

  // Open Aa popover and switch to Roman numerals
  await displayButton.click()
  const popover = page.locator('#chord-display')
  await expect(popover).toBeVisible()
  await popover.getByRole('button', { name: 'Roman numerals' }).click()

  await expect(firstMain).toHaveText('I7')
  await expect(firstMain).not.toContainText('F')
  await expect(secondMain).toHaveText('IV7')
  await expect(secondMain).not.toContainText('B')
  await expect(altChord).toContainText('III7')
  await expect(altChord).not.toContainText('A')

  // Switch to Numbers and verify, then back to Roman numerals
  await popover.getByRole('button', { name: 'Numbers' }).click()
  await expect(firstMain).toHaveText('17')
  await expect(secondMain).toHaveText('47')

  await popover.getByRole('button', { name: 'Roman numerals' }).click()
  await expect(firstMain).toHaveText('I7')

  // Escape closes the popover
  await page.keyboard.press('Escape')
  await expect(popover).not.toBeVisible()

  // Persists across reload
  await page.reload()
  await expect(firstMain).toHaveText('I7')
  await displayButton.click()
  await expect(popover.getByRole('button', { name: 'Roman numerals' })).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Escape')

  // Editor mode shows letter chords, then closing returns to Roman numerals
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(firstMain).toHaveText('F7')
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(firstMain).toHaveText('I7')
})
