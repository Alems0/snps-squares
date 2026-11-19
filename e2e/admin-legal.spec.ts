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

test.describe('Admin panel (mock)', () => {
  test('renders controls, grouped claims, mark-all-paid, backup/restore', async ({
    page,
  }) => {
    await gotoAdminPanel(page)

    await expect(page.getByTestId('admin-join-password')).toBeVisible()
    await expect(page.getByTestId('admin-public-claiming-toggle')).toBeVisible()
    await expect(page.getByTestId('admin-public-claiming-toggle')).toBeEnabled()
    await expect(page.getByTestId('admin-print-board')).toBeVisible()
    await expect(page.getByTestId('admin-print-board')).toBeEnabled()
    await expect(page.getByTestId('admin-download-backup')).toBeVisible()
    await expect(page.getByTestId('admin-download-backup')).toBeEnabled()
    await expect(page.getByTestId('admin-restore-backup')).toBeVisible()
    await expect(page.getByTestId('admin-claims-grouped')).toBeVisible()

    // Metrics cards (labels appear in settings too — scope to dashboard cards)
    const metrics = page.locator('main .grid').first()
    await expect(metrics.getByText('Total Squares', { exact: true })).toBeVisible()
    await expect(metrics.getByText('Revenue', { exact: true })).toBeVisible()
    await expect(metrics.getByText('Charity', { exact: true })).toBeVisible()

    // Grouped claims + mark all paid (Sarah has unpaid squares) — desktop table at 1280px
    const desktopClaims = page.getByTestId('admin-claims-desktop')
    await expect(desktopClaims.getByText('Sarah Johnson')).toBeVisible()
    await expect(desktopClaims.getByTestId('mark-all-paid').first()).toBeVisible()

    // Restore: upload a tiny CSV and expect preview UI
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snps-restore-'))
    const csvPath = path.join(tmpDir, 'tiny-backup.csv')
    const csv = [
      'position,first_name,last_name,full_name,email,phone,payment_method,payment_status,claimed_at',
      '0,Ada,Lovelace,Ada Lovelace,ada@test.com,,cash,unpaid,',
      '1,,,,,,,unpaid,',
    ].join('\n')
    fs.writeFileSync(csvPath, csv)

    await page.getByTestId('admin-restore-backup').locator('input[type="file"]').setInputFiles(csvPath)
    const restoreHeading = page.getByRole('heading', { name: 'Restore preview' })
    await expect(restoreHeading).toBeVisible()
    await expect(page.getByText(/1 claimed, 1 empty/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirm restore' })).toBeVisible()

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})

test.describe('Legal pages', () => {
  test('privacy and terms render', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })

    await page.goto('/privacy')
    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible()

    await page.goto('/terms')
    await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible()
  })
})
