import { test, expect, type Page } from '@playwright/test'

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'iphone-14', width: 390, height: 844 },
  { name: 'iphone-x', width: 375, height: 812 },
] as const

const NARROW_VIEWPORTS = VIEWPORTS.filter(
  (v) => v.width === 390 || v.width === 375
)

async function waitForBoard(page: Page) {
  await expect(page.locator('button[data-position="1"]')).toBeVisible({ timeout: 30_000 })
}

async function selectAvailableSquare(page: Page, position: number) {
  const btn = page.locator(`button[data-position="${position}"]`)
  await btn.scrollIntoViewIfNeeded()
  await btn.click()
}

test.describe('Public view-only board', () => {
  for (const vp of VIEWPORTS) {
    test(`shows view-only notice @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/')
      await waitForBoard(page)

      await expect(page.getByTestId('view-only-notice')).toBeVisible()

      // Squares are disabled when view-only; force click still must not select
      const available = page.locator('button[data-position="1"]')
      await expect(available).toBeDisabled()
      await available.click({ force: true })
      await expect(available).toHaveAttribute('data-selected', 'false')
      await expect(page.locator('button[data-selected="true"]')).toHaveCount(0)
    })
  }
})

test.describe('Admin selection and claim popover', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/?mock_admin=1')
    await waitForBoard(page)
    await expect(page.getByTestId('view-only-notice')).toHaveCount(0)
  })

  test('selects nearby squares and opens claim popover', async ({ page }) => {
    // Mock claims every 3rd square; 1 and 2 are available and adjacent
    await selectAvailableSquare(page, 1)
    await selectAvailableSquare(page, 2)

    await expect(page.locator('button[data-position="1"]')).toHaveAttribute('data-selected', 'true')
    await expect(page.locator('button[data-position="2"]')).toHaveAttribute('data-selected', 'true')

    await page.getByTestId('claim-now-button').click()
    const popover = page.getByTestId('claim-popover')
    await expect(popover).toBeVisible()
  })

  test('opens popover for opposite-side squares (centered path)', async ({ page }) => {
    // Positions 1 (near top-left) and 98 (near bottom-right) are available in mock
    await selectAvailableSquare(page, 1)
    await selectAvailableSquare(page, 98)

    await page.getByTestId('claim-now-button').click()
    await expect(page.getByTestId('claim-popover')).toBeVisible()
  })

  test('shows 1-based #square on select and clears on deselect', async ({ page }) => {
    // data-position stays 0-based (storage); badge shows displaySquareNumber(4) → #5
    const btn = page.locator('button[data-position="4"]')
    await btn.scrollIntoViewIfNeeded()
    await btn.click()

    await expect(btn).toHaveAttribute('data-selected', 'true')
    await expect(btn).toHaveText(/#\d+/)
    await expect(btn).toContainText('#5')

    await btn.click()
    await expect(btn).toHaveAttribute('data-selected', 'false')
    await expect(btn).not.toHaveText(/#\d+/)
  })

  test('Venmo fee math in claim popover', async ({ page }) => {
    await selectAvailableSquare(page, 1)
    await selectAvailableSquare(page, 2)
    await page.getByTestId('claim-now-button').click()

    const popover = page.getByTestId('claim-popover')
    await expect(popover).toBeVisible()
    await expect(popover.getByText(/Subtotal \(2 × \$10\)/)).toBeVisible()
    await expect(popover.getByText('$20.00').first()).toBeVisible()

    await popover.getByTestId('payment-venmo').click()
    await expect(popover.getByTestId('payment-venmo')).toHaveAttribute('aria-pressed', 'true')
    await expect(popover.getByText('Venmo fee')).toBeVisible()
    await expect(popover.getByText('$2.00').first()).toBeVisible()
    await expect(popover.getByText('$22.00')).toBeVisible()
    await expect(popover.getByText(/Venmo adds a \$2\.00 fee/)).toBeVisible()
  })
})

test.describe('Axis team labels', () => {
  for (const vp of [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'mobile', width: 375, height: 812 },
  ] as const) {
    test(`shows NFC/AFC team names @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/')
      await waitForBoard(page)

      const nfc = page.getByTestId('nfc-axis-label')
      const afc = page.getByTestId('afc-axis-label')
      await expect(nfc).toBeVisible()
      await expect(afc).toBeVisible()
      await expect(nfc).toHaveText('NFC – Eagles')
      await expect(afc).toHaveText('AFC – Chiefs')

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.body.scrollWidth,
        innerWidth: window.innerWidth,
      }))
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1)
    })
  }
})

