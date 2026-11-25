import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[aria-label$="chord chart"]').first()).toBeVisible()
})

test('create, add tunes, reorder, open, copy iReal link, persist, rename, and delete a setlist', async ({ page }) => {
  await page.getByRole('tab', { name: 'Setlists' }).click()
  await page.getByRole('button', { name: 'New setlist' }).click()
  await page.getByLabel('Setlist name').fill('Friday Gig')
  await page.getByRole('button', { name: 'Create' }).click()
  await expect(page.getByRole('button', { name: /Friday Gig/ })).toBeVisible()

  // Add two example tunes via the top bar menu
  await page.getByRole('tab', { name: 'Tunes' }).click()
  await page.getByText('Rhythm Changes (A section)', { exact: true }).click()
  await page.getByRole('button', { name: 'Add to setlist' }).click()
  await page.getByRole('button', { name: /Friday Gig/ }).click()

  await page.getByText('Four-Chord Pop (I–V–vi–IV)', { exact: true }).click()
  await page.getByRole('button', { name: 'Add to setlist' }).click()
  await page.getByRole('button', { name: /Friday Gig/ }).click()

  // Open setlist, reorder, open a tune from it, and verify active highlighting + iReal link
  await page.getByRole('tab', { name: 'Setlists' }).click()
  await page.getByRole('button', { name: /Friday Gig/ }).click()

  const rows = page.locator('.setlist-row')
  await expect(rows).toHaveCount(2)
  await expect(rows.nth(0)).toContainText('Rhythm Changes (A section)')
  await expect(rows.nth(1)).toContainText('Four-Chord Pop (I–V–vi–IV)')

  await rows.nth(1).getByRole('button', { name: 'Move up' }).click()
  await expect(rows.nth(0)).toContainText('Four-Chord Pop (I–V–vi–IV)')
  await expect(rows.nth(1)).toContainText('Rhythm Changes (A section)')

  await rows.nth(1).locator('.setlist-tune').click()
  await expect(page.locator('[aria-label$="chord chart"]').first()).toHaveAttribute('aria-label', /Rhythm Changes/)
  await expect(rows.nth(1).locator('.setlist-tune')).toHaveAttribute('aria-current', 'true')
  await expect(page.locator('.readout')).toContainText('Friday Gig · 2/2')

  await page.getByRole('button', { name: 'Copy iReal Pro link' }).click()
  await expect(page.getByRole('button', { name: 'Link copied' })).toBeVisible()
  const ireal = await page.evaluate(() => navigator.clipboard.readText())
  expect(ireal).toMatch(/^irealb:\/\//)
  expect(decodeURIComponent(ireal)).toContain('===Friday Gig')

  // Reload and verify setlist and order persist
  await page.reload()
  await expect(page.locator('[aria-label$="chord chart"]').first()).toBeVisible()
  await page.getByRole('tab', { name: 'Setlists' }).click()
  await page.getByRole('button', { name: /Friday Gig/ }).click()
  await expect(page.locator('.setlist-row').nth(0)).toContainText('Four-Chord Pop (I–V–vi–IV)')
  await expect(page.locator('.setlist-row').nth(1)).toContainText('Rhythm Changes (A section)')

  // Rename and delete with inline confirmation
  await page.getByRole('button', { name: 'Rename' }).click()
  await page.getByLabel('Rename setlist').fill('Saturday Gig')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('heading', { name: 'Saturday Gig' })).toBeVisible()

  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('Delete?')).toBeVisible()
  await page.getByRole('button', { name: 'No' }).click()
  await expect(page.getByRole('heading', { name: 'Saturday Gig' })).toBeVisible()

  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Yes' }).click()
  await expect(page.getByText('No setlists yet.')).toBeVisible()

  await page.reload()
  await page.getByRole('tab', { name: 'Setlists' }).click()
  await expect(page.getByText('No setlists yet.')).toBeVisible()
})

test('play-through persists and advances to the next tune when the first finishes', async ({ page }) => {
  test.setTimeout(45_000)

  await page.getByText('Rhythm Changes (A section)', { exact: true }).click()
  await page.getByRole('button', { name: 'Add to setlist' }).click()
  await page.getByRole('button', { name: 'New setlist…' }).click()
  await page.getByLabel('New setlist name').fill('Quick Set')
  await page.getByRole('button', { name: 'Create & add' }).click()

  await page.getByText('Four-Chord Pop (I–V–vi–IV)', { exact: true }).click()
  await page.getByRole('button', { name: 'Add to setlist' }).click()
  await page.getByRole('button', { name: /Quick Set/ }).click()

  await page.getByRole('tab', { name: 'Setlists' }).click()
  await page.getByRole('button', { name: /Quick Set/ }).click()

  const playThrough = page.getByRole('button', { name: 'Play through' })
  await expect(playThrough).toHaveAttribute('aria-pressed', 'false')
  await playThrough.click()
  await expect(playThrough).toHaveAttribute('aria-pressed', 'true')

  // Reload to verify Play through state persists in localStorage
  await page.reload()
  await expect(page.locator('[aria-label$="chord chart"]').first()).toBeVisible()
  await page.getByRole('tab', { name: 'Setlists' }).click()
  await page.getByRole('button', { name: /Quick Set/ }).click()
  await expect(page.getByRole('button', { name: 'Play through' })).toHaveAttribute('aria-pressed', 'true')

  // Open the first tune from the setlist, then speed up and shorten to 1 chorus without count-in
  await page.locator('.setlist-row').nth(0).locator('.setlist-tune').click()
  await expect(page.locator('[aria-label$="chord chart"]').first()).toHaveAttribute('aria-label', /Rhythm Changes/)

  await page.getByRole('button', { name: 'Practice' }).click()
  await page.getByLabel('Count-in').selectOption('off')
  await page.getByRole('button', { name: 'Practice' }).click()

  const fewer = page.getByRole('button', { name: 'Fewer choruses' })
  await fewer.click()
  await fewer.click()

  const faster = page.getByRole('button', { name: 'Faster' })
  for (let i = 0; i < 24; i++) {
    await faster.click()
  }

  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()

  await expect(page.locator('[aria-label$="chord chart"]').first()).toHaveAttribute('aria-label', /Four-Chord Pop/, {
    timeout: 25_000,
  })
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Stop' }).click()
})
