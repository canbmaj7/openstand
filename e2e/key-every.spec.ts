import { expect, test } from '@playwright/test'

test('Keys can change every N choruses and the tune gets enough choruses for it', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[aria-label$="chord chart"]').first()).toBeVisible()

  await page.getByRole('button', { name: /^Practice/ }).click()
  const interval = page.getByLabel('Key change interval')
  await expect(interval).toBeDisabled()

  await page.getByLabel('Keys', { exact: true }).selectOption('5')
  await expect(interval).toBeEnabled()
  await expect(page.getByRole('group', { name: 'Choruses' }).locator('output')).toHaveText('12')

  await interval.selectOption('2')
  await expect(page.getByRole('group', { name: 'Choruses' }).locator('output')).toHaveText('24')
})
