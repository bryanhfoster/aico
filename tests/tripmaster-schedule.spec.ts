import { test, expect } from '@playwright/test';

test('tripmaster schedule renders routes and holding pen', async ({ page }) => {
  const base = process.env.E2E_BASE_URL || 'http://localhost:5173';
  const url = new URL(base);
  url.searchParams.set('sandbox', '1');
  await page.goto(url.toString());
  await expect(page.getByText('Sandbox Gallery')).toBeVisible();
  await page.getByPlaceholder('Search...').fill('Tripmaster Schedule');
  // component card should appear
  await expect(page.getByText('Tripmaster Schedule')).toBeVisible();
  // there should be at least one route or "No legs assigned" placeholder
  await expect(page.locator('text=Routes')).toBeVisible();
});


