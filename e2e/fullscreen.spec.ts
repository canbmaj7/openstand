import { expect, test, type Page } from '@playwright/test'

const app = (page: Page) => page.locator('.app')
const enterButton = (page: Page) => page.getByRole('button', { name: 'Full screen' })
const exitButton = (page: Page) => page.getByRole('button', { name: 'Exit full screen' })
const playButton = (page: Page) => page.getByRole('button', { name: 'Play', exact: true })
const stopButton = (page: Page) => page.getByRole('button', { name: 'Stop' })
const barNumber = async (page: Page) => Number((await page.locator('.readout').textContent())?.match(/Bar\s(\d+)/)?.[1] ?? 0)

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    stage: (document.querySelector('.stage')?.scrollWidth ?? 0) - (document.querySelector('.stage')?.clientWidth ?? 0),
    transport:
      (document.querySelector('.transport')?.scrollWidth ?? 0) - (document.querySelector('.transport')?.clientWidth ?? 0),
    clippedControls: Array.from(document.querySelectorAll('.topbar button, .topbar a, .transport button')).filter(
      (el) => (el as HTMLElement).offsetParent !== null && el.getBoundingClientRect().right > window.innerWidth + 1,
    ).length,
  }))
  expect(overflow.doc).toBeLessThanOrEqual(0)
  expect(overflow.stage).toBeLessThanOrEqual(0)
  expect(overflow.transport).toBeLessThanOrEqual(0)
  expect(overflow.clippedControls).toBe(0)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[aria-label$="chord chart"]').first()).toBeVisible()
})

test('opens via button, hides chrome, plays/stops, preserves scale, and closes via Exit', async ({ page }) => {
  await page.getByRole('button', { name: 'Larger chart' }).click()
  await page.getByRole('button', { name: 'Larger chart' }).click()

  await enterButton(page).click()
  await expect(app(page)).toHaveAttribute('data-fullscreen', 'true')
  await expect(page.locator('.topbar')).toBeHidden()
  await expect(page.locator('.library')).toBeHidden()
  await expect(page.locator('.sheet')).toBeVisible()
  await expect(playButton(page)).toBeVisible()
  await expect(page.locator('.readout')).toBeVisible()
  await expect(page.locator('.control-tempo .stepper-value')).toBeVisible()
  await expect(exitButton(page)).toBeVisible()

  await expect(page.locator('.transport-band')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Practice' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Mixer' })).toBeHidden()

  const scaleVar = await page.locator('.sheet').evaluate((el) => getComputedStyle(el).getPropertyValue('--chart-scale').trim())
  expect(Number(scaleVar)).toBeCloseTo(1.3, 2)

  await playButton(page).click()
  await expect(stopButton(page)).toBeVisible()
  await expect(page.locator('.readout')).toContainText(/Bar\s\d+/)
  const first = await barNumber(page)
  await expect.poll(() => barNumber(page), { timeout: 20_000 }).toBeGreaterThan(first)
  await expect(page.locator('.bar-highlight')).toBeVisible()

  // Space toggles playback in full screen too
  await page.keyboard.press('Space')
  await expect(playButton(page)).toBeVisible()

  await exitButton(page).click()
  await expect(app(page)).not.toHaveAttribute('data-fullscreen', 'true')
  await expect(page.locator('.topbar')).toBeVisible()
  await expect(page.locator('.library')).toBeVisible()
  await expect(exitButton(page)).toBeHidden()
})

test('F toggles full screen, Esc exits window-fill mode when requestFullscreen is rejected, and editor disables it', async ({
  page,
}) => {
  await page.evaluate(() => {
    document.documentElement.requestFullscreen = () => Promise.reject(new Error('denied'))
  })

  // Ignored while typing in library search
  const search = page.getByLabel('Search tunes')
  await search.focus()
  await page.keyboard.press('f')
  await expect(app(page)).not.toHaveAttribute('data-fullscreen', 'true')
  await search.blur()

  // F opens and closes
  await page.keyboard.press('f')
  await expect(app(page)).toHaveAttribute('data-fullscreen', 'true')
  await page.keyboard.press('f')
  await expect(app(page)).not.toHaveAttribute('data-fullscreen', 'true')

  // Esc closes window-fill mode
  await page.keyboard.press('f')
  await expect(app(page)).toHaveAttribute('data-fullscreen', 'true')
  await page.keyboard.press('Escape')
  await expect(app(page)).not.toHaveAttribute('data-fullscreen', 'true')

  // Disabled while editing
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Chart editor' })).toBeVisible()
  await expect(enterButton(page)).toBeDisabled()
  await page.keyboard.press('f')
  await expect(app(page)).not.toHaveAttribute('data-fullscreen', 'true')
  await page.getByRole('button', { name: 'Cancel' }).click()
})

test('no horizontal overflow at 1280px and 390px in normal and full screen modes', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await assertNoHorizontalOverflow(page)
  await enterButton(page).click()
  await expect(app(page)).toHaveAttribute('data-fullscreen', 'true')
  await assertNoHorizontalOverflow(page)
  await exitButton(page).click()

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(enterButton(page)).toBeVisible()
  await assertNoHorizontalOverflow(page)

  await enterButton(page).click()
  await expect(app(page)).toHaveAttribute('data-fullscreen', 'true')
  await expect(page.locator('.topbar')).toBeHidden()
  await expect(page.locator('.sheet')).toBeVisible()
  await expect(playButton(page)).toBeVisible()
  await expect(exitButton(page)).toBeVisible()
  await assertNoHorizontalOverflow(page)
})
