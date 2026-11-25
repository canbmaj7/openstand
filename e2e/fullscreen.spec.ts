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

async function measureFillRatio(page: Page) {
  return page.evaluate(() => {
    const stage = document.querySelector('.stage') as HTMLElement
    const sheet = document.querySelector('.sheet') as HTMLElement
    const rows = sheet.querySelector('.rows') as HTMLElement
    const stageStyle = getComputedStyle(stage)
    const sheetStyle = getComputedStyle(sheet)
    const availableH =
      stage.clientHeight - (parseFloat(stageStyle.paddingTop) || 0) - (parseFloat(stageStyle.paddingBottom) || 0)
    const contentH =
      rows.getBoundingClientRect().bottom -
      sheet.getBoundingClientRect().top +
      (parseFloat(sheetStyle.paddingBottom) || 0) +
      (parseFloat(sheetStyle.borderBottomWidth) || 0)
    const fitScale = parseFloat(sheetStyle.getPropertyValue('--fit-scale').trim() || '1')
    return {
      availableH,
      contentH,
      ratio: contentH / availableH,
      fitScale,
      sheetHeight: sheet.getBoundingClientRect().height,
    }
  })
}

test('short chart (Jazz Blues) fills >= 80% height in fullscreen without overflow and restores .sheet height on exit', async ({
  page,
}) => {
  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 1366, height: 1024 },
  ]) {
    await page.setViewportSize(viewport)
    await expect(page.locator('.sheet')).toHaveAttribute('aria-label', /Jazz Blues/)
    const beforeHeight = await page.locator('.sheet').evaluate((el) => el.getBoundingClientRect().height)

    await enterButton(page).click()
    await expect(app(page)).toHaveAttribute('data-fullscreen', 'true')
    await expect.poll(async () => (await measureFillRatio(page)).fitScale).toBeGreaterThan(1)

    const metrics = await measureFillRatio(page)
    expect(metrics.ratio).toBeGreaterThanOrEqual(0.8)
    await assertNoHorizontalOverflow(page)

    await exitButton(page).click()
    await expect(app(page)).not.toHaveAttribute('data-fullscreen', 'true')
    const afterHeight = await page.locator('.sheet').evaluate((el) => el.getBoundingClientRect().height)
    expect(afterHeight).toBeCloseTo(beforeHeight, 0)
  }
})

test('phones keep the chart at its normal size in full screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await enterButton(page).click()
  await expect(app(page)).toHaveAttribute('data-fullscreen', 'true')
  await page.waitForTimeout(200)
  const fit = await page.locator('.sheet').evaluate((el) => Number(getComputedStyle(el).getPropertyValue('--fit-scale').trim() || '1'))
  expect(fit).toBe(1)
  await assertNoHorizontalOverflow(page)
})

test('long chart keeps fit scale 1 in fullscreen and still scrolls', async ({ page }) => {
  // Longest tune in EXAMPLES (16 bars / 4 rows) in a short landscape viewport where it overflows
  await page.setViewportSize({ width: 800, height: 400 })
  await page.getByRole('button', { name: 'Tunes' }).click()
  await page.getByText('ii–V–I Workout', { exact: true }).click()
  await expect(page.locator('.sheet')).toHaveAttribute('aria-label', /ii–V–I Workout/)

  await enterButton(page).click()
  await expect(app(page)).toHaveAttribute('data-fullscreen', 'true')

  const fit = await page.locator('.sheet').evaluate((el) => Number(getComputedStyle(el).getPropertyValue('--fit-scale').trim() || '1'))
  expect(fit).toBe(1)

  const scrollCheck = await page.locator('.stage').evaluate((el) => {
    const canScroll = el.scrollHeight > el.clientHeight
    el.scrollTop = 100
    return { canScroll, scrolledTo: el.scrollTop }
  })
  expect(scrollCheck.canScroll).toBe(true)
  expect(scrollCheck.scrolledTo).toBeGreaterThan(0)
  await assertNoHorizontalOverflow(page)

  await exitButton(page).click()

  // Long exercise chart at 1280x900 also stays at scale 1 and scrolls
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.getByLabel('Playlist').selectOption('Exercises')
  await page.getByText('ii–V–I Major (Cycle of Fourths)', { exact: true }).click()
  await expect(page.locator('.sheet')).toHaveAttribute('aria-label', /ii–V–I Major \(Cycle of Fourths\)/)

  await enterButton(page).click()
  await expect(app(page)).toHaveAttribute('data-fullscreen', 'true')

  const exFit = await page.locator('.sheet').evaluate((el) => Number(getComputedStyle(el).getPropertyValue('--fit-scale').trim() || '1'))
  expect(exFit).toBe(1)

  const exScrollCheck = await page.locator('.stage').evaluate((el) => {
    const canScroll = el.scrollHeight > el.clientHeight
    el.scrollTop = 120
    return { canScroll, scrolledTo: el.scrollTop }
  })
  expect(exScrollCheck.canScroll).toBe(true)
  expect(exScrollCheck.scrolledTo).toBeGreaterThan(0)
  await assertNoHorizontalOverflow(page)
})
