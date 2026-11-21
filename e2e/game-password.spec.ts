import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

const VALID_PASSWORD = 'Ab1!xy'

async function gotoAdmin(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.addInitScript(() => {
    window.alert = () => {}
  })
  // Clear mock session once on the app origin (not via addInitScript — that
  // re-runs on every navigation and would wipe Reset Board axis state).
  await page.goto('/')
  await page.evaluate(() => {
    sessionStorage.removeItem('mock_game_password')
    sessionStorage.removeItem('mock_game_password_set')
    sessionStorage.removeItem('mock_afc_numbers')
    sessionStorage.removeItem('mock_nfc_numbers')
    sessionStorage.removeItem('mock_numbers_locked')
  })
  await page.goto('/admin/panel?mock_admin=1')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({
    timeout: 30_000,
  })
}

async function setGamePasswordViaConfigure(page: Page, password: string) {
  await page.getByRole('button', { name: /Configure Game/i }).click()
  await expect(page.getByRole('heading', { name: 'Configure Game' })).toBeVisible()
  const input = page.getByTestId('game-password-input')
  await input.fill(password)
  await expect(page.getByTestId('configure-save')).toBeEnabled()
  await page.getByTestId('configure-save').click()
  await expect(page.getByRole('heading', { name: 'Configure Game' })).toHaveCount(0)
  await expect(page.getByTestId('admin-game-password-status')).toContainText('Set')
}

function tinyBackupCsv(): string {
  return [
    'position,first_name,last_name,full_name,email,phone,payment_method,payment_status,claimed_at',
    '0,Ada,Lovelace,Ada Lovelace,ada@test.com,,cash,unpaid,',
    '1,,,,,,,unpaid,',
  ].join('\n')
}

test.describe('Game Password complexity (Configure Game)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAdmin(page)
    await page.getByRole('button', { name: /Configure Game/i }).click()
    await expect(page.getByTestId('game-password-input')).toBeVisible()
  })

  test('live checklist and Save disabled until all rules pass', async ({ page }) => {
    const input = page.getByTestId('game-password-input')
    const save = page.getByTestId('configure-save')

    await input.fill('Ab1!')
    await expect(page.getByTestId('game-password-rule-length')).toHaveAttribute('data-ok', 'false')
    await expect(save).toBeDisabled()

    await input.fill('ab1!xy')
    await expect(page.getByTestId('game-password-rule-upper')).toHaveAttribute('data-ok', 'false')
    await expect(save).toBeDisabled()

    await input.fill('Secret!')
    await expect(page.getByTestId('game-password-rule-number')).toHaveAttribute('data-ok', 'false')
    await expect(save).toBeDisabled()

    await input.fill('Secret1')
    await expect(page.getByTestId('game-password-rule-special')).toHaveAttribute('data-ok', 'false')
    await expect(save).toBeDisabled()

    await input.fill(VALID_PASSWORD)
    await expect(page.getByTestId('game-password-rule-length')).toHaveAttribute('data-ok', 'true')
    await expect(page.getByTestId('game-password-rule-upper')).toHaveAttribute('data-ok', 'true')
    await expect(page.getByTestId('game-password-rule-number')).toHaveAttribute('data-ok', 'true')
    await expect(page.getByTestId('game-password-rule-special')).toHaveAttribute('data-ok', 'true')
    await expect(save).toBeEnabled()
  })

  test('blank Game Password keeps existing (Save stays enabled)', async ({ page }) => {
    await expect(page.getByTestId('configure-save')).toBeEnabled()
    await expect(page.getByTestId('game-password-checklist')).toHaveCount(0)
  })
})

