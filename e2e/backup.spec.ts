import { readFile } from 'node:fs/promises'
import { expect, test, type Download } from '@playwright/test'

async function downloadText(download: Download): Promise<string> {
  const path = await download.path()
  if (!path) throw new Error('Download path unavailable')
  return readFile(path, 'utf8')
}

test('backs up library and restores tunes and setlists into a clean browser context', async ({ browser, page }) => {
  await page.goto('/')
  await expect(page.locator('[aria-label$="chord chart"]').first()).toBeVisible()

  // Create a custom tune
  await page.getByRole('button', { name: 'New', exact: true }).click()
  await page.getByRole('textbox', { name: 'Title' }).fill('Backup Waltz')
  await page.getByRole('button', { name: 'Save to My tunes' }).click()
  await expect(page.locator('[aria-label="Backup Waltz chord chart"]')).toBeVisible()

  // Create a setlist containing the custom tune and an example tune
  await page.getByRole('button', { name: 'Add to setlist' }).click()
  await page.getByRole('button', { name: 'New setlist…' }).click()
  await page.getByLabel('New setlist name').fill('Tour Set')
  await page.getByRole('button', { name: 'Create & add' }).click()

  await page.getByText('Jazz Blues', { exact: true }).click()
  await page.getByRole('button', { name: 'Add to setlist' }).click()
  await page.getByRole('button', { name: /Tour Set/ }).click()

  // Download full library backup from Import dialog
  await page.getByRole('button', { name: 'Import', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Import tunes' })
  await expect(dialog).toBeVisible()

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Back up library' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^openstand-backup-\d{4}-\d{2}-\d{2}\.json$/)

  const backupText = await downloadText(download)
  const backupJson = JSON.parse(backupText) as {
    format: string
    version: number
    tunes: Array<{ chart: { title: string }; source: string }>
    setlists: Array<{ name: string }>
  }
  expect(backupJson.format).toBe('openstand-backup')
  expect(backupJson.version).toBe(1)
  expect(backupJson.tunes.some((t) => t.chart.title === 'Backup Waltz')).toBe(true)
  expect(backupJson.tunes.some((t) => t.source === 'example')).toBe(false)
  expect(backupJson.setlists.some((s) => s.name === 'Tour Set')).toBe(true)

  await dialog.getByRole('button', { name: 'Close' }).click()

  // Restore into a brand-new browser context (empty IndexedDB & localStorage)
  const freshContext = await browser.newContext()
  const freshPage = await freshContext.newPage()
  try {
    await freshPage.goto('/')
    await expect(freshPage.locator('[aria-label$="chord chart"]').first()).toBeVisible()
    await expect(freshPage.locator('.library-list .tune-title', { hasText: 'Backup Waltz' })).toHaveCount(0)

    await freshPage.getByRole('button', { name: 'Import', exact: true }).click()
    const freshDialog = freshPage.getByRole('dialog', { name: 'Import tunes' })
    await expect(freshDialog).toBeVisible()

    await freshDialog.locator('input[type="file"]').setInputFiles({
      name: download.suggestedFilename(),
      mimeType: 'application/json',
      buffer: Buffer.from(backupText, 'utf8'),
    })
    await expect(freshDialog.locator('.dialog-status')).toContainText('Restored 1 tune, 1 setlist, 0 styles.')

    // Restoring the same backup again skips existing items without duplicating
    await freshDialog.locator('input[type="file"]').setInputFiles({
      name: download.suggestedFilename(),
      mimeType: 'application/json',
      buffer: Buffer.from(backupText, 'utf8'),
    })
    await expect(freshDialog.locator('.dialog-status')).toContainText(
      'Restored 0 tunes, 0 setlists, 0 styles. 2 were already here.',
    )
    await freshDialog.getByRole('button', { name: 'Close' }).click()

    await expect(freshPage.locator('.library-list .tune-title', { hasText: 'Backup Waltz' })).toBeVisible()
    await freshPage.getByRole('tab', { name: 'Setlists' }).click()
    await freshPage.getByRole('button', { name: /Tour Set/ }).click()
    await expect(freshPage.locator('.setlist-row')).toHaveCount(2)
    await expect(freshPage.locator('.setlist-row').nth(0)).toContainText('Backup Waltz')
    await expect(freshPage.locator('.setlist-row').nth(1)).toContainText('Jazz Blues')
  } finally {
    await freshContext.close()
  }
})
