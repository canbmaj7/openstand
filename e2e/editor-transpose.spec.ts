import { expect, test } from '@playwright/test'

test('changing the key in the editor moves the chords, unless Move chords is off', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[aria-label$="chord chart"]').first()).toBeVisible()
  await page.getByRole('button', { name: 'Edit', exact: true }).click()

  const keySelect = page.locator('.editor-tune').getByLabel('Key', { exact: true })
  const firstChord = page.locator('[data-measure="0"] .chord').first()
  await expect(firstChord).toHaveAttribute('aria-label', 'F7')

  // Jazz Blues in F -> G: F7 becomes G7, and undo brings F7 back
  await keySelect.selectOption({ label: 'G' })
  await expect(firstChord).toHaveAttribute('aria-label', 'G7')
  await expect(page.getByLabel('Chords in bar 1')).toHaveValue('G7')
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(firstChord).toHaveAttribute('aria-label', 'F7')

  // With Move chords off only the key changes
  await page.getByLabel('Move chords').uncheck()
  await keySelect.selectOption({ label: 'G' })
  await expect(firstChord).toHaveAttribute('aria-label', 'F7')
})
