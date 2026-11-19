import { test, expect, type Page } from '@playwright/test'

const VIEWPORTS = [
  { name: 'desktop-800', width: 1280, height: 800 },
  { name: 'laptop-768', width: 1366, height: 768 },
  { name: 'short-650', width: 1280, height: 650 },
  { name: 'iphone-14', width: 390, height: 844 },
  { name: 'iphone-se', width: 375, height: 667 },
] as const

async function openBoardAsAdmin(page: Page) {
  await page.goto('/?mock_admin=1')
  await expect(page.locator('button[data-position="1"]')).toBeVisible({ timeout: 30_000 })
}

async function mockClaimRpc(page: Page) {
  await page.route('**/*claim_squares*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        claimed: 2,
        failed_positions: [],
        fee: 2,
        square_subtotal: 20,
        total: 22,
      }),
    })
  })
  await page.route('**/rest/v1/**', async (route) => {
    if (route.request().url().includes('claim_squares')) {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    })
  })
}

async function completeVenmoClaim(page: Page) {
  await page.locator('button[data-position="1"]').click()
  await page.locator('button[data-position="2"]').click()
  await page.getByTestId('claim-now-button').click()
  const popover = page.getByTestId('claim-popover')
  await expect(popover).toBeVisible()

  await popover.locator('#firstName').fill('Test')
  await popover.locator('#lastName').fill('User')
  await popover.locator('#email').fill('test.user@example.com')
  await popover.getByTestId('payment-venmo').click()
  await popover.getByRole('button', { name: /Claim 2/i }).click()

  const success = page.getByTestId('claim-success')
  await expect(success).toBeVisible({ timeout: 15_000 })
  return success
}

test.describe('Claim success popup viewport fit', () => {
  for (const vp of VIEWPORTS) {
    test(`Venmo success Done in viewport @ ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await mockClaimRpc(page)
      await openBoardAsAdmin(page)

      const success = await completeVenmoClaim(page)

      // data-position 1 & 2 → display #2 and #3
      await expect(success.getByText('#2', { exact: true })).toBeVisible()
      await expect(success.getByText('#3', { exact: true })).toBeVisible()
      await expect(success.getByText('Venmo fee', { exact: true })).toBeVisible()
      await expect(success.getByText('$2.00').first()).toBeVisible()
      await expect(success.getByText(/4 days before the Super Bowl/)).toBeVisible()

      const overflow = await page.evaluate(
        () => document.body.scrollWidth <= window.innerWidth + 1
      )
      expect(overflow).toBe(true)

      const done = page.getByTestId('claim-success-done')
      await expect(done).toBeVisible()
      const box = await done.boundingBox()
      expect(box).toBeTruthy()
      const size = page.viewportSize()!
      expect(box!.y).toBeGreaterThanOrEqual(-1)
      expect(box!.y + box!.height).toBeLessThanOrEqual(size.height + 1)
      expect(box!.x).toBeGreaterThanOrEqual(-1)
      expect(box!.x + box!.width).toBeLessThanOrEqual(size.width + 1)

      const scrollBefore = await page.evaluate(() => window.scrollY)
      await done.click()
      const scrollAfter = await page.evaluate(() => window.scrollY)
      expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThanOrEqual(2)
      await expect(page.getByTestId('claim-success')).toHaveCount(0)
    })
  }
})
