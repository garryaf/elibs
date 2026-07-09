import { test, expect } from '@playwright/test';

test.describe('Role-Based Access', () => {
  test('KASIR should not see audit trail', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'test-kasir@elis.local');
    await page.fill('input[type="password"]', 'Test@1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
    // Audit trail link should not be visible for KASIR
    await expect(page.locator('a[href="/dashboard/audit-trail"]')).not.toBeVisible();
  });

  test('DOKTER can access approval page', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'test-dokter@elis.local');
    await page.fill('input[type="password"]', 'Test@1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
    await page.goto('/dashboard/laboratory/approval');
    // Should not show access denied
    await expect(page.locator('text=/403|forbidden|ditolak/i')).not.toBeVisible({ timeout: 3000 });
  });
});
