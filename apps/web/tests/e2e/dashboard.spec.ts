import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@elis.local');
    await page.fill('input[type="password"]', 'Admin@1234');
    await page.click('button:has-text("Log In")');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should display dashboard after login', async ({ page }) => {
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should show sidebar navigation', async ({ page }) => {
    await expect(page.locator('nav[aria-label="Menu Utama"]')).toBeVisible();
  });

  test('should navigate to patients page', async ({ page }) => {
    await page.click('a:has-text("Pasien")');
    await expect(page).toHaveURL(/\/dashboard\/patients/);
  });
});
