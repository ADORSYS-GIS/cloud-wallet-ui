import { expect, test } from '@playwright/test'

import { installIssuanceApiMock } from './fixtures/api-mock'
import {
  clearClientStorage,
  completeRegistration,
  openScanFromHome,
  simulateInvalidOfferLocal,
  simulateQrScan,
} from './helpers/flow'

test.describe.configure({ mode: 'parallel' })

test.beforeEach(async ({ page }) => {
  await clearClientStorage(page)
})

test.describe('Authorization code flow', () => {
  test('redirects to issuer authorization URL after consent', async ({ page }) => {
    await installIssuanceApiMock(page, { startProfile: 'auth_code' })
    await completeRegistration(page)
    await openScanFromHome(page)
    await simulateQrScan(page)

    await expect(page.getByRole('button', { name: 'Issue VC' })).toBeVisible()
    await page.getByRole('button', { name: 'Issue VC' }).click()

    await page.waitForURL(/mock-authorize\.e2e\.test/, { timeout: 20_000 })
    await expect(page).toHaveTitle(/E2E mock AS/)
  })
})

test.describe('Pre-authorized code flow (no transaction code)', () => {
  test('completes issuance and shows success screen', async ({ page }) => {
    await installIssuanceApiMock(page, { startProfile: 'pre_no_tx' })
    await completeRegistration(page)
    await openScanFromHome(page)
    await simulateQrScan(page)

    await page.getByRole('button', { name: 'Issue VC' }).click()

    await expect(
      page.getByRole('heading', { name: 'Credential added to your wallet' })
    ).toBeVisible({ timeout: 25_000 })
  })
})

test.describe('Pre-authorized code flow (with transaction code)', () => {
  test('accepts tx code and completes issuance', async ({ page }) => {
    await installIssuanceApiMock(page, { startProfile: 'pre_tx' })
    await completeRegistration(page)
    await openScanFromHome(page)
    await simulateQrScan(page)

    await page.getByRole('button', { name: 'Issue VC' }).click()

    await expect(page.getByText('Transaction Code Required')).toBeVisible()
    const input = page.getByRole('textbox', { name: 'Transaction code' })
    // Boxed numeric TX UI keeps the real `<input>` in `sr-only`; fill needs `force`.
    await input.fill('123456', { force: true })
    await page.getByRole('button', { name: 'Submit Code' }).click()

    await expect(
      page.getByRole('heading', { name: 'Credential added to your wallet' })
    ).toBeVisible({ timeout: 25_000 })
  })
})

test.describe('User rejection flow', () => {
  test('declines offer via consent and returns to scan', async ({ page }) => {
    await installIssuanceApiMock(page, { startProfile: 'pre_no_tx' })
    await completeRegistration(page)
    await openScanFromHome(page)
    await simulateQrScan(page)

    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page).toHaveURL(/\/scan/, { timeout: 15_000 })
  })
})

test.describe('Error handling', () => {
  test('shows error when backend rejects offer (invalid_credential_offer)', async ({
    page,
  }) => {
    await installIssuanceApiMock(page, {
      startProfile: 'pre_no_tx',
      startFailure: 'invalid_offer',
    })
    await completeRegistration(page)
    await openScanFromHome(page)
    await simulateQrScan(page)

    await expect(page.getByText(/Mock: offer rejected/i)).toBeVisible({
      timeout: 20_000,
    })
  })

  test('shows error when issuance/start fails at network layer', async ({ page }) => {
    await installIssuanceApiMock(page, {
      startProfile: 'pre_no_tx',
      startFailure: 'network',
    })
    await completeRegistration(page)
    await openScanFromHome(page)
    await simulateQrScan(page)

    await expect(page.getByRole('button', { name: 'Scan again' })).toBeVisible({
      timeout: 20_000,
    })
  })

  test('shows error for locally invalid scan payload', async ({ page }) => {
    await installIssuanceApiMock(page, { startProfile: 'pre_no_tx' })
    await completeRegistration(page)
    await openScanFromHome(page)
    await simulateInvalidOfferLocal(page)

    await expect(
      page.getByText(/The scanned QR code does not contain a valid credential offer/i)
    ).toBeVisible({
      timeout: 15_000,
    })
  })
})

test.describe('Credential storage integration', () => {
  test('can open issued credential from success screen', async ({ page }) => {
    await installIssuanceApiMock(page, { startProfile: 'pre_no_tx' })
    await completeRegistration(page)
    await openScanFromHome(page)
    await simulateQrScan(page)

    await page.getByRole('button', { name: 'Issue VC' }).click()
    await expect(
      page.getByRole('heading', { name: 'Credential added to your wallet' })
    ).toBeVisible({ timeout: 25_000 })

    await page.getByRole('button', { name: 'View Credential' }).click()
    await expect(page.getByText('Credential Details')).toBeVisible()
    await page.getByRole('button', { name: 'Show All' }).click()
    await expect(page.getByText('E2E', { exact: true })).toBeVisible()
  })
})
