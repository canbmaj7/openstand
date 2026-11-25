import { expect, test, type Page } from '@playwright/test'

// The main things a visitor does, in a clean browser with nothing saved.

const labButton = (page: Page) => page.getByRole('button', { name: /^(style )?lab$/i })
const chords = (page: Page) => page.locator('.chord[aria-label]')
// A transport control by its visible label (the label element also holds the options' text)
const control = (page: Page, label: string) =>
  page.locator('label.control', { has: page.locator('.label', { hasText: new RegExp(`^${label}$`) }) }).locator('select')
const barNumber = async (page: Page) => Number((await page.locator('.readout').textContent())?.match(/Bar\s(\d+)/)?.[1] ?? 0)

async function play(page: Page) {
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
}

async function stop(page: Page) {
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
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

test('Space toggles playback after a pointer click but keeps keyboard button activation', async ({ page }) => {
  const chordDisplay = page.getByRole('button', { name: 'Chord names and font' })

  await chordDisplay.focus()
  await chordDisplay.press('Space')
  await expect(chordDisplay).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
  await chordDisplay.press('Space')
  await expect(chordDisplay).toHaveAttribute('aria-expanded', 'false')

  await chordDisplay.click()
  await expect(chordDisplay).toHaveAttribute('aria-expanded', 'true')
  await chordDisplay.press('Space')
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
  await expect(chordDisplay).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Space')
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
})

test('changing the key re-spells the chords', async ({ page }) => {
  const before = await chords(page).first().getAttribute('aria-label')
  const key = control(page, 'Key')
  const current = await key.inputValue()
  await key.selectOption(String((Number(current) + 2) % 12))
  await expect(chords(page).first()).not.toHaveAttribute('aria-label', before!)
})

test('clicking the selected chord again closes the chord helper', async ({ page }) => {
  const helper = page.getByLabel('Chord helper')
  const first = chords(page).first()
  const sameSymbolElsewhere = page.locator('.chord[aria-label="F7"], .chord[aria-label="F7, start point"]').nth(1)
  const another = chords(page).nth(1)

  await first.click()
  await expect(helper).toBeVisible()
  await expect(helper.getByRole('heading')).toHaveText('F7')

  // The chart position, not just the chord symbol, identifies the selection.
  await sameSymbolElsewhere.click()
  await expect(helper).toBeVisible()
  await sameSymbolElsewhere.click()
  await expect(helper).not.toBeVisible()

  await another.click()
  await expect(helper).toBeVisible()
  await expect(helper.getByRole('heading')).toHaveText('Bb7')

  await another.press('Enter')
  await expect(helper).not.toBeVisible()
  await another.press('Enter')
  await expect(helper).toBeVisible()
})

test('a tune can be found in the library', async ({ page }) => {
  const search = page.getByPlaceholder('Search title, composer or style')
  await search.fill('bossa')
  await expect(page.getByText('Afro 6/8 Minor', { exact: true })).toBeVisible()
  await page.getByText('Bossa Workout', { exact: true }).click()
  await expect(page.locator('[aria-label$="chord chart"]').first()).toHaveAttribute('aria-label', /Bossa Workout/)
})

test('a tune link opens the same chart in another browser', async ({ page, browser, baseURL }) => {
  const title = await page.locator('[aria-label$="chord chart"]').first().getAttribute('aria-label')
  await page.getByRole('button', { name: 'Share' }).click()
  await page.getByRole('button', { name: /Copy OpenStand link/ }).click()
  await expect(page.getByText('Link copied')).toBeVisible()
  const link = await page.evaluate(() => navigator.clipboard.readText())
  expect(link).toContain('#tune=')

  const other = await browser.newContext({ serviceWorkers: 'block' })
  const fresh = await other.newPage()
  await fresh.goto(link.replace(/^https?:\/\/[^/]+/, baseURL!))
  await expect(fresh.locator('[aria-label$="chord chart"]').first()).toHaveAttribute('aria-label', title!)
  await other.close()
})

test('the style lab: edit while playing, save, and keep it after a reload', async ({ page }) => {
  const style = control(page, 'Style')
  await style.selectOption('bossa-nova')
  await labButton(page).click()
  const lab = page.getByRole('region', { name: 'Style lab' })
  await expect(lab).toBeVisible()
  await expect(lab.getByLabel('Start from')).toHaveValue('bossa-nova')
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

  await lab.getByRole('button', { name: 'Close the style lab' }).click()
  await lab.getByRole('button', { name: 'Save & close' }).click()
  await expect(style.locator('option', { hasText: 'My Bossa Nova' }).first()).toBeAttached()
  await expect(style).toHaveValue('my:my-bossa-nova')
  await expect(page.locator('.sheet-meta').first()).toHaveText('(My Bossa Nova)')
  await expect(page.getByRole('button', { name: /Jazz Blues My Bossa Nova · F/ })).toBeVisible()
  await page.getByText('Bossa Workout', { exact: true }).click()
  await page.getByText('Jazz Blues', { exact: true }).click()
  await expect(style).toHaveValue('my:my-bossa-nova')
  await labButton(page).click()
  await expect(lab.getByLabel('Start from')).toHaveValue('my:my-bossa-nova')
  await expect(lab.getByLabel('Name')).toHaveValue('My Bossa Nova')
  await expect(lab.getByRole('button', { name: /^Cross-stick, beat 1, step 2: normal$/ })).toBeVisible()
  await lab.getByRole('button', { name: 'Close the style lab' }).click()

  await page.reload()
  await expect(control(page, 'Style').locator('option', { hasText: 'My Bossa Nova' }).first()).toBeAttached()
  await expect(control(page, 'Style')).toHaveValue('my:my-bossa-nova')
  await expect(page.getByRole('button', { name: /Jazz Blues My Bossa Nova · F/ })).toBeVisible()
})

test('the style lab asks whether to save unsaved changes when it closes', async ({ page }) => {
  await labButton(page).click()
  const lab = page.getByRole('region', { name: 'Style lab' })
  await lab.getByLabel('Name').fill('Unsaved session')
  await expect(lab.getByText('Unsaved changes')).toBeVisible()
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  const closeOptions = lab.getByRole('alert', { name: 'Unsaved changes' })
  await expect(closeOptions.getByRole('button')).toHaveCount(3)
  await lab.getByRole('button', { name: 'Keep editing' }).click()
  await expect(lab.getByLabel('Name')).toHaveValue('Unsaved session')
  await lab.getByRole('button', { name: 'Close the style lab' }).click()
  await lab.getByRole('button', { name: 'Discard' }).click()
  await expect(lab).not.toBeVisible()

  await labButton(page).click()
  await expect(lab.getByLabel('Start from')).toHaveValue('medium-swing')
  await expect(lab.getByLabel('Name')).toHaveValue('My Medium Swing')
  await lab.getByLabel('Name').fill('Saved from close prompt')
  await lab.getByRole('button', { name: 'Close the style lab' }).click()
  await lab.getByRole('button', { name: 'Save & close' }).click()
  await expect(lab).not.toBeVisible()
  await expect(control(page, 'Style')).toHaveValue('my:saved-from-close-prompt')
})

test('the style lab close button stays with the action buttons across tabs and bass modes', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 })
  await labButton(page).click()
  const lab = page.getByRole('region', { name: 'Style lab' })
  const close = lab.getByRole('button', { name: 'Close the style lab' })
  const send = lab.getByRole('button', { name: 'Send to OpenStand' })

  await lab.getByRole('tab', { name: 'Bass' }).click()
  await lab.getByRole('button', { name: 'Written' }).click()
  await expect(close).toBeInViewport()
  const [closeBox, sendBox] = await Promise.all([close.boundingBox(), send.boundingBox()])
  expect(closeBox).not.toBeNull()
  expect(sendBox).not.toBeNull()
  expect(Math.abs(closeBox!.y - sendBox!.y)).toBeLessThan(4)

  await lab.getByRole('button', { name: 'Walking (automatic)' }).click()
  await expect(close).toBeInViewport()
  await lab.getByRole('tab', { name: 'Drums' }).click()
  await expect(close).toBeInViewport()
})

