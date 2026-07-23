import { expect, Page } from '@playwright/test';

export async function visitApp(page: Page) {
  await page.goto('/');
  await expect(page).toHaveTitle(/Bilder|CVBilder|Login|Register/);
}
