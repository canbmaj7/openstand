import { expect, test, type Page } from '@playwright/test'

const chords = (page: Page) => page.locator('.chord:not(.chord-nc)')

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()
})

test('hears a chord and scale from the chord helper without affecting Play state, and disables while playing', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  await expect(page.getByRole('button', { name: 'Play' })).toBeEnabled({ timeout: 20_000 })

  await chords(page).first().click()
  const helper = page.getByLabel('Chord helper')
  await expect(helper).toBeVisible()

  const hearChord = helper.getByRole('button', { name: 'Hear chord' })
  await expect(hearChord).toBeVisible()
  await expect(hearChord).toBeEnabled()

  await hearChord.click()
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()

  const hearFirstScale = helper.locator('.scale-hear').first()
  await expect(hearFirstScale).toBeEnabled()
  await hearFirstScale.click()
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()

  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
  // Clicking Play closes open popovers on outside pointerdown; re-open Chords to check disabled state during playback
  await page.getByRole('button', { name: /Chords/ }).click()
  await expect(helper).toBeVisible()
  await expect(hearChord).toBeDisabled()
  await expect(hearFirstScale).toBeDisabled()

  await page.keyboard.press('Space')
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
  await expect(hearChord).toBeEnabled()
  await expect(hearFirstScale).toBeEnabled()

  expect(errors).toEqual([])
})