test('deleting a custom style restores the tune original style', async ({ page }) => {
  const style = control(page, 'Style')
  await style.selectOption('bossa-nova')
  await labButton(page).click()
  const lab = page.getByRole('region', { name: 'Style lab' })
  await lab.getByLabel('Name').fill('Delete me')
  await lab.getByRole('button', { name: 'Close the style lab' }).click()
  await lab.getByRole('button', { name: 'Save & close' }).click()
  await expect(style).toHaveValue('my:delete-me')

  await labButton(page).click()
  await lab.getByRole('button', { name: 'Delete' }).click()
  await lab.getByRole('button', { name: 'Delete style?' }).click()
  await lab.getByRole('button', { name: 'Close the style lab' }).click()
  await expect(style).toHaveValue('medium-swing')
  await expect(page.getByRole('button', { name: /Jazz Blues Medium Swing · F/ })).toBeVisible()
})

test('a style link opens in the style lab of another browser', async ({ page, browser, baseURL }) => {
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
  await fresh.goto(link.replace(/^https?:\/\/[^/]+/, baseURL!))
  const freshLab = fresh.getByRole('region', { name: 'Style lab' })
  await expect(freshLab).toBeVisible()
  await expect(freshLab.getByLabel('Name')).toHaveValue('Samba for the band')
  await freshLab.getByRole('button', { name: 'Close the style lab' }).click()
  await expect(control(fresh, 'Style')).toHaveValue('my:samba-for-the-band')
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
