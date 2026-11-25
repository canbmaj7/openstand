import { expect, test, type Locator, type Page } from '@playwright/test'

const tapButton = (page: Page) => page.getByRole('button', { name: /Tap tempo/ })

async function paceClicks(button: Locator, count: number, intervalMs: number) {
  await button.click()
  const start = Date.now()
  for (let i = 1; i < count; i++) {
    const wait = start + i * intervalMs - Date.now()
    if (wait > 0) await button.page().waitForTimeout(wait)
    await button.click()
  }
}

async function paceKeys(page: Page, keys: string[], intervalMs: number) {
  await page.keyboard.press(keys[0])
  const start = Date.now()
  for (let i = 1; i < keys.length; i++) {
    const wait = start + i * intervalMs - Date.now()
    if (wait > 0) await page.waitForTimeout(wait)
    await page.keyboard.press(keys[i])
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[aria-label$="chord chart"]').first()).toBeVisible()
})

test('tapping the tempo button 4 times sets the tempo from the tap interval', async ({ page }) => {
  const button = tapButton(page)
  await expect(button).toHaveText('140')
  await expect(button).toHaveAttribute('title', 'Tap to set the tempo (T)')
  await expect(button).toHaveAttribute('aria-label', 'Tap tempo, 140 BPM')

  await paceClicks(button, 4, 400)

  const bpm = Number(await button.textContent())
  expect(bpm).toBeGreaterThanOrEqual(140)
  expect(bpm).toBeLessThanOrEqual(160)
  await expect(button).toHaveAttribute('aria-label', `Tap tempo, ${bpm} BPM`)
})

test('pressing T sets tap tempo outside text inputs and ignores typing in inputs', async ({ page }) => {
  const button = tapButton(page)
  await expect(button).toHaveText('140')

  await paceKeys(page, ['t', 'T', 't', 'T'], 500)

  const tappedBpm = Number(await button.textContent())
  expect(tappedBpm).toBeGreaterThanOrEqual(110)
  expect(tappedBpm).toBeLessThanOrEqual(130)

  // Typing "t" inside the search input must not trigger tap tempo
  const search = page.getByLabel('Search tunes')
  await search.focus()
  await paceKeys(page, ['t', 't', 't', 't'], 350)
  await expect(button).toHaveText(String(tappedBpm))
})

test('tap tempo button fits without horizontal overflow at 1366, 1280 and 390 px', async ({ page }) => {
  const button = tapButton(page)
  for (const width of [1366, 1280, 390]) {
    await page.setViewportSize({ width, height: 844 })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    await expect(button).toBeVisible()
    const box = await button.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1)
  }
})
