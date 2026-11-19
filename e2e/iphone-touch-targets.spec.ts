import { expect, test, type Page } from '@playwright/test'

/**
 * Assert iPhone usability: inputs >= 16px, controls >= 44px,
 * Mark Paid / Remove in viewport without page horizontal scroll.
 */

const VIEWPORTS = [
  { width: 320, height: 568, name: 'iphone-5' },
  { width: 390, height: 664, name: 'iphone-14-short' },
  { width: 430, height: 932, name: 'iphone-pro-max' },
] as const

async function gotoAdmin(page: Page) {
  await page.goto('/admin/panel?mock_admin=1')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({
    timeout: 30_000,
  })
}

async function assertNoPageHOverflow(page: Page) {
  const ok = await page.evaluate(() => {
    const doc = document.documentElement
    return (
      Math.max(doc.scrollWidth, document.body.scrollWidth) <=
      Math.max(doc.clientWidth, window.innerWidth) + 2
    )
  })
  expect(ok).toBe(true)
}

async function fontSizeOf(locator: ReturnType<Page['locator']>) {
  return locator.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
}

async function minHeightOf(locator: ReturnType<Page['locator']>) {
  const box = await locator.boundingBox()
  expect(box).toBeTruthy()
  return box!.height
}

test.describe('iPhone touch targets & input sizes', () => {
  for (const vp of VIEWPORTS) {
    test(`admin claims cards + inputs @ ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await gotoAdmin(page)
      await assertNoPageHOverflow(page)

      // Past Players search + invite textarea >= 16px
      const search = page.getByTestId('past-players-search')
      await search.scrollIntoViewIfNeeded()
      expect(await fontSizeOf(search)).toBeGreaterThanOrEqual(16)

      const invite = page.getByTestId('invite-template')
      await invite.scrollIntoViewIfNeeded()
      expect(await fontSizeOf(invite)).toBeGreaterThanOrEqual(16)

      // Key admin controls >= 44px
      expect(
        await minHeightOf(page.getByTestId('admin-home-link'))
      ).toBeGreaterThanOrEqual(43)
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible()
      expect(await minHeightOf(page.getByRole('button', { name: 'Sign Out' }))).toBeGreaterThanOrEqual(
        43
      )
      expect(await minHeightOf(page.getByRole('button', { name: 'Show' }))).toBeGreaterThanOrEqual(43)
      expect(
        await minHeightOf(page.getByRole('button', { name: 'Save' }).first())
      ).toBeGreaterThanOrEqual(43)
      expect(
        await minHeightOf(page.getByRole('button', { name: 'Add Player' }))
      ).toBeGreaterThanOrEqual(43)
      expect(
        await minHeightOf(page.getByRole('button', { name: 'Export CSV' }))
      ).toBeGreaterThanOrEqual(43)
      expect(
        await minHeightOf(page.getByRole('button', { name: 'Copy numbers' }))
      ).toBeGreaterThanOrEqual(43)
      expect(
        await minHeightOf(page.getByRole('button', { name: 'Copy message' }))
      ).toBeGreaterThanOrEqual(43)
      expect(
        await minHeightOf(page.getByRole('button', { name: 'Reset default' }))
      ).toBeGreaterThanOrEqual(43)

      const selectAll = page.getByTestId('select-all-with-phone')
      await selectAll.scrollIntoViewIfNeeded()
      const selectBox = await selectAll.boundingBox()
      expect(selectBox).toBeTruthy()
      expect(selectBox!.height).toBeGreaterThanOrEqual(43)
      expect(selectBox!.width).toBeGreaterThanOrEqual(43)

      // Mobile claims cards — Mark Paid / Remove in viewport
      const mobile = page.getByTestId('admin-claims-mobile')
      await expect(mobile).toBeVisible()
      await mobile.scrollIntoViewIfNeeded()

      const markPaid = mobile.getByTestId('mark-paid').first()
      const remove = mobile.getByTestId('remove-claim').first()
      await expect(markPaid).toBeVisible()
      await expect(remove).toBeVisible()

      expect(await minHeightOf(markPaid)).toBeGreaterThanOrEqual(43)
      expect(await minHeightOf(remove)).toBeGreaterThanOrEqual(43)

      const markBox = await markPaid.boundingBox()
      const removeBox = await remove.boundingBox()
      expect(markBox).toBeTruthy()
      expect(removeBox).toBeTruthy()
      const vw = page.viewportSize()!.width
      expect(markBox!.x).toBeGreaterThanOrEqual(0)
      expect(markBox!.x + markBox!.width).toBeLessThanOrEqual(vw + 1)
      expect(removeBox!.x).toBeGreaterThanOrEqual(0)
      expect(removeBox!.x + removeBox!.width).toBeLessThanOrEqual(vw + 1)

      await assertNoPageHOverflow(page)
    })
  }

  test('restore preview Cancel/Confirm >= 44px @ 390x844', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await gotoAdmin(page)

    const csv = [
      'position,first_name,last_name,full_name,email,phone,payment_method,payment_status,claimed_at',
      '0,Ada,Lovelace,Ada Lovelace,ada@test.com,,cash,unpaid,',
      '1,,,,,,,unpaid,',
    ].join('\n')
    await page.getByTestId('admin-restore-backup').locator('input[type="file"]').setInputFiles({
      name: 'tiny-backup.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv),
    })
    await expect(page.getByRole('heading', { name: 'Restore preview' })).toBeVisible()
    expect(await minHeightOf(page.getByTestId('restore-cancel'))).toBeGreaterThanOrEqual(43)
    expect(await minHeightOf(page.getByTestId('confirm-restore'))).toBeGreaterThanOrEqual(43)
  })

  test('public Admin Login, footer, and Terms inline Privacy >= 44px @ 390x844', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Admin Login' })).toBeVisible({
      timeout: 30_000,
    })
    expect(
      await minHeightOf(page.getByRole('link', { name: 'Admin Login' }))
    ).toBeGreaterThanOrEqual(43)

    const privacy = page.locator('footer').getByRole('link', { name: 'Privacy Policy' })
    await privacy.scrollIntoViewIfNeeded()
    expect(await minHeightOf(privacy)).toBeGreaterThanOrEqual(43)
    expect(
      await minHeightOf(page.locator('footer').getByRole('link', { name: 'Terms of Service' }))
    ).toBeGreaterThanOrEqual(43)

    await privacy.tap()
    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible()
    expect(
      await minHeightOf(page.getByRole('link', { name: 'Back to Board' }))
    ).toBeGreaterThanOrEqual(43)

    await page.goto('/terms')
    const inlinePrivacy = page.getByTestId('terms-inline-privacy')
    await inlinePrivacy.scrollIntoViewIfNeeded()
    expect(await minHeightOf(inlinePrivacy)).toBeGreaterThanOrEqual(43)
  })
})