/** Count /Type /Page objects in a PDF buffer (excludes /Pages). */
function countPdfPages(pdf: Buffer): number {
  const text = pdf.toString('latin1')
  const matches = text.match(/\/Type\s*\/Page(?!\s*s)/g)
  return matches?.length ?? 0
}

test.describe('Board chrome: prizes, trophies, FAQ, print', () => {
  test('prizes banner, trophies, FAQ, and print board', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    await waitForBoard(page)

    await expect(page.getByLabel('Prizes')).toBeVisible()
    const topBuyersSection = page.locator('section').filter({ hasText: 'Top Buyers' })
    await expect(topBuyersSection.getByRole('heading', { name: 'Top Buyers' })).toBeVisible()
    await expect(topBuyersSection.getByText('Sarah Johnson', { exact: true })).toBeVisible()
    // Mock top buyers include 3 entries → gold/silver/bronze trophy icons
    await expect(topBuyersSection.locator('svg[aria-hidden="true"]')).toHaveCount(3)

    await expect(page.getByText('Frequently Asked Questions')).toBeVisible()
    await page.getByRole('button', { name: /What if I don't pay in time/i }).click()
    await expect(page.getByText(/4 days before the Super Bowl/)).toBeVisible()

    // Stub print so ?print=1 does not hang on the system dialog
    await page.addInitScript(() => {
      window.print = () => {}
    })
    await page.goto('/?print=1')
    await expect(page.locator('#print-board')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('nfc-axis-label')).toHaveText('NFC – Eagles')
    await expect(page.getByTestId('afc-axis-label')).toHaveText('AFC – Chiefs')
  })

  test('print fits on one letter landscape page with printed-at stamp', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.addInitScript(() => {
      window.print = () => {}
    })
    // mock_full=1 + print=1 → 100 long names; stamp set just before window.print()
    await page.goto('/?print=1&mock_full=1')
    await waitForBoard(page)
    await expect(page.locator('#print-board')).toBeVisible()

    // Stamp is written synchronously before the stubbed print()
    const printedAt = page.getByTestId('print-printed-at')
    await expect(printedAt).toHaveText(/^Printed [A-Za-z]{3}, .+ ET$/, { timeout: 5_000 })

    await page.emulateMedia({ media: 'print' })
    await expect(printedAt).toBeVisible()
    await expect(page.getByTestId('print-masthead')).toBeVisible()
    await expect(page.getByTestId('nfc-axis-label')).toBeVisible()
    await expect(page.getByTestId('afc-axis-label')).toBeVisible()
    // Long names from full mock appear on the grid
    await expect(page.getByText('Christopher Montgomery').first()).toBeVisible()

    const pdf = await page.pdf({
      format: 'letter',
      landscape: true,
      printBackground: true,
      margin: { top: '0.3in', right: '0.3in', bottom: '0.3in', left: '0.3in' },
    })
    expect(countPdfPages(Buffer.from(pdf))).toBe(1)

    // PNG of print-media render for walkthrough artifact
    await page.screenshot({
      path: '/opt/cursor/artifacts/print-board-one-page.png',
      fullPage: true,
    })
  })
})

test.describe('Horizontal overflow on narrow viewports', () => {
  for (const vp of NARROW_VIEWPORTS) {
    test(`no horizontal overflow @ ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/')
      await waitForBoard(page)

      const overflow = await page.evaluate(() => {
        return {
          scrollWidth: document.body.scrollWidth,
          innerWidth: window.innerWidth,
        }
      })
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1)
    })
  }
})
