import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function waitForBoard(page: Page) {
  await expect(page.locator('button[data-position="1"]')).toBeVisible({ timeout: 30_000 })
}

async function assertNoSeriousAxe(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const bad = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical'
  )
  expect(
    bad,
    `${label}: ${bad.map((v) => `${v.id} (${v.impact}): ${v.help}`).join('; ')}`
  ).toEqual([])
}

async function assertInputsAtLeast16px(page: Page) {
  const sizes = await page.evaluate(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>(
        'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, select'
      )
    )
    return nodes.map((el) => ({
      tag: el.tagName,
      type: (el as HTMLInputElement).type || '',
      testId: el.getAttribute('data-testid') || el.id || el.getAttribute('name') || '',
      fontSize: parseFloat(getComputedStyle(el).fontSize),
    }))
  })
  for (const row of sizes) {
    expect(
      row.fontSize,
      `${row.tag}${row.type ? `[${row.type}]` : ''} ${row.testId || '(unnamed)'} font-size`
    ).toBeGreaterThanOrEqual(16)
  }
}

test.describe('Accessibility (axe + Escape + landscape configure)', () => {
  test('axe: public board', async ({ page }) => {
    await page.goto('/')
    await waitForBoard(page)
    await assertNoSeriousAxe(page, 'board')
    await assertInputsAtLeast16px(page)
    const scroll = page.getByTestId('board-scroll')
    await expect(scroll).toHaveAttribute('role', 'region')
    await expect(scroll).toHaveAttribute('aria-label', 'Squares board')
    await expect(scroll).toHaveAttribute('tabindex', '0')
  })

  test('axe: privacy + terms', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible()
    await assertNoSeriousAxe(page, 'privacy')
    await page.goto('/terms')
    await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible()
    await assertNoSeriousAxe(page, 'terms')
  })

  test('axe: admin sign-in', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: /Admin|Sign/i }).first()).toBeVisible({
      timeout: 30_000,
    })
    await assertNoSeriousAxe(page, 'admin-signin')
  })

  test('axe: admin dashboard + configure game + Escape', async ({ page }) => {
    await page.goto('/admin/panel?mock_admin=1')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({
      timeout: 30_000,
    })
    await assertNoSeriousAxe(page, 'admin-dashboard')
    await assertInputsAtLeast16px(page)

    const openBtn = page.getByTestId('admin-configure-game')
    await openBtn.click()
    const modal = page.getByTestId('configure-game-modal')
    await expect(modal).toBeVisible()
    await expect(page.getByTestId('configure-save')).toBeVisible()
    await assertNoSeriousAxe(page, 'configure-game')
    await assertInputsAtLeast16px(page)

    await page.keyboard.press('Escape')
    await expect(modal).toHaveCount(0)
    await expect(openBtn).toBeFocused()
  })

  test('Configure Game Save visible on iPhone 15 landscape', async ({ page }) => {
    // iPhone 15 landscape CSS viewport ≈ 844×390
    await page.setViewportSize({ width: 844, height: 390 })
    await page.goto('/admin/panel?mock_admin=1')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({
      timeout: 30_000,
    })
    await page.getByTestId('admin-configure-game').click()
    const modal = page.getByTestId('configure-game-modal')
    await expect(modal).toBeVisible()
    const save = page.getByTestId('configure-save')
    await expect(save).toBeVisible()
    const box = await save.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.y + box!.height).toBeLessThanOrEqual(390 + 1)
    expect(box!.y).toBeGreaterThanOrEqual(0)
    // Show password buttons reachable
    await expect(page.getByRole('button', { name: /Show game password/i })).toBeVisible()
  })

  test('axe: claim popover', async ({ page }) => {
    await page.goto('/?mock_admin=1')
    await waitForBoard(page)
    await page.locator('button[data-position="1"]').click()
    await page.getByTestId('claim-now-button').click()
    const popover = page.getByTestId('claim-popover')
    await expect(popover).toBeVisible()
    await expect(popover.getByTestId('payment-venmo')).toHaveAttribute('aria-checked', 'false')
    await expect(popover.getByTestId('payment-venmo')).not.toHaveAttribute('aria-pressed')
    await assertNoSeriousAxe(page, 'claim-popover')
    await assertInputsAtLeast16px(page)

    await page.keyboard.press('Escape')
    await expect(popover).toHaveCount(0)
  })
})
