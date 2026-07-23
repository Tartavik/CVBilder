import { test, expect } from '@playwright/test';

const randomEmail = `test+${Date.now()}@example.com`;
const password = 'Password123!';

test.describe('Auth flow', () => {
  test('should show login page and switch to register', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL('/login');
    await expect(page.locator('mat-card-title', { hasText: 'Login' })).toBeVisible();
    await expect(page.getByText("Don't have an account?")).toBeVisible();

    await page.getByText('Register').click();
    await expect(page).toHaveURL('/register');
    await expect(page.locator('mat-card-title', { hasText: 'Register' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to login' })).toBeVisible();
  });

  test('should register and navigate back to login', async ({ page }) => {
    await page.goto('/register');
    await page.locator('input[type="email"]').fill(randomEmail);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm password').fill('Different123!');
    await page.getByLabel('Confirm password').blur();
    await expect(page.getByText('Passwords do not match')).toBeVisible();
    await expect(
      page.getByLabel('Confirm password').locator('xpath=ancestor::mat-form-field'),
    ).toHaveClass(/mat-form-field-invalid/);
    await expect(
      page
        .getByLabel('Confirm password')
        .locator('xpath=ancestor::mat-form-field')
        .locator('.mdc-notched-outline__trailing'),
    ).toHaveCSS('border-color', 'rgb(180, 35, 24)');
    await expect(page.getByRole('button', { name: 'Create account' })).toBeDisabled();

    await page.getByLabel('Confirm password').fill(password);
    await page.locator('button:has-text("Create account")').click();
    await expect(page).toHaveURL('/login');
  });

  test('should login with registered user', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(randomEmail);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('button:has-text("Login")').click();
    await expect(page).toHaveURL('/home');
    await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
  });

  test('should recover after invalid login credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(`missing-${Date.now()}@example.com`);
    await page.getByLabel('Password').fill(password);
    const loginResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith('/api/users/login'),
    );
    await page.getByRole('button', { name: 'Login' }).click();
    const loginResponse = await loginResponsePromise;

    expect(loginResponse.status()).toBe(401);
    const errorToast = page.locator('.login-toast', {
      hasText: 'Invalid email or password',
    });
    await expect(errorToast).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeEnabled();
    await expect(page.locator('mat-spinner')).toHaveCount(0);
    await expect(errorToast).toBeHidden({ timeout: 3000 });
  });
});
