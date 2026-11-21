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
  test('CR-only file shows preview, scrolls, Confirm with Game Password', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.alert = () => {}
      sessionStorage.setItem('mock_game_password', 'Ab1!xy')
      sessionStorage.setItem('mock_game_password_set', '1')
    })

    await gotoAdminPanel(page)
    await expect(page.getByTestId('admin-game-password-status')).toContainText('Set')

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snps-cr-'))
    const csvPath = path.join(tmpDir, 'mac-excel-cr.csv')
    // Write CR-only bytes explicitly
    fs.writeFileSync(csvPath, buildCrOnlyCsv().replace(/\n/g, '\r'), 'utf8')

    await page.getByTestId('admin-restore-backup').locator('input[type="file"]').setInputFiles(csvPath)

    const preview = page.getByTestId('restore-preview')
    await expect(preview).toBeVisible({ timeout: 10_000 })
    await expect(preview.getByRole('heading', { name: 'Restore preview' })).toBeVisible()
    await expect(preview.getByText(/1 claimed/)).toBeVisible()

    await preview.evaluate((el) =>
      el.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior })
    )
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
    await expect(page.getByTestId('confirmation-modal')).toBeVisible()
    await page.getByTestId('confirm-game-password').fill('Ab1!xy')
    await page.getByTestId('confirm-modal-confirm').click()
    await expect(page.getByTestId('confirmation-modal')).toHaveCount(0)
    await expect(page.getByTestId('restore-preview')).toHaveCount(0)

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})
