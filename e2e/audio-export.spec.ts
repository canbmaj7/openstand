import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

test('downloads WAV backing track from the Share menu', async ({ page }) => {
  test.setTimeout(90_000)

  await page.goto('/')
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()

  await page.getByRole('button', { name: 'Share' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 90_000 }),
    page.getByRole('button', { name: /Download audio \(WAV\)/ }).click(),
  ])

  expect(download.suggestedFilename()).toMatch(/\.wav$/)
  const path = await download.path()
  if (!path) throw new Error('Download path unavailable')
  const bytes = await readFile(path)
  expect(bytes.subarray(0, 4).toString('ascii')).toBe('RIFF')
  expect(bytes.subarray(8, 12).toString('ascii')).toBe('WAVE')
})
