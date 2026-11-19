import { expect, test, type Page } from '@playwright/test'

/**
 * iPhone / WebKit touch pass — use tap() (not click) so we exercise
 * touch targets the way Safari does on Don's phone.
 */

async function waitForBoard(page: Page) {
  await expect(page.locator('button[data-position="1"]')).toBeVisible({ timeout: 30_000 })
}

async function openBoardAsAdmin(page: Page) {
  await page.goto('/?mock_admin=1')
  await waitForBoard(page)
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
}

async function gotoAdmin(page: Page) {
  await page.goto('/admin/panel?mock_admin=1')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({
    timeout: 30_000,
  })
}

async function assertNoHOverflow(page: Page) {
  const ok = await page.evaluate(() => {
    const doc = document.documentElement
    // Prefer clientWidth (layout viewport) so overflow-x: clip on html/body counts as fixed
    return (
      Math.max(doc.scrollWidth, document.body.scrollWidth) <=
      Math.max(doc.clientWidth, window.innerWidth) + 2
    )
  })
  expect(ok).toBe(true)
}

async function assertMinTapHeight(locator: ReturnType<Page['getByTestId']>, min = 44) {
  const box = await locator.boundingBox()
  expect(box).toBeTruthy()
  expect(box!.height).toBeGreaterThanOrEqual(min - 1)
}

test.describe('iPhone touch: claim flow payment choice', () => {
  test.beforeEach(async ({ page }) => {
    await openBoardAsAdmin(page)
  })

  test('tap square, toggle Venmo/Cash, submit, Done', async ({ page }) => {
    await mockClaimRpc(page)

    const sq1 = page.locator('button[data-position="1"]')
    const sq2 = page.locator('button[data-position="2"]')
    await sq1.scrollIntoViewIfNeeded()
    await sq1.tap()
    await sq2.tap()

    await expect(sq1).toHaveAttribute('data-selected', 'true')
    await expect(sq1).toContainText('#2') // 1-based display

    await page.getByTestId('claim-now-button').tap()
    const popover = page.getByTestId('claim-popover')
    await expect(popover).toBeVisible()

    // Payment segmented control — large targets, sticky above safe-area
    const venmo = popover.getByTestId('payment-venmo')
    const cash = popover.getByTestId('payment-cash')
    await assertMinTapHeight(venmo, 44)
    await assertMinTapHeight(cash, 44)

    await venmo.tap()
    await expect(venmo).toHaveAttribute('aria-pressed', 'true')
    await expect(cash).toHaveAttribute('aria-pressed', 'false')
    await expect(popover.getByText('Venmo fee')).toBeVisible()

    await cash.tap()
    await expect(cash).toHaveAttribute('aria-pressed', 'true')
    await expect(venmo).toHaveAttribute('aria-pressed', 'false')

    await venmo.tap()
    await expect(venmo).toHaveAttribute('aria-pressed', 'true')

    await popover.locator('#firstName').fill('Don')
    await popover.locator('#lastName').fill('Tester')
    await popover.locator('#email').fill('don@example.com')

    // Inputs must be >= 16px to avoid iOS zoom
    const fontSize = await popover.locator('#firstName').evaluate((el) => {
      return parseFloat(getComputedStyle(el).fontSize)
    })
    expect(fontSize).toBeGreaterThanOrEqual(16)

    await popover.getByTestId('claim-submit').tap()

    const success = page.getByTestId('claim-success')
    await expect(success).toBeVisible({ timeout: 15_000 })
    const done = page.getByTestId('claim-success-done')
    await assertMinTapHeight(done, 44)
    await done.tap()
    await expect(success).toHaveCount(0)

    await assertNoHOverflow(page)
  })

  test('multi-select and clear via tap', async ({ page }) => {
    const a = page.locator('button[data-position="4"]')
    const b = page.locator('button[data-position="5"]')
    await a.tap()
    await b.tap()
    await expect(a).toHaveAttribute('data-selected', 'true')
    await expect(b).toHaveAttribute('data-selected', 'true')
    await page.getByRole('button', { name: 'Clear' }).tap()
    await expect(a).toHaveAttribute('data-selected', 'false')
  })
})

test.describe('iPhone touch: public chrome', () => {
  const VIEWPORTS = [
    { width: 375, height: 667, name: 'se' },
    { width: 390, height: 844, name: '14' },
    { width: 430, height: 932, name: 'pro-max' },
  ]

  for (const vp of VIEWPORTS) {
    test(`public sections visible @ ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/')
      await waitForBoard(page)

      await expect(page.getByRole('heading', { name: 'Top Buyers' })).toBeVisible()
      await expect(page.getByTestId('buyers-list')).toBeVisible()
      await expect(page.getByLabel('Prizes')).toBeVisible()
      await expect(page.getByText('Frequently Asked Questions')).toBeVisible()

      await page.getByRole('button', { name: /What if I don't pay in time/i }).tap()
      await expect(page.getByText(/4 days before the Super Bowl/)).toBeVisible()

      await page.getByRole('link', { name: 'Privacy Policy' }).tap()
      await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible()
      await page.goBack()
      await page.getByRole('link', { name: 'Terms of Service' }).tap()
      await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible()

      await assertNoHOverflow(page)
    })
  }
})

test.describe('iPhone touch: admin actions', () => {
  test('admin panel key controls are tappable', async ({ page }) => {
    await gotoAdmin(page)

    await expect(page.getByTestId('admin-join-password')).toBeVisible()
    await expect(page.getByTestId('admin-public-claiming-toggle')).toBeVisible()
    await page.getByTestId('admin-public-claiming-toggle').tap()

    await expect(page.getByTestId('admin-print-board')).toBeVisible()
    await expect(page.getByTestId('admin-download-backup')).toBeVisible()
    await expect(page.getByTestId('admin-restore-backup')).toBeVisible()

    await expect(page.getByTestId('admin-claims-grouped')).toBeVisible()
    await expect(page.getByTestId('admin-recent-claims')).toBeVisible()
    await expect(
      page.getByTestId('admin-claims-mobile').getByText(/Nov 19, 2026.*1:46\s*PM\s*ET/).first()
    ).toBeVisible()

    // Configure Game opens bottom sheet
    await page.getByRole('button', { name: /Configure Game/i }).tap()
    await expect(page.getByRole('heading', { name: /Configure/i })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).tap()

    // Payment toggle on claim-on-behalf
    const onBehalf = page.getByRole('heading', { name: 'Claim on Behalf' })
    await onBehalf.scrollIntoViewIfNeeded()
    await expect(page.getByTestId('payment-method-toggle').first()).toBeVisible()
    await page.getByTestId('payment-cash').first().tap()
    await expect(page.getByTestId('payment-cash').first()).toHaveAttribute(
      'aria-pressed',
      'true'
    )

    // Past Players section
    await expect(page.getByText(/Past Players/i).first()).toBeVisible()

    // Claims table may scroll horizontally inside overflow-x-auto; page itself should not
    await assertNoHOverflow(page)
  })
})
