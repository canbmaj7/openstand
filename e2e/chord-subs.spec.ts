import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()
})

test('chord substitutions render above the chord, enable in Practice, and play cleanly', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))

  // A tune without substitutions disables the control and explains how to add one
  await page.getByText('Bossa Workout', { exact: true }).click()
  await expect(page.locator('[aria-label$="chord chart"]').first()).toHaveAttribute('aria-label', /Bossa Workout/)
  await page.getByRole('button', { name: 'Practice' }).click()
  const subsSelect = page.getByLabel('Substitutions')
  await expect(subsSelect).toBeDisabled()
  await expect(page.getByText('Add one in the editor: C7(Gb7)')).toBeVisible()

  // Select the example tune with substitutions from the Library
  await page.getByText('Jazz Blues', { exact: true }).click()
  await expect(page.locator('[aria-label$="chord chart"]').first()).toHaveAttribute('aria-label', /Jazz Blues/)

  const alt = page.locator('.chord-alt').first()
  await expect(alt).toBeVisible()
  const subChord = page.locator('.chord', { has: alt }).first()
  await expect(subChord).toHaveAttribute('aria-label', /, or /)

  // Alt chord text is smaller than the main chord
  const sizes = await subChord.evaluate((el) => {
    const mainEl = el.querySelector('.chord-main')
    const altEl = el.querySelector('.chord-alt')
    if (!mainEl || !altEl) return null
    return {
      main: parseFloat(getComputedStyle(mainEl).fontSize),
      alt: parseFloat(getComputedStyle(altEl).fontSize),
    }
  })
  expect(sizes).not.toBeNull()
  expect(sizes!.alt).toBeLessThan(sizes!.main)

  // Enable Substitutions = Every other chorus in Practice
  const practiceBtn = page.getByRole('button', { name: 'Practice' })
  await practiceBtn.click()
  await expect(subsSelect).toBeEnabled()
  await subsSelect.selectOption('alternate')
  await expect(subsSelect).toHaveValue('alternate')
  await expect(practiceBtn).toHaveClass(/band-toggle-active/)

  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
  await page.waitForTimeout(1000)
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()

  expect(errors).toEqual([])
})
