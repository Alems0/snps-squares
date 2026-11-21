import { expect, test, type Page } from '@playwright/test'

async function openBoardAsAdmin(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/?mock_admin=1')
  await expect(page.locator('button[data-position="1"]')).toBeVisible({ timeout: 30_000 })
}

/** Mock board claims every position where i % 3 === 0; others are free. */
function firstNAvailable(n: number): number[] {
  const out: number[] = []
  for (let i = 0; i < 100 && out.length < n; i++) {
    if (i % 3 !== 0) out.push(i)
  }
  return out
}

test.describe('Claim limit 100 + error messaging', () => {
  test('claim of 21 squares succeeds in mock', async ({ page }) => {
    await openBoardAsAdmin(page)
    const positions = firstNAvailable(21)
    expect(positions.length).toBe(21)

    for (const pos of positions) {
      const btn = page.locator(`button[data-position="${pos}"]`)
      await btn.scrollIntoViewIfNeeded()
      await btn.click()
    }

    await expect(page.getByTestId('claim-now-button')).toBeVisible()
    await page.getByTestId('claim-now-button').click()
    const popover = page.getByTestId('claim-popover')
    await expect(popover).toBeVisible()
    await popover.locator('#firstName').fill('Twenty')
    await popover.locator('#lastName').fill('One')
    await popover.locator('#email').fill('twenty.one@example.com')
    await popover.getByTestId('payment-cash').click()
    await popover.getByRole('button', { name: /Claim 21/i }).click()

    await expect(page.getByTestId('claim-success')).toBeVisible({ timeout: 15_000 })
  })

  test('taken-square conflict shows friendly error in popover', async ({ page }) => {
    await openBoardAsAdmin(page)

    await page.locator('button[data-position="1"]').click()
    await page.locator('button[data-position="2"]').click()
    await page.getByTestId('claim-now-button').click()

    const popover = page.getByTestId('claim-popover')
    await expect(popover).toBeVisible()
    await popover.locator('#firstName').fill('Taken')
    await popover.locator('#lastName').fill('Square')
    // Mock Board treats this email as an immediate taken-square conflict
    await popover.locator('#email').fill('taken@conflict.test')
    await popover.getByTestId('payment-cash').click()
    await popover.getByRole('button', { name: /Claim 2/i }).click()

    await expect(popover.getByText(/just taken/i)).toBeVisible()
    await expect(page.getByTestId('claim-success')).toHaveCount(0)
  })
})
