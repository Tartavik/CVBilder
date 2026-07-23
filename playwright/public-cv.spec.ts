import { test, expect } from '@playwright/test';

test.describe('Public CV page', () => {
  test('should open the public CV page after creating a new CV', async ({ page }) => {
    const email = `test+${Date.now()}@example.com`;
    const password = 'Password123!';

    await page.goto('/register');
    await page.locator('input[type="email"]').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm password').fill(password);
    await page.locator('button:has-text("Create account")').click();
    await expect(page).toHaveURL('/login');

    await page.locator('input[type="email"]').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('button:has-text("Login")').click();
    await expect(page).toHaveURL('/home');

    await page.locator('button:has-text("New CV")').click();
    await page.locator('button.template-option', { hasText: 'Classic' }).click();
    await expect(page).toHaveURL(/\/cv\/[^/]+\/edit\?.*draft=1/);

    await page.getByLabel('Full name').fill('Taylor Morgan');
    await page.getByLabel('Job title').fill('Product Designer');
    await expect(page.locator('app-cv-preview-classic')).toContainText(
      'Taylor Morgan',
    );
    await page.getByRole('button', { name: 'Details' }).click();
    await page.getByLabel('Email').fill('taylor@example.com');
    await page.getByLabel('Phone').fill('+380501234567');
    await page.getByLabel('City').fill('Kyiv');
    await page.getByLabel('Summary').fill('Product designer focused on useful services.');
    await expect(page.locator('app-cv-preview-classic')).toContainText(
      'Product designer focused on useful services.',
    );
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('CV saved')).toBeVisible();
    await expect(page).toHaveURL(/\/cv\/[^/]+\/edit$/);

    await page.getByRole('link', { name: 'Public page' }).click();
    await expect(page).toHaveURL(/\/public\/cv\/[^/]+$/);
    await expect(page.locator('text=Public CV')).toBeVisible();
    await expect(page.locator('a:has-text("Dashboard")')).toBeVisible();
  });
});
