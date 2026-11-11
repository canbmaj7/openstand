import { expect, test, type Page } from '@playwright/test'

// The main things a visitor does, in a clean browser with nothing saved.

const labButton = (page: Page) => page.getByRole('button', { name: /^(style )?lab$/i })
const chords = (page: Page) => page.locator('.chord[aria-label]')
// A transport control by its visible label (the label element also holds the options' text)
const control = (page: Page, label: string) =>
  page.locator('label.control', { has: page.locator('.label', { hasText: new RegExp(`^${label}$`) }) }).locator('select')
const barNumber = async (page: Page) => Number((await page.locator('.readout').textContent())?.match(/Bar\s(\d+)/)?.[1] ?? 0)

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
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()
})

test('a tune plays and the bar counter moves', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await play(page)
  await expect(page.locator('.readout')).toContainText(/Bar\s\d+/)
  const first = await barNumber(page)
  await expect.poll(() => barNumber(page), { timeout: 20_000 }).toBeGreaterThan(first)
  await stop(page)
  expect(errors).toEqual([])
})

test('changing the key re-spells the chords', async ({ page }) => {
  const before = await chords(page).first().getAttribute('aria-label')
  const key = control(page, 'Key')
  const current = await key.inputValue()
  await key.selectOption(String((Number(current) + 2) % 12))
  await expect(chords(page).first()).not.toHaveAttribute('aria-label', before!)
})

test('a tune can be found in the library', async ({ page }) => {
  await page.getByLabel('Search tunes').fill('bossa')
  await page.getByText('Bossa Workout', { exact: true }).click()
  await expect(page.locator('[aria-label$="chord chart"]').first()).toHaveAttribute('aria-label', /Bossa Workout/)
})

test('a tune link opens the same chart in another browser', async ({ page, browser }) => {
  const title = await page.locator('[aria-label$="chord chart"]').first().getAttribute('aria-label')
  await page.getByRole('button', { name: 'Share' }).click()
  await page.getByRole('button', { name: /Copy OpenStand link/ }).click()
  await expect(page.getByText('Link copied')).toBeVisible()
  const link = await page.evaluate(() => navigator.clipboard.readText())
  expect(link).toContain('#tune=')

  const other = await browser.newContext({ serviceWorkers: 'block' })
  const fresh = await other.newPage()
  await fresh.goto(link.replace(/^https?:\/\/[^/]+/, 'http://localhost:4173'))
  await expect(fresh.locator('[aria-label$="chord chart"]').first()).toHaveAttribute('aria-label', title!)
  await other.close()
})

test('the style lab: edit while playing, save, and keep it after a reload', async ({ page }) => {
  await labButton(page).click()
  const lab = page.getByRole('region', { name: 'Style lab' })
  await expect(lab).toBeVisible()
  await lab.getByLabel('Start from').selectOption('bossa-nova')
  await play(page)

  // Groove A, B and the fill are all there for bossa nova; add a hit to groove A
  await expect(lab.getByRole('button', { name: 'Groove B' })).toBeVisible()
  const cell = lab.getByRole('button', { name: /^Cross-stick, beat 1, step 2: off$/ })
  await cell.click()
  await expect(lab.getByRole('button', { name: /^Cross-stick, beat 1, step 2: normal$/ })).toBeVisible()

  // Bass and chords have a pattern B too
  await lab.getByRole('tab', { name: 'Bass' }).click()
  await expect(lab.getByRole('button', { name: 'Line B' })).toBeVisible()
  await lab.getByRole('tab', { name: 'Chords' }).click()
  await expect(lab.getByRole('button', { name: 'Pattern B' })).toBeVisible()
  await stop(page)

  await lab.getByRole('button', { name: 'Save', exact: true }).click()
  const style = control(page, 'Style')
  await expect(style.locator('option', { hasText: 'My Bossa Nova' }).first()).toBeAttached()

  await page.reload()
  await expect(control(page, 'Style').locator('option', { hasText: 'My Bossa Nova' }).first()).toBeAttached()
})

test('a style link opens in the style lab of another browser', async ({ page, browser }) => {
  await labButton(page).click()
  const lab = page.getByRole('region', { name: 'Style lab' })
  await lab.getByLabel('Start from').selectOption('samba')
  await lab.getByLabel('Name').fill('Samba for the band')
  await lab.getByRole('button', { name: 'Share link' }).click()
  await expect(lab.getByRole('button', { name: 'Link copied' })).toBeVisible()
  const link = await page.evaluate(() => navigator.clipboard.readText())
  expect(link).toContain('#style=')

  const other = await browser.newContext({ serviceWorkers: 'block' })
  const fresh = await other.newPage()
  await fresh.goto(link.replace(/^https?:\/\/[^/]+/, 'http://localhost:4173'))
  const freshLab = fresh.getByRole('region', { name: 'Style lab' })
  await expect(freshLab).toBeVisible()
  await expect(freshLab.getByLabel('Name')).toHaveValue('Samba for the band')
  await other.close()
})

test('on a phone nothing scrolls sideways', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const sideways = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(await sideways()).toBeLessThanOrEqual(0)
  await labButton(page).click()
  await expect(page.getByRole('region', { name: 'Style lab' })).toBeVisible()
  expect(await sideways()).toBeLessThanOrEqual(0)
  await play(page)
  await stop(page)
})

test('the mixer has a master volume that is kept, and a level meter that moves', async ({ page }) => {
  await play(page)
  await page.getByRole('button', { name: /Mixer/ }).click()
  const master = page.getByRole('slider', { name: 'Master volume' })
  await expect(master).toHaveValue('100')
  // The meter's level bar rises while the band plays
  const bar = page.locator('.meter-bar')
  await expect.poll(() => bar.evaluate((e) => parseFloat(e.style.height) || 0), { timeout: 15_000 }).toBeGreaterThan(20)
  await master.fill('80')
  await stop(page)
  await page.reload()
  await page.getByRole('button', { name: /Mixer/ }).click()
  await expect(page.getByRole('slider', { name: 'Master volume' })).toHaveValue('80')
})

test('copies of the app and local builds send no error reports', async ({ page }) => {
  const reports: string[] = []
  page.on('request', (r) => {
    if (/sentry|ingest/.test(r.url())) reports.push(r.url())
  })
  await page.evaluate(() => setTimeout(() => {
    throw new Error('test error')
  }))
  await page.waitForTimeout(500)
  expect(reports).toEqual([])
})

test('chords iReal Pro lacks can be typed, are drawn and play', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  const typed = ['C5', 'Csus2', 'Cdim(maj7)', 'C+maj7', 'Cmaj7sus4', 'Cadd11']
  for (const [i, symbol] of typed.entries()) {
    const input = page.getByLabel(`Chords in bar ${i + 1}`)
    await input.fill(symbol)
    await expect(input).toHaveAttribute('aria-invalid', 'false')
    await input.press('Enter')
  }
  for (const label of ['C5', 'Csus2', 'Co^7', 'C+^7', 'C^7sus', 'Cadd11'])
    await expect(page.locator(`.chord[aria-label="${label}"]`).first()).toBeVisible()
  await page.getByRole('button', { name: /^Save/ }).click()
  await expect(page.locator('.chord[aria-label="Co^7"]').first()).toBeVisible()
  await play(page)
  await page.waitForTimeout(1500)
  await stop(page)
  expect(errors).toEqual([])
})
