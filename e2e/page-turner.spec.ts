import { expect, test, type Page } from '@playwright/test'

const chart = (page: Page) => page.locator('[aria-label$="chord chart"]').first()
const stageMetrics = (page: Page) =>
  page.locator('.stage').evaluate((el) => ({
    top: el.scrollTop,
    height: el.scrollHeight,
    client: el.clientHeight,
    docTop: document.documentElement.scrollTop,
    docScrollable: document.documentElement.scrollHeight > document.documentElement.clientHeight + 2,
  }))

async function waitForScrollSettle(page: Page) {
  let prev = -1
  await expect
    .poll(
      async () => {
        const cur = await page.locator('.stage').evaluate((el) => el.scrollTop)
        const settled = Math.abs(cur - prev) < 0.5
        prev = cur
        return settled
      },
      { intervals: [80, 80, 120], timeout: 3000 },
    )
    .toBe(true)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(chart(page)).toBeVisible()
})

test('page-turner pedals scroll through a chart and step between setlist tunes', async ({ page }) => {
  // Create a 2-tune setlist with long charts
  await page.getByText('ii–V–I Workout', { exact: true }).click()
  await page.getByRole('button', { name: 'Add to setlist' }).click()
  await page.getByRole('button', { name: 'New setlist…' }).click()
  await page.getByLabel('New setlist name').fill('Pedal Set')
  await page.getByRole('button', { name: 'Create & add' }).click()

  await page.getByText('ii–V–I Major (Cycle of Fourths)', { exact: true }).click()
  await page.getByRole('button', { name: 'Add to setlist' }).click()
  await page.getByRole('button', { name: /Pedal Set/ }).click()

  // Open the first tune from the setlist
  await page.getByRole('tab', { name: 'Setlists' }).click()
  await page.getByRole('button', { name: /Pedal Set/ }).click()
  await page.locator('.setlist-row').nth(0).locator('.setlist-tune').click()
  await expect(chart(page)).toHaveAttribute('aria-label', /ii–V–I Workout/)
  await expect(page.locator('.readout')).toContainText('Pedal Set · 1/2')

  // Shrink viewport so the chart requires multiple pages
  await page.setViewportSize({ width: 800, height: 400 })
  const initial = await stageMetrics(page)
  expect(initial.height).toBeGreaterThan(initial.client)
  expect(initial.top).toBe(0)

  // PageDown scrolls down inside .stage
  await page.keyboard.press('PageDown')
  await expect.poll(async () => (await stageMetrics(page)).top).toBeGreaterThan(0)
  await waitForScrollSettle(page)

  // Continue pressing PageDown to reach the bottom and advance to the second tune
  for (let i = 0; i < 8; i++) {
    const label = await chart(page).getAttribute('aria-label')
    if (label?.includes('ii–V–I Major (Cycle of Fourths)')) break
    await page.keyboard.press('PageDown')
    await waitForScrollSettle(page)
  }

  await expect(chart(page)).toHaveAttribute('aria-label', /ii–V–I Major \(Cycle of Fourths\)/)
  await expect(page.locator('.readout')).toContainText('Pedal Set · 2/2')
  expect((await stageMetrics(page)).top).toBe(0)

  // PageUp at the top of the second tune returns to the bottom of the first tune
  await page.keyboard.press('PageUp')
  await expect(chart(page)).toHaveAttribute('aria-label', /ii–V–I Workout/)
  await expect(page.locator('.readout')).toContainText('Pedal Set · 1/2')
  const returned = await stageMetrics(page)
  expect(returned.top + returned.client).toBeGreaterThanOrEqual(returned.height - 2)

  // PageUp returns to the top of the first tune
  for (let i = 0; i < 8; i++) {
    if ((await stageMetrics(page)).top <= 2) break
    await page.keyboard.press('PageUp')
    await waitForScrollSettle(page)
  }
  expect((await stageMetrics(page)).top).toBeLessThanOrEqual(2)
  await expect(chart(page)).toHaveAttribute('aria-label', /ii–V–I Workout/)

  // Fullscreen mode also supports PageDown
  await page.getByRole('button', { name: 'Full screen' }).click()
  await expect(page.locator('.app')).toHaveAttribute('data-fullscreen', 'true')
  await page.keyboard.press('PageDown')
  await expect.poll(async () => (await stageMetrics(page)).top).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Exit full screen' }).click()
  await expect(page.locator('.app')).not.toHaveAttribute('data-fullscreen', 'true')

  // Disabled while editing
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Chart editor' })).toBeVisible()
  const beforeEditTop = (await stageMetrics(page)).top
  await page.keyboard.press('PageDown')
  await page.waitForTimeout(150)
  expect((await stageMetrics(page)).top).toBe(beforeEditTop)
  await expect(chart(page)).toHaveAttribute('aria-label', /ii–V–I Workout/)
  await page.getByRole('button', { name: 'Cancel' }).click()

  // Narrow mobile viewport (390px) still scrolls .stage cleanly
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.stage').evaluate((el) => { el.scrollTop = 0 })
  const mobileStart = await stageMetrics(page)
  expect(mobileStart.docScrollable).toBe(false)
  if (mobileStart.height > mobileStart.client + 2) {
    await page.keyboard.press('PageDown')
    await expect.poll(async () => (await stageMetrics(page)).top).toBeGreaterThan(0)
  }
})
