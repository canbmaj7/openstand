import { expect, test } from '@playwright/test'

test('editor undo/redo and copy/paste of bars', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.goto('/')
  await expect(page.locator('[aria-label$="chord chart"]').first()).toBeVisible()

  await page.getByRole('button', { name: 'Edit', exact: true }).click()

  const undoBtn = page.getByRole('button', { name: 'Undo' })
  const redoBtn = page.getByRole('button', { name: 'Redo' })
  const copyBtn = page.getByRole('button', { name: 'Copy bars' })
  const pasteBtn = page.getByRole('button', { name: 'Paste bars' })

  await expect(undoBtn).toBeDisabled()
  await expect(redoBtn).toBeDisabled()
  await expect(pasteBtn).toBeDisabled()

  // Change a chord in bar 1, then undo and redo
  const bar1Input = page.getByLabel('Chords in bar 1')
  await bar1Input.fill('G7')
  await expect(page.locator('[data-measure="0"] .chord').first().locator('.sr-only')).toHaveText('G7')
  await expect(undoBtn).toBeEnabled()

  await undoBtn.click()
  await expect(page.locator('[data-measure="0"] .chord').first().locator('.sr-only')).toHaveText('F7')
  await expect(bar1Input).toHaveValue('F7')
  await expect(undoBtn).toBeDisabled()
  await expect(redoBtn).toBeEnabled()

  await redoBtn.click()
  await expect(page.locator('[data-measure="0"] .chord').first().locator('.sr-only')).toHaveText('G7')
  await expect(bar1Input).toHaveValue('G7')

  // Uncommitted invalid chord text keeps native input undo instead of undoing chart history
  await bar1Input.fill('G7 invalidchord')
  await expect(bar1Input).toHaveAttribute('aria-invalid', 'true')
  await page.keyboard.press('Control+z')
  await expect(page.locator('[data-measure="0"] .chord').first().locator('.sr-only')).toHaveText('G7')

  // Select bars 1..2 with Shift+click, copy, and paste into bar 5
  await page.getByRole('button', { name: 'Bar 1', exact: true }).click()
  await page.getByRole('button', { name: 'Bar 2', exact: true }).click({ modifiers: ['Shift'] })
  await expect(page.getByRole('button', { name: 'Bar 1', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Bar 2', exact: true })).toHaveAttribute('aria-pressed', 'true')

  await copyBtn.click()
  await expect(pasteBtn).toBeEnabled()

  await page.getByRole('button', { name: 'Bar 5', exact: true }).click()
  await page.keyboard.press('Control+v')

  await expect(page.locator('[data-measure="4"] .chord').first().locator('.sr-only')).toHaveText('G7')
  await expect(page.locator('[data-measure="5"] .chord').first().locator('.sr-only')).toHaveText('Bb7')

  // Undo the paste with Ctrl+Z and redo with Ctrl+Shift+Z
  await page.keyboard.press('Control+z')
  await expect(page.locator('[data-measure="4"] .chord').first().locator('.sr-only')).toHaveText('Bb7')
  await expect(page.locator('[data-measure="5"] .chord').first().locator('.sr-only')).toHaveText('Bo7')

  await page.keyboard.press('Control+Shift+z')
  await expect(page.locator('[data-measure="4"] .chord').first().locator('.sr-only')).toHaveText('G7')
  await expect(page.locator('[data-measure="5"] .chord').first().locator('.sr-only')).toHaveText('Bb7')

  // Shift+ArrowRight extends selection from bar 5 to bar 6, and Delete empties both bars
  await page.getByRole('button', { name: 'Bar 5', exact: true }).focus()
  await page.keyboard.press('Shift+ArrowRight')
  await expect(page.getByRole('button', { name: 'Bar 5', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Bar 6', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Delete')
  await expect(page.locator('[data-measure="4"] .chord')).toHaveCount(0)
  await expect(page.locator('[data-measure="5"] .chord')).toHaveCount(0)

  await page.keyboard.press('Control+z')
  await expect(page.locator('[data-measure="4"] .chord').first().locator('.sr-only')).toHaveText('G7')
  await expect(page.locator('[data-measure="5"] .chord').first().locator('.sr-only')).toHaveText('Bb7')

  expect(errors).toEqual([])
})
