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

test('downloads MP3 backing track from the Share menu', async ({ page }) => {
  test.setTimeout(90_000)

  await page.goto('/')
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()

  const fewerChoruses = page.getByRole('button', { name: 'Fewer choruses' })
  while (await fewerChoruses.isEnabled()) await fewerChoruses.click()

  await page.getByRole('button', { name: 'Share' }).click()
  const mp3Button = page.getByRole('button', { name: /Download audio \(MP3\)/ })
  await expect(mp3Button).toBeVisible()

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 90_000 }),
    mp3Button.click(),
  ])

  expect(download.suggestedFilename()).toMatch(/\.mp3$/)
  const path = await download.path()
  if (!path) throw new Error('Download path unavailable')
  const bytes = await readFile(path)
  const isId3 = bytes.subarray(0, 3).toString('ascii') === 'ID3'
  const isMpegSync = bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0
  expect(isId3 || isMpegSync).toBe(true)
})
