import { expect, test } from '@playwright/test'

test('changing a single bar time signature in the editor shows on the chart and plays cleanly', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.goto('/')
  await expect(page.locator('[aria-label$="chord chart"]').first()).toBeVisible()

  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await page.getByRole('button', { name: 'Bar 3' }).click()

  const onlyThisBar = page.getByLabel('Only this bar')
  await expect(onlyThisBar).toBeChecked()
  await page.getByLabel('Bar time signature').selectOption('3/4')

  await expect(page.locator('[data-measure="2"] .timesig')).toHaveAttribute('aria-label', '3/4 time')
  await expect(page.locator('[data-measure="3"] .timesig')).toHaveAttribute('aria-label', '4/4 time')

  await page.getByRole('button', { name: /^Save/ }).click()
  await expect(page.locator('[data-measure="2"] .timesig')).toHaveAttribute('aria-label', '3/4 time')
  await expect(page.locator('[data-measure="3"] .timesig')).toHaveAttribute('aria-label', '4/4 time')

  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()

  expect(errors).toEqual([])
})
