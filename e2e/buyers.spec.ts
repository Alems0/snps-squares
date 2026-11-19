import { expect, test } from '@playwright/test'

test.describe('Top Buyers and public Buyers list', () => {
  test('Top Buyers limited to 3 medals; Buyers list shows ET times', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Top Buyers' })).toBeVisible({
      timeout: 30_000,
    })

    const top = page.getByTestId('top-buyers-list')
    await expect(top).toBeVisible()
    await expect(top.locator('svg[aria-hidden="true"]')).toHaveCount(3)
    await expect(top.getByText('Sarah Johnson', { exact: true })).toBeVisible()
    await expect(top.getByText('Michael Chen', { exact: true })).toBeVisible()
    await expect(top.getByText('Emily Rodriguez', { exact: true })).toBeVisible()
    // 4th mock buyer must not appear in Top Buyers
    await expect(top.getByText('Jordan Lee')).toHaveCount(0)

    const buyers = page.getByTestId('buyers-list')
    await expect(buyers.getByRole('heading', { name: 'Buyers' })).toBeVisible()
    await expect(buyers.getByText('Emily Rodriguez', { exact: true })).toBeVisible()
    await expect(buyers.getByText('Jordan Lee', { exact: true })).toBeVisible()
    // Mock Emily firstClaimedAt 2026-11-19T18:46:00Z → Nov 19, 2026, 1:46 PM ET
    await expect(buyers.getByText(/Nov 19, 2026.*1:46\s*PM\s*ET/)).toBeVisible()
  })

  test('Buyers list is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    const buyers = page.getByTestId('buyers-list')
    await expect(buyers).toBeVisible({ timeout: 30_000 })
    await expect(buyers.getByText('Sarah Johnson', { exact: true })).toBeVisible()
    const overflow = await page.evaluate(
      () => document.body.scrollWidth <= window.innerWidth + 1
    )
    expect(overflow).toBe(true)
  })
})

test.describe('Admin claim timestamps', () => {
  test('Claims & Payments and Recent Claims show ET bought times', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/admin/panel?mock_admin=1')
    await expect(page.getByTestId('admin-claims-grouped')).toBeVisible({ timeout: 30_000 })

    const desktopClaims = page.getByTestId('admin-claims-desktop')
    await expect(desktopClaims.getByRole('columnheader', { name: 'Bought' })).toBeVisible()
    // Michael's earliest (only) claim: 2026-11-19T18:46Z → Nov 19, 2026, 1:46 PM ET
    await expect(desktopClaims.getByText(/Nov 19, 2026.*1:46\s*PM\s*ET/).first()).toBeVisible()

    const recent = page.getByTestId('admin-recent-claims')
    await expect(recent.getByRole('heading', { name: 'Recent Claims' })).toBeVisible()
    await expect(recent.getByText('Michael Chen', { exact: true })).toBeVisible()
    await expect(recent.getByText(/Nov 19, 2026.*1:46\s*PM\s*ET/)).toBeVisible()
    await expect(recent.getByText(/Square #10/)).toBeVisible() // position 9 → #10
  })
})
