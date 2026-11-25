import { expect, test, type Page } from '@playwright/test'

const control = (page: Page, label: string) =>
  page.locator('label.control', { has: page.locator('.label', { hasText: new RegExp(`^${label}$`) }) }).locator('select')

const tempoValue = (page: Page) => page.locator('.control-tempo .stepper-value')
const chorusesValue = (page: Page) =>
  page.locator('.control', { has: page.locator('#chorus-label') }).locator('.stepper-value')
const resetButton = (page: Page) =>
  page.getByRole('button', { name: "Reset to the tune's own tempo, key and repeats" })

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[aria-label$="chord chart"]').first()).toBeVisible()
})

test('remembers tempo, key, repeats and style per tune, persists on reload, and Reset restores defaults', async ({
  page,
}) => {
  // Initial tune: Jazz Blues (medium-swing, F (5), 140 bpm, 3 choruses)
  await expect(tempoValue(page)).toHaveText('140')
  await expect(control(page, 'Key')).toHaveValue('5')
  await expect(resetButton(page)).toHaveCount(0)

  // Change tempo (+10 -> 150), key (G -> 7), choruses (4), style (bossa-nova? no, keep style or test both)
  await page.getByRole('button', { name: 'Faster' }).click()
  await page.getByRole('button', { name: 'Faster' }).click()
  await expect(tempoValue(page)).toHaveText('150')

  await control(page, 'Key').selectOption('7')
  await expect(control(page, 'Key')).toHaveValue('7')

  await page.getByRole('button', { name: 'More choruses' }).click()
  await expect(chorusesValue(page)).toHaveText('4')
  await expect(resetButton(page)).toBeVisible()

  // Switch to another tune (Bossa Workout: C (0), 130 bpm)
  await page.getByText('Bossa Workout', { exact: true }).click()
  await expect(page.locator('[aria-label$="chord chart"]').first()).toHaveAttribute('aria-label', /Bossa Workout/)
  await expect(tempoValue(page)).toHaveText('130')
  await expect(control(page, 'Key')).toHaveValue('0')
  await expect(resetButton(page)).toHaveCount(0)

  // Return to Jazz Blues -> tempo, key and choruses are restored
  await page.getByText('Jazz Blues', { exact: true }).click()
  await expect(page.locator('[aria-label$="chord chart"]').first()).toHaveAttribute('aria-label', /Jazz Blues/)
  await expect(tempoValue(page)).toHaveText('150')
  await expect(control(page, 'Key')).toHaveValue('7')
  await expect(chorusesValue(page)).toHaveText('4')
  await expect(resetButton(page)).toBeVisible()

  // Reload -> settings persist
  await page.reload()
  await expect(page.locator('[aria-label$="chord chart"]').first()).toHaveAttribute('aria-label', /Jazz Blues/)
  await expect(tempoValue(page)).toHaveText('150')
  await expect(control(page, 'Key')).toHaveValue('7')
  await expect(chorusesValue(page)).toHaveText('4')
  await expect(resetButton(page)).toBeVisible()

  // Change style too, then Reset restores all defaults including style
  await control(page, 'Style').selectOption('samba')
  await expect(control(page, 'Style')).toHaveValue('samba')

  await resetButton(page).click()
  await expect(control(page, 'Style')).toHaveValue('medium-swing')
  await expect(tempoValue(page)).toHaveText('140')
  await expect(control(page, 'Key')).toHaveValue('5')
  await expect(chorusesValue(page)).toHaveText('3')
  await expect(resetButton(page)).toHaveCount(0)

  await page.reload()
  await expect(control(page, 'Style')).toHaveValue('medium-swing')
  await expect(tempoValue(page)).toHaveText('140')
  await expect(control(page, 'Key')).toHaveValue('5')
  await expect(chorusesValue(page)).toHaveText('3')
  await expect(resetButton(page)).toHaveCount(0)
})

test('practice ramp and key cycle do not overwrite saved tempo or key, and lab style is not saved', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Faster' }).click()
  await expect(tempoValue(page)).toHaveText('145')

  await page.getByRole('button', { name: 'Practice' }).click()
  await page.getByRole('button', { name: 'More', exact: true }).click()
  await page.getByLabel('Keys').selectOption('5')
  await page.getByRole('button', { name: 'Practice' }).click()

  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: 'Stop' }).click()

  // Open style lab (sets styleId to 'lab') -> must not save 'lab'
  await page.getByRole('button', { name: /^(style )?lab$/i }).click()
  await expect(page.getByRole('region', { name: 'Style lab' })).toBeVisible()

  await page.reload()
  await expect(tempoValue(page)).toHaveText('145')
  await expect(control(page, 'Key')).toHaveValue('5')
  await expect(control(page, 'Style')).toHaveValue('medium-swing')
})

test('migrates legacy openstand:tune-styles on load without deleting it', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.removeItem('openstand:tune-settings')
    localStorage.setItem('openstand:tune-styles', JSON.stringify({ 'jazz-blues-f': 'bossa-nova' }))
  })
  await page.reload()
  await expect(control(page, 'Style')).toHaveValue('bossa-nova')
  await expect(resetButton(page)).toBeVisible()

  const keys = await page.evaluate(() => ({
    legacy: localStorage.getItem('openstand:tune-styles'),
    modern: localStorage.getItem('openstand:tune-settings'),
  }))
  expect(keys.legacy).toBe(JSON.stringify({ 'jazz-blues-f': 'bossa-nova' }))
  expect(JSON.parse(keys.modern ?? '{}')).toEqual({ 'jazz-blues-f': { style: 'bossa-nova' } })
})

test('Reset button fits without horizontal overflow on narrow and desktop screens', async ({ page }) => {
  await page.getByRole('button', { name: 'Faster' }).click()
  await expect(resetButton(page)).toBeVisible()

  for (const width of [1280, 560, 390]) {
    await page.setViewportSize({ width, height: 800 })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    const box = await resetButton(page).boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1)
  }
})
