import { expect, test, type Page } from '@playwright/test'

const resetButton = (page: Page) =>
  page.getByRole('button', { name: "Reset to the tune's own tempo, key and repeats" })

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[aria-label$="chord chart"]').first()).toBeVisible()
})

test('Practice Swing persists across reload, resets back to Style, and disables when Style Lab is open', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))

  const practiceBtn = page.getByRole('button', { name: 'Practice' })
  const swingSelect = page.getByLabel('Swing', { exact: true })

  await practiceBtn.click()
  await expect(swingSelect).toHaveValue('')
  await expect(swingSelect.locator('option[value=""]')).toHaveText(/^Style \(/)

  await swingSelect.selectOption('heavy')
  await expect(swingSelect).toHaveValue('heavy')
  await expect(practiceBtn).toHaveClass(/band-toggle-active/)
  await expect(resetButton(page)).toBeVisible()

  await page.reload()
  await expect(page.locator('[aria-label$="chord chart"]').first()).toHaveAttribute('aria-label', /Jazz Blues/)
  await expect(resetButton(page)).toBeVisible()

  await practiceBtn.click()
  await expect(swingSelect).toHaveValue('heavy')
  await expect(practiceBtn).toHaveClass(/band-toggle-active/)
  await practiceBtn.click()

  await resetButton(page).click()
  await expect(resetButton(page)).toHaveCount(0)
  await expect(practiceBtn).not.toHaveClass(/band-toggle-active/)

  await practiceBtn.click()
  await expect(swingSelect).toHaveValue('')
  await expect(swingSelect.locator('option[value=""]')).toHaveText(/^Style \(/)
  await practiceBtn.click()

  // Style Lab disables the Practice Swing override selector
  await page.getByRole('button', { name: /^(style )?lab$/i }).click()
  await expect(page.getByRole('region', { name: 'Style lab' })).toBeVisible()
  await practiceBtn.click()
  await expect(swingSelect).toBeDisabled()

  expect(errors).toEqual([])
})
