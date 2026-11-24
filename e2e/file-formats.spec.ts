import { readFile } from 'node:fs/promises'
import { expect, test, type Download } from '@playwright/test'

async function downloadText(download: Download): Promise<string> {
  const path = await download.path()
  if (!path) throw new Error('Download path unavailable')
  return readFile(path, 'utf8')
}

async function downloadBytes(download: Download): Promise<Buffer> {
  const path = await download.path()
  if (!path) throw new Error('Download path unavailable')
  return readFile(path)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()
})

test('downloads MIDI starting with MThd', async ({ page }) => {
  await page.getByRole('button', { name: 'Share' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Download MIDI/ }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/\.mid$/)
  const bytes = await downloadBytes(download)
  expect(bytes.subarray(0, 4).toString('ascii')).toBe('MThd')
})

test('downloads ChordPro grid with title and start_of_grid', async ({ page }) => {
  await page.getByRole('button', { name: 'Share' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Download ChordPro/ }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/\.cho$/)
  const text = await downloadText(download)
  expect(text).toContain('{title:')
  expect(text).toContain('{start_of_grid')
})

test('saves .openstand.json and re-opens it via Import dialog', async ({ page }) => {
  await page.getByRole('button', { name: 'Share' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Save as file/ }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/\.openstand\.json$/)
  const jsonText = await downloadText(download)
  const parsed = JSON.parse(jsonText) as { title: string }

  await page.getByRole('button', { name: 'Import', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Import tunes' })
  await expect(dialog).toBeVisible()
  await dialog.locator('input[type="file"]').setInputFiles({
    name: download.suggestedFilename(),
    mimeType: 'application/json',
    buffer: Buffer.from(jsonText, 'utf8'),
  })
  await expect(dialog.locator('.dialog-status')).toContainText('Added 1 tune')
  await dialog.getByRole('button', { name: 'Close' }).click()

  await page.getByLabel('Playlist').selectOption('Imported tunes')
  await expect(page.locator('.library-list .tune-title', { hasText: parsed.title }).first()).toBeVisible()
})

test('shows an error in Import dialog for a corrupt JSON file', async ({ page }) => {
  await page.getByRole('button', { name: 'Import', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Import tunes' })
  await expect(dialog).toBeVisible()
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'broken.openstand.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{ not valid json'),
  })
  await expect(dialog.locator('.dialog-status-error')).toBeVisible()
  await expect(dialog.locator('.dialog-status-error')).toContainText(/Invalid JSON/i)
})
