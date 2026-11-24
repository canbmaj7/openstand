import { expect, test, type Page } from '@playwright/test'

const chords = (page: Page) => page.locator('.chord[aria-label]')

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()
})

test('switches chord helper view between keyboard and guitar and persists preference', async ({ page }) => {
  const helper = page.getByLabel('Chord helper')
  const piano = helper.locator('.chords-piano')
  const guitars = helper.locator('.chords-guitars')
  const bothBtn = helper.getByRole('button', { name: 'Both' })
  const keyboardBtn = helper.getByRole('button', { name: 'Keyboard' })
  const guitarBtn = helper.getByRole('button', { name: 'Guitar' })

  // 1. Click a chord -> panel opens with both visible by default
  await chords(page).first().click()
  await expect(helper).toBeVisible()
  await expect(bothBtn).toHaveAttribute('aria-pressed', 'true')
  await expect(piano).toBeVisible()
  await expect(guitars).toBeVisible()

  // 2. Select Keyboard -> guitar diagrams hidden, keyboard visible
  await keyboardBtn.click()
  await expect(keyboardBtn).toHaveAttribute('aria-pressed', 'true')
  await expect(bothBtn).toHaveAttribute('aria-pressed', 'false')
  await expect(piano).toBeVisible()
  await expect(guitars).not.toBeVisible()

  // 3. Select Guitar -> reverse (piano hidden, guitars visible)
  await guitarBtn.click()
  await expect(guitarBtn).toHaveAttribute('aria-pressed', 'true')
  await expect(keyboardBtn).toHaveAttribute('aria-pressed', 'false')
  await expect(piano).not.toBeVisible()
  await expect(guitars).toBeVisible()

  // 4. Reload page and re-open panel -> selection is preserved
  await page.reload()
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()
  await chords(page).first().click()
  await expect(helper).toBeVisible()
  await expect(guitarBtn).toHaveAttribute('aria-pressed', 'true')
  await expect(piano).not.toBeVisible()
  await expect(guitars).toBeVisible()
})
