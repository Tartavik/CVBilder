import { expect, test, type Page } from '@playwright/test';

const password = 'Password123!';

async function registerAndLogin(page: Page): Promise<void> {
  const email = `additional-${Date.now()}@example.com`;
  await page.goto('/register');
  await page.locator('input[type="email"]').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/login');

  await page.locator('input[type="email"]').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL('/home');
}

test('adds, previews and persists an additional CV section', async ({
  page,
}) => {
  await registerAndLogin(page);

  await page.getByRole('button', { name: /New CV/ }).click();
  await page
    .locator('button.template-option', { hasText: 'Single column' })
    .click();
  await expect(page).toHaveURL(/\/cv\/[^/]+\/edit\?.*draft=1/);

  await page.getByLabel('Full name').fill('Alex Morgan');
  await page.getByLabel('Job title').fill('Product Designer');
  await page.getByLabel('Email').fill('alex@example.com');
  await page.getByLabel('Phone').fill('+380501234567');
  await page.getByLabel('City').fill('Kyiv');
  await page
    .getByLabel('Summary')
    .fill('Product designer focused on useful digital services.');
  await expect(page.locator('app-cv-preview')).toContainText('Alex Morgan');

  await page.getByRole('button', { name: /Additional Sections/ }).click();
  await page.getByLabel('Section type').click();
  await page.getByRole('option', { name: 'Languages' }).click();
  await page.getByRole('button', { name: 'Add entry' }).click();
  await page.getByRole('textbox', { name: 'Language' }).fill('English');
  await page.getByLabel('Level').click();
  await page.getByRole('option', { name: 'Advanced (C1)' }).click();

  await expect(page.locator('app-cv-preview')).toContainText('Languages');
  await expect(page.locator('app-cv-preview')).toContainText('English');
  await expect(page.locator('app-cv-preview')).toContainText('Advanced (C1)');

  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Draft saved')).toBeVisible();
  await expect(page).toHaveURL(/\/cv\/[^/]+\/edit$/);

  await page.reload();
  await page.getByRole('button', { name: /Additional Sections/ }).click();
  await expect(page.getByRole('textbox', { name: 'Language' })).toHaveValue(
    'English',
  );
  await expect(page.locator('app-cv-preview')).toContainText('Advanced (C1)');
});
