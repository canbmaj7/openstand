import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()
})

test('selecting comping sound updates mixer label, persists across reloads, and plays without errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  await page.getByRole('button', { name: /Mixer/ }).click()
  const compSelect = page.getByLabel('Comping sound')
  await compSelect.selectOption({ label: 'Nylon guitar' })

  await expect(page.locator('.mixer .strip').nth(1).locator('.label')).toHaveText('Guitar')
  await expect(page.getByRole('slider', { name: 'Guitar volume' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('img', { name: /chord chart$/ }).or(page.locator('[aria-label$="chord chart"]')).first()).toBeVisible()

  await page.getByRole('button', { name: /Mixer/ }).click()
  await expect(page.getByLabel('Comping sound')).toHaveValue('24')
  await expect(page.locator('.mixer .strip').nth(1).locator('.label')).toHaveText('Guitar')

  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
  await expect(page.locator('.readout')).toContainText(/Bar\s\d+/)
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()

  expect(errors).toEqual([])
})

test('mixer sound selectors fit within 390px phone viewport without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: /Mixer/ }).click()
  await expect(page.getByLabel('Bass sound')).toBeVisible()

  const overflow = await page.evaluate(() => {
    const doc = document.documentElement.scrollWidth - window.innerWidth
    const panel = document.querySelector('.popover-panel')
    const panelOverflow = panel ? panel.scrollWidth - panel.clientWidth : 0
    return { doc, panelOverflow }
  })
  expect(overflow.doc).toBeLessThanOrEqual(0)
  expect(overflow.panelOverflow).toBeLessThanOrEqual(0)
})
