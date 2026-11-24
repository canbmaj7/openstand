import { expect, test, type Page } from '@playwright/test'

test.use({ viewport: { width: 800, height: 400 } })

const barNumber = async (page: Page) =>
  Number((await page.locator('.readout').textContent())?.match(/Bar\s(\d+)/)?.[1] ?? 0)

async function play(page: Page) {
  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
}

async function stop(page: Page) {
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first(),
  ).toBeVisible()
})

test('active measure stays in viewport via autoscroll during playback', async ({ page }) => {
  test.setTimeout(45_000)

  // Select a tune with many bars (ii–V–I Workout has 16 bars across 4 rows)
  await page.getByRole('button', { name: 'Tunes' }).click()
  await page.getByText('ii–V–I Workout', { exact: true }).click()
  await expect(page.locator('[aria-label$="chord chart"]').first()).toHaveAttribute(
    'aria-label',
    /ii–V–I Workout/,
  )

  // Increase tempo to advance through bars quickly
  const faster = page.getByRole('button', { name: 'Faster' })
  for (let i = 0; i < 20; i++) {
    await faster.click()
  }

  await play(page)

  // Wait until playback reaches row 3 or later (bars 10+)
  // In an 800x400 viewport, row 3+ is off-screen without autoscroll
  await expect.poll(() => barNumber(page), { timeout: 25_000 }).toBeGreaterThanOrEqual(10)

  // Verify that the playing bar (containing .bar-highlight) is kept inside the visible area
  await expect
    .poll(
      async () => {
        return page.evaluate(() => {
          const highlight = document.querySelector('.bar-highlight')
          if (!highlight) return false
          const bar = highlight.closest('.bar')
          if (!bar) return false

          const stage = document.querySelector('.stage')
          const stageRect = stage ? stage.getBoundingClientRect() : { top: 0, bottom: window.innerHeight }
          const topBar = document.querySelector('.topbar')
          const transport = document.querySelector('.transport')

          const topBarBottom = topBar ? topBar.getBoundingClientRect().bottom : 0
          const transportTop = transport ? transport.getBoundingClientRect().top : window.innerHeight

          const visibleTop = Math.max(stageRect.top, topBarBottom, 0)
          const visibleBottom = Math.min(stageRect.bottom, transportTop, window.innerHeight)

          const barRect = bar.getBoundingClientRect()
          return barRect.top >= visibleTop - 2 && barRect.bottom <= visibleBottom + 2
        })
      },
      { timeout: 8_000 },
    )
    .toBe(true)

  // Confirm that .stage has indeed scrolled down
  const scrollTop = await page.locator('.stage').evaluate((el) => el.scrollTop)
  expect(scrollTop).toBeGreaterThan(20)

  await stop(page)
})

test('user manual scroll suspends autoscroll for 4 seconds', async ({ page }) => {
  test.setTimeout(45_000)

  await page.getByRole('button', { name: 'Tunes' }).click()
  await page.getByText('ii–V–I Workout', { exact: true }).click()
  await expect(page.locator('[aria-label$="chord chart"]').first()).toHaveAttribute(
    'aria-label',
    /ii–V–I Workout/,
  )

  const faster = page.getByRole('button', { name: 'Faster' })
  for (let i = 0; i < 20; i++) {
    await faster.click()
  }

  await play(page)
  await expect.poll(() => barNumber(page), { timeout: 25_000 }).toBeGreaterThanOrEqual(10)

  // Simulate user scroll using wheel event back to top
  await page.locator('.stage').evaluate((el) => {
    el.scrollTop = 0
    window.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: -100 }))
  })

  // Verify that right after wheel, scrollTop stays at 0 upon the next bar change
  const currentBar = await barNumber(page)
  await expect.poll(() => barNumber(page), { timeout: 10_000 }).toBeGreaterThan(currentBar)

  const scrollTopAfterWheel = await page.locator('.stage').evaluate((el) => el.scrollTop)
  expect(scrollTopAfterWheel).toBeLessThanOrEqual(5)

  await stop(page)
})
