import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()
})

test('tune list can be sorted by key or style and persists across reload', async ({ page }) => {
  const sortSelect = page.getByLabel('Sort tunes')
  await expect(sortSelect).toHaveValue('title')

  const titles = page.locator('.library-list .tune-title')
  const metas = page.locator('.library-list .tune-meta')

  // Switching to Style puts Aksak tunes first (different from Title order)
  await sortSelect.selectOption('style')
  await expect(titles.first()).toHaveText('Aksak 9/8 Vamp')

  // Switching to Key orders C major tunes first, then D major before D minor
  await sortSelect.selectOption('key')
  await expect(sortSelect).toHaveValue('key')
  await expect(titles.nth(0)).toHaveText('6/8 Ballad')
  await expect(metas.nth(0)).toHaveText(/· C$/)
  await expect(titles.nth(1)).toHaveText('Bossa Workout')
  await expect(metas.nth(1)).toHaveText(/· C$/)
  await expect(titles.nth(4)).toHaveText('Pop Waltz (3/4)')
  await expect(metas.nth(4)).toHaveText(/· D$/)

  // Preference persists across reload
  await page.reload()
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()
  await expect(page.getByLabel('Sort tunes')).toHaveValue('key')
  await expect(titles.nth(0)).toHaveText('6/8 Ballad')
  await expect(metas.nth(0)).toHaveText(/· C$/)
  await expect(titles.nth(1)).toHaveText('Bossa Workout')
})
