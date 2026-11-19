import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

async function gotoAdminPanel(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/admin/panel?mock_admin=1')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({
    timeout: 30_000,
  })
}

function buildCrOnlyCsv(): string {
  const header =
    'position,first_name,last_name,full_name,email,phone,payment_method,payment_status,claimed_at'
  const lines = ['# SETTINGS', '# SQUARES', header]
  for (let pos = 0; pos < 100; pos++) {
    if (pos === 0) {
      lines.push('0,Ada,Lovelace,Ada Lovelace,ada@test.com,,cash,unpaid,')
    } else if (pos === 1) {
      lines.push('1,,,,,,,unpaid,')
    } else {
      lines.push(`${pos},,,,,,,,unpaid,`)
    }
  }
  // Mac Excel classic: CR-only
  return lines.join('\r')
}

test.describe('Restore from backup CSV (mock)', () => {
  test('CR-only file shows preview, scrolls, Confirm calls RPC', async ({ page }) => {
    // Auto-accept window.confirm / alert
    await page.addInitScript(() => {
      window.confirm = () => true
      window.alert = () => {}
    })

    await gotoAdminPanel(page)

    let rpcCalled = false
    let rpcBody: string | null = null
    await page.route('**/*admin_restore_game_squares*', async (route) => {
      rpcCalled = true
      rpcBody = route.request().postData()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ restored: 100, skipped: 0, errors: [] }),
      })
    })
    // Never hit real Supabase for other REST calls during this test
    await page.route('**/rest/v1/**', async (route) => {
      if (route.request().url().includes('admin_restore_game_squares')) {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      })
    })

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snps-cr-'))
    const csvPath = path.join(tmpDir, 'mac-excel-cr.csv')
    // Write CR-only bytes explicitly
    fs.writeFileSync(csvPath, buildCrOnlyCsv().replace(/\n/g, '\r'), 'utf8')

    await page.getByTestId('admin-restore-backup').locator('input[type="file"]').setInputFiles(csvPath)

    const preview = page.getByTestId('restore-preview')
    await expect(preview).toBeVisible({ timeout: 10_000 })
    await expect(preview.getByRole('heading', { name: 'Restore preview' })).toBeVisible()
    await expect(preview.getByText(/1 claimed/)).toBeVisible()

    // Ensure scrolled into view (app uses smooth scroll; also force for headless timing)
    await preview.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior }))
    await expect
      .poll(
        async () =>
          preview.evaluate((el) => {
            const r = el.getBoundingClientRect()
            return r.top < window.innerHeight && r.bottom > 0
          }),
        { timeout: 5_000 }
      )
      .toBe(true)

    await page.getByTestId('confirm-restore').click()
    await expect.poll(() => rpcCalled, { timeout: 10_000 }).toBe(true)
    expect(rpcBody).toBeTruthy()

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})
