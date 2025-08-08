import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page.on('console', (msg) => {
    // Relay browser console logs to test console for Cursor visibility
    console.log(`[browser:${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    console.log('[browser:pageerror]', err?.message, err?.stack);
  });
});

test('chat echo flow and login prompt', async ({ page }) => {
  await page.goto('/?e2e=1');

  // Wait for header to show GUID and Online indicator
  await expect(page.getByText('GUID:')).toBeVisible();

  // Send a normal message
  const input = page.getByTestId('chat-input');
  const sendBtn = page.getByTestId('chat-send');
  await input.fill('hello world');
  await sendBtn.click();
  // Allow the UI event loop to flush
  await page.waitForTimeout(50);

  // Expect our user message to appear (allowing some time for UI render)
  await expect(page.getByTestId('chat-main')).toContainText('hello world', { timeout: 10_000 });

  // Expect an assistant echo if no API key is set
  await expect(page.getByText(/Echo:/)).toBeVisible({ timeout: 15_000 });

  // Test login path
  await input.fill('login');
  await input.press('Enter');

  // Either account prompt or auth prompt depending on hasAccount
  await expect(
    page.getByText(/You (don[’']t) have an account yet\. Want to create one\?|Please provide your email and password/)
  ).toBeVisible({ timeout: 15_000 });
});

test('presence count updates when another client connects', async ({ browser }) => {
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  pageA.on('console', (msg) => console.log(`[browser:${msg.type()}] ${msg.text()}`));
  await pageA.goto('/?e2e=1');
  await expect(pageA.getByText('GUID:')).toBeVisible();

  // Read initial count
  const header = pageA.locator('header');
  const beforeText = await header.textContent();
  const beforeMatch = beforeText?.match(/Online:\s*(\d+)/);
  const before = beforeMatch ? parseInt(beforeMatch[1], 10) : 0;

  // Open second client
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  pageB.on('console', (msg) => console.log(`[browser:${msg.type()}] ${msg.text()}`));
  await pageB.goto('/?e2e=1');
  await expect(pageB.getByText('GUID:')).toBeVisible();
  // Wait for presence broadcast and cross-tab update
  await pageB.waitForTimeout(500);

  // Expect Online count to increase on A
  await expect(header).toContainText(`Online: ${before + 1}`, { timeout: 10_000 });

  await contextB.close();
  await contextA.close();
});


