import { test, expect } from '@playwright/test';

test('smoke: send a message and receive echo', async ({ page }) => {
  page.on('console', (msg) => console.log(`[browser:${msg.type()}] ${msg.text()}`));
  await page.goto('/?e2e=1');

  const input = page.getByTestId('chat-input');
  await expect(input).toBeVisible();

  const text = `smoke-${Date.now()}`;
  await input.fill(text);
  await page.getByTestId('chat-send').click();

  // User message should render quickly
  await expect(page.getByTestId('chat-main')).toContainText(text, { timeout: 10_000 });

  // Assistant echo can be from fallback or server
  await expect(page.getByText(new RegExp(`Echo: .*${text}`))).toBeVisible({ timeout: 20_000 });
});


