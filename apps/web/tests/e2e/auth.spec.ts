import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Sign In')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@elis.local');
    await page.fill('input[type="password"]', 'Admin@1234');
    await page.click('button:has-text("Log In")');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'wrong@test.com');
    await page.fill('input[type="password"]', 'wrong');
    await page.click('button:has-text("Log In")');
    await expect(page.locator('text=Email atau password salah')).toBeVisible({ timeout: 5000 });
  });
});
