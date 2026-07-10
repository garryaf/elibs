import { test, expect } from '@playwright/test';

test.describe('Patient Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@elis.local');
    await page.fill('input[type="password"]', 'Admin@1234');
    await page.click('button:has-text("Log In")');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await page.goto('/dashboard/patients');
  });

  test('should display patients page', async ({ page }) => {
    await expect(page.locator('text=Manajemen Pasien')).toBeVisible();
  });

  test('should have search input', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Cari"]')).toBeVisible();
  });

  test('should have register patient button', async ({ page }) => {
    await expect(page.locator('text=Daftarkan Pasien')).toBeVisible();
  });
});