test.describe('Game Password gates Reset / Clear / Restore', () => {
  test('unset password blocks all three actions', async ({ page }) => {
    await gotoAdmin(page)
    await expect(page.getByTestId('admin-game-password-status')).toContainText('Not set')

    await page.getByTestId('admin-reset-board').click()
    await expect(page.getByTestId('game-password-unset')).toBeVisible()
    await expect(page.getByTestId('confirm-modal-confirm')).toBeDisabled()
    await page.getByRole('button', { name: 'No' }).click()

    await page.getByTestId('admin-clear-numbers').click()
    await expect(page.getByTestId('game-password-unset')).toBeVisible()
    await expect(page.getByTestId('confirm-modal-confirm')).toBeDisabled()
    await page.getByRole('button', { name: 'No' }).click()

    await page.getByTestId('admin-restore-backup').locator('input[type="file"]').setInputFiles({
      name: 'tiny.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(tinyBackupCsv()),
    })
    await expect(page.getByTestId('restore-preview')).toBeVisible()
    await page.getByTestId('confirm-restore').click()
    await expect(page.getByTestId('game-password-unset')).toBeVisible()
    await expect(page.getByTestId('confirm-modal-confirm')).toBeDisabled()
  })

  test('wrong password shows inline error; correct password runs Reset Board', async ({
    page,
  }) => {
    await gotoAdmin(page)
    await setGamePasswordViaConfigure(page, VALID_PASSWORD)

    await page.getByTestId('admin-reset-board').click()
    await expect(page.getByTestId('confirmation-modal')).toContainText(
      /clear the randomized NFC\/AFC numbers/i
    )
    await page.getByTestId('confirm-game-password').fill('Wrong1!')
    await page.getByTestId('confirm-modal-confirm').click()
    await expect(page.getByTestId('confirm-password-error')).toContainText(/incorrect/i)
    await expect(page.getByTestId('confirmation-modal')).toBeVisible()

    await page.getByTestId('confirm-game-password').fill(VALID_PASSWORD)
    await page.getByTestId('confirm-modal-confirm').click()
    await expect(page.getByTestId('confirmation-modal')).toHaveCount(0)
  })

  test('Reset Board clears axis numbers and unlocks (headers become ?)', async ({ page }) => {
    await gotoAdmin(page)
    await setGamePasswordViaConfigure(page, VALID_PASSWORD)

    // Mock starts with seeded digits; lock them so unlock is observable after reset
    await page.getByTestId('admin-lock-numbers').click()
    await page.getByTestId('confirm-modal-confirm').click()
    await expect(page.getByText('Locked', { exact: true })).toBeVisible()
    await expect(page.getByTestId('admin-clear-numbers')).toBeDisabled()

    await page.getByTestId('admin-reset-board').click()
    await expect(page.getByTestId('confirmation-modal')).toContainText(
      /Numbers will be unlocked/i
    )
    await page.getByTestId('confirm-game-password').fill(VALID_PASSWORD)
    await page.getByTestId('confirm-modal-confirm').click()
    await expect(page.getByTestId('confirmation-modal')).toHaveCount(0)

    // Unlocked + unrandomized: Board Status Open; Lock disabled until numbers assigned
    await expect(page.getByText('Open', { exact: true })).toBeVisible()
    await expect(page.getByTestId('admin-lock-numbers')).toBeDisabled()
    await expect(page.getByTestId('admin-clear-numbers')).toBeEnabled()

    // Public board shares mock axis storage → '?' headers after reset
    await page.goto('/')
    await expect(page.locator('button[data-position="1"]')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('nfc-num-0')).toHaveText('?')
    await expect(page.getByTestId('afc-num-0')).toHaveText('?')
  })

  test('wrong then correct password for Clear Numbers', async ({ page }) => {
    await gotoAdmin(page)
    await setGamePasswordViaConfigure(page, VALID_PASSWORD)

    await page.getByTestId('admin-clear-numbers').click()
    await page.getByTestId('confirm-game-password').fill('Nope1!')
    await page.getByTestId('confirm-modal-confirm').click()
    await expect(page.getByTestId('confirm-password-error')).toContainText(/incorrect/i)

    await page.getByTestId('confirm-game-password').fill(VALID_PASSWORD)
    await page.getByTestId('confirm-modal-confirm').click()
    await expect(page.getByTestId('confirmation-modal')).toHaveCount(0)
  })

  test('wrong then correct password for Restore', async ({ page }) => {
    await gotoAdmin(page)
    await setGamePasswordViaConfigure(page, VALID_PASSWORD)

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snps-gp-'))
    const csvPath = path.join(tmpDir, 'backup.csv')
    fs.writeFileSync(csvPath, tinyBackupCsv(), 'utf8')

    await page.getByTestId('admin-restore-backup').locator('input[type="file"]').setInputFiles(csvPath)
    await expect(page.getByTestId('restore-preview')).toBeVisible()
    await page.getByTestId('confirm-restore').click()

    await page.getByTestId('confirm-game-password').fill('BadPass1!')
    await page.getByTestId('confirm-modal-confirm').click()
    await expect(page.getByTestId('confirm-password-error')).toContainText(/incorrect/i)

    await page.getByTestId('confirm-game-password').fill(VALID_PASSWORD)
    await page.getByTestId('confirm-modal-confirm').click()
    await expect(page.getByTestId('confirmation-modal')).toHaveCount(0)
    await expect(page.getByTestId('restore-preview')).toHaveCount(0)

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})
