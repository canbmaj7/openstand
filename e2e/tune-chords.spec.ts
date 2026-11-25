import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()
})

test('This tune view shows distinct tune chords, persists across reloads, and picks a chord to study', async ({ page }) => {
  await page.getByRole('button', { name: /Chords/ }).click()
  const helper = page.getByLabel('Chord helper')
  await expect(helper).toBeVisible()

  const thisTuneBtn = helper.getByRole('button', { name: 'This tune' })
  const thisChordBtn = helper.getByRole('button', { name: 'This chord' })

  await thisTuneBtn.click()
  await expect(thisTuneBtn).toHaveAttribute('aria-pressed', 'true')

  const cells = helper.locator('.chords-tune-cell')
  const count = await cells.count()
  expect(count).toBeGreaterThan(3)

  // Reload and re-open Chords popover -> This tune selection persists
  await page.reload()
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()
  await page.getByRole('button', { name: /Chords/ }).click()
  await expect(helper).toBeVisible()
  await expect(thisTuneBtn).toHaveAttribute('aria-pressed', 'true')
  expect(await cells.count()).toBeGreaterThan(3)

  // Click the second chord cell -> switches to This chord with that chord selected and following off
  const targetCell = cells.nth(1)
  const pickedName = (await targetCell.locator('.chords-tune-name').textContent())!.trim()
  await targetCell.click()

  await expect(thisChordBtn).toHaveAttribute('aria-pressed', 'true')
  await expect(helper.getByRole('heading')).toHaveText(pickedName)
  await expect(helper.getByLabel('Follow playing chord')).not.toBeChecked()
})

test('This tune view fits within 390px phone viewport without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: /Chords/ }).click()
  const helper = page.getByLabel('Chord helper')
  await expect(helper).toBeVisible()

  await helper.getByRole('button', { name: 'This tune' }).click()
  await expect(helper.locator('.chords-tune-cell').first()).toBeVisible()

  const checkOverflow = () =>
    page.evaluate(() => {
      const doc = document.documentElement.scrollWidth - window.innerWidth
      const popover = document.querySelector('.popover-panel')
      const popoverOverflow = popover ? popover.scrollWidth - popover.clientWidth : 0
      const panel = document.querySelector('.chords-panel')
      const panelOverflow = panel ? panel.scrollWidth - panel.clientWidth : 0
      return { doc, popoverOverflow, panelOverflow }
    })

  const guitarOverflow = await checkOverflow()
  expect(guitarOverflow.doc).toBeLessThanOrEqual(0)
  expect(guitarOverflow.popoverOverflow).toBeLessThanOrEqual(0)
  expect(guitarOverflow.panelOverflow).toBeLessThanOrEqual(0)

  await helper.getByRole('button', { name: 'Keyboard' }).click()
  await expect(helper.locator('.chords-tune-grid-keyboard')).toBeVisible()

  const keyboardOverflow = await checkOverflow()
  expect(keyboardOverflow.doc).toBeLessThanOrEqual(0)
  expect(keyboardOverflow.popoverOverflow).toBeLessThanOrEqual(0)
  expect(keyboardOverflow.panelOverflow).toBeLessThanOrEqual(0)
})
