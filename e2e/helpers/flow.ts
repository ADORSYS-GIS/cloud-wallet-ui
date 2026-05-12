import { expect, type Page } from '@playwright/test'

export async function clearClientStorage(page: Page) {
  await page.goto('/registration')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

export async function completeRegistration(page: Page) {
  await page.goto('/registration')
  await page.getByRole('button', { name: /register/i }).click()
  await expect(page.getByText('Scan the QR code')).toBeVisible({ timeout: 20_000 })
}

export async function openScanFromHome(page: Page) {
  await page.getByRole('button', { name: 'Scan credential offer QR' }).click()
  await expect(page).toHaveURL(/\/scan/)
}

export async function simulateQrScan(page: Page) {
  // E2E harness buttons use `sr-only` (off-screen). Playwright still treats them as outside the
  // viewport even with `force: true`, so trigger the DOM click handler directly.
  const btn = page.getByTestId('e2e-simulate-scan')
  await btn.waitFor({ state: 'attached' })
  await btn.evaluate((el) => (el as HTMLButtonElement).click())
}

export async function simulateInvalidOfferLocal(page: Page) {
  const btn = page.getByTestId('e2e-simulate-invalid-offer')
  await btn.waitFor({ state: 'attached' })
  await btn.evaluate((el) => (el as HTMLButtonElement).click())
}
