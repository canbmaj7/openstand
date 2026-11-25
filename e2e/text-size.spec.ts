import { expect, test, type Page } from '@playwright/test'

const smaller = (page: Page) => page.getByRole('button', { name: 'Smaller chart' })
const larger = (page: Page) => page.getByRole('button', { name: 'Larger chart' })
const firstChord = (page: Page) => page.locator('.chord[aria-label]').first()

// Bars grow with the chart size at every step; chords grow only as far as the bar has room
const firstBar = (page: Page) => page.locator('.bar').first()
const barMinHeight = (page: Page) => firstBar(page).evaluate((el) => parseFloat(getComputedStyle(el).minHeight))

async function chordBoxHeight(page: Page): Promise<number> {
  const box = await firstBar(page).boundingBox()
  expect(box).not.toBeNull()
  return box!.height
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(firstChord(page)).toBeVisible()
})

test('chart size grows with A+, persists across reload, shrinks with A−, and disables at bounds', async ({ page }) => {
  await expect(smaller(page)).toHaveAttribute('title', /100%/)
  await expect(larger(page)).toHaveAttribute('title', /100%/)

  const baseHeight = await chordBoxHeight(page)

  // Grow twice: 100% -> 115% -> 130%
  await larger(page).click()
  await larger(page).click()
  await expect(larger(page)).toHaveAttribute('title', /130%/)

  const grownHeight = await chordBoxHeight(page)
  expect(grownHeight).toBeGreaterThan(baseHeight)

  // Persists after reload
  await page.reload()
  await expect(firstChord(page)).toBeVisible()
  await expect(larger(page)).toHaveAttribute('title', /130%/)
  expect(await chordBoxHeight(page)).toBeCloseTo(grownHeight, 0)

  // Shrink with A−: 130% -> 115% -> 100% -> 85%
  await smaller(page).click()
  await expect(smaller(page)).toHaveAttribute('title', /115%/)
  const shrunkHeight = await chordBoxHeight(page)
  expect(shrunkHeight).toBeLessThan(grownHeight)

  await smaller(page).click()
  await smaller(page).click()
  await expect(smaller(page)).toHaveAttribute('title', /85%/)
  await expect(smaller(page)).toBeDisabled()
  await expect(larger(page)).toBeEnabled()

  // Grow to max 150%
  await larger(page).click()
  await larger(page).click()
  await larger(page).click()
  await larger(page).click()
  await expect(larger(page)).toHaveAttribute('title', /150%/)
  await expect(larger(page)).toBeDisabled()
  await expect(smaller(page)).toBeEnabled()
})

test('keyboard shortcuts - and =/+ adjust chart size except in text inputs', async ({ page }) => {
  const search = page.getByLabel('Search tunes')
  await search.focus()
  await page.keyboard.press('=')
  await expect(larger(page)).toHaveAttribute('title', /100%/)
  await search.blur()

  await page.keyboard.press('=')
  await expect(larger(page)).toHaveAttribute('title', /115%/)
  await page.keyboard.press('+')
  await expect(larger(page)).toHaveAttribute('title', /130%/)
  await page.keyboard.press('-')
  await expect(smaller(page)).toHaveAttribute('title', /115%/)
})

test('print caps chart scale at 115% while preserving smaller scales', async ({ page }) => {
  // Set scale to 150%
  await larger(page).click()
  await larger(page).click()
  await larger(page).click()
  await expect(larger(page)).toHaveAttribute('title', /150%/)

  const screenSize150 = await barMinHeight(page)

  await page.emulateMedia({ media: 'print' })
  const printSizeAt150 = await barMinHeight(page)
  expect(printSizeAt150).toBeLessThan(screenSize150)

  // Compare against 115% in print: should match 115%
  await page.emulateMedia({ media: 'screen' })
  await smaller(page).click()
  await smaller(page).click()
  await expect(larger(page)).toHaveAttribute('title', /115%/)
  await page.emulateMedia({ media: 'print' })
  const printSizeAt115 = await barMinHeight(page)
  expect(printSizeAt150).toBeCloseTo(printSizeAt115, 1)

  // Compare against 85% in print: should keep 85%
  await page.emulateMedia({ media: 'screen' })
  await smaller(page).click()
  await smaller(page).click()
  await expect(smaller(page)).toHaveAttribute('title', /85%/)
  await page.emulateMedia({ media: 'print' })
  const printSizeAt85 = await barMinHeight(page)
  expect(printSizeAt85).toBeLessThan(printSizeAt115)
})

test('scale works with editor open and during playback', async ({ page }) => {
  await larger(page).click()
  await larger(page).click()
  await expect(larger(page)).toHaveAttribute('title', /130%/)

  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Chart editor' })).toBeVisible()
  const scaleVar = await page.locator('.sheet').evaluate((el) => getComputedStyle(el).getPropertyValue('--chart-scale').trim())
  expect(Number(scaleVar)).toBeCloseTo(1.3, 2)
  await page.getByRole('button', { name: 'Cancel' }).click()

  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
  await expect(page.locator('.bar-highlight')).toBeVisible()
  await page.getByRole('button', { name: 'Stop' }).click()
})

test('at 390x844 phone viewport, a saved large scale causes no overflow and the size buttons are hidden', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => localStorage.setItem('openstand:chart-scale', '150'))
  await page.reload()
  await expect(page.locator('[aria-label$="chord chart"]').first()).toBeVisible()
  await expect(larger(page)).toBeHidden()

  const overflow = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    stage: (document.querySelector('.stage')?.scrollWidth ?? 0) - (document.querySelector('.stage')?.clientWidth ?? 0),
    bars: [...document.querySelectorAll('.bar')].filter((b) =>
      [...b.querySelectorAll('.chord')].some((c) => c.getBoundingClientRect().right > b.getBoundingClientRect().right + 1),
    ).length,
  }))
  expect(overflow.doc).toBeLessThanOrEqual(0)
  expect(overflow.stage).toBeLessThanOrEqual(0)
  expect(overflow.bars).toBe(0)

  // The wordmark and every top bar control stay within the 390px viewport
  await expect(page.locator('.wordmark')).toBeVisible()
  const topbarOverflow = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.topbar button, .topbar a')).some(
      (el) => (el as HTMLElement).offsetParent !== null && el.getBoundingClientRect().right > window.innerWidth + 1,
    ),
  )
  expect(topbarOverflow).toBe(false)
})
