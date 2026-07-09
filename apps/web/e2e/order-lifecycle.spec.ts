import { test, expect } from '@playwright/test';

test.describe('Order Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/');
    await page.fill('input[type="email"]', 'test-admin@elis.local');
    await page.fill('input[type="password"]', 'Test@1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
  });

  test('should display orders page', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await expect(page.locator('text=/order|pesanan/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display patients page', async ({ page }) => {
    await page.goto('/dashboard/patients');
    await expect(page.locator('text=/pasien/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display laboratory queue', async ({ page }) => {
    await page.goto('/dashboard/laboratory/queue');
    await expect(page.locator('text=/antrian|queue/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display settings page', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await expect(page.locator('text=/pengaturan|settings/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display audit trail page', async ({ page }) => {
    await page.goto('/dashboard/audit-trail');
    await expect(page.locator('text=/audit trail/i').first()).toBeVisible({ timeout: 5000 });
  });
});
