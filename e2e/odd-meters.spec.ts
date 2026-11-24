import { expect, test } from '@playwright/test'

test('opens Aksak 9/8 Vamp, displays grouping, plays cleanly, and shows Grouping field for 7/8 in editor', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.goto('/')
  await expect(page.locator('[aria-label$="chord chart"]').first()).toBeVisible()

  await page.getByText('Aksak 9/8 Vamp', { exact: true }).click()
  await expect(page.locator('[aria-label$="chord chart"]').first()).toHaveAttribute('aria-label', /Aksak 9\/8 Vamp/)

  const timeSig = page.locator('[data-measure="0"] .timesig')
  await expect(timeSig).toHaveAttribute('aria-label', '9/8 time, 2+2+2+3')
  await expect(timeSig.locator('.timesig-groups')).toHaveText('2+2+2+3')

  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
  await page.waitForTimeout(1000)
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()

  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await page.locator('.editor-tune').getByLabel('Time').selectOption('7/8')
  const grouping = page.locator('.editor-tune').getByLabel('Grouping')
  await expect(grouping).toBeVisible()
  await expect(grouping).toHaveValue('3+2+2')

  expect(errors).toEqual([])
})
