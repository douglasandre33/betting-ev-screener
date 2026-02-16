import { expect, test } from '@playwright/test';

test('dashboard shell renders', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page.getByRole('heading', { name: '+EV Dashboard' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Refresh odds now' })).toBeVisible();
  await expect(page.getByText(/No \+EV rows yet/i)).toBeVisible();
});
