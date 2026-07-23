import { expect, test } from '@playwright/test';

test.describe('Landing page', () => {
  test('should be the initial page for a guest', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL('/');
    await expect(
      page.getByRole('heading', {
        name: '3 simple steps to a resume that lands you a job',
      }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Log In' })).toBeVisible();
  });

  test('should return a guest from a protected route to the landing page', async ({
    page,
  }) => {
    await page.goto('/home');

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: 'Create my resume' })).toBeVisible();
  });
});
