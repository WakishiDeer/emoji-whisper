/**
 * AC-5: Non-supported input types.
 *
 * Tests that the extension does not display suggestions for
 * contenteditable, email, password, number, url, search, or tel inputs.
 */

import { test, expect } from './helpers/extension-fixture';
import { injectMockLanguageModel, OVERLAY, TIMING } from './helpers/mock-language-model';

test.describe('AC-5: Unsupported Input Types', () => {
  test.beforeEach(async ({ extensionPage: page }) => {
    await page.addInitScript(injectMockLanguageModel, {
      availability: 'available' as const,
      emoji: '😊',
    });
    await page.goto('/test-site.html');
  });

  test('contenteditable div does not trigger suggestion', async ({ extensionPage: page }) => {
    const el = page.getByTestId('unsupported-contenteditable');
    await el.click();
    // Clear default content and type.
    await page.keyboard.press('Control+a');
    await page.keyboard.type('I love sunny days in the park', { delay: 10 });

    // Wait well beyond idle delay.
    await page.waitForTimeout(TIMING.idleDelayMs * 2);

    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).not.toBeVisible();
  });

  test('input[type=email] does not trigger suggestion', async ({ extensionPage: page }) => {
    const el = page.getByTestId('unsupported-email');
    await el.click();
    await el.fill('user@example.com plus some text');

    await page.waitForTimeout(TIMING.idleDelayMs * 2);

    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).not.toBeVisible();
  });

  test('input[type=password] does not trigger suggestion', async ({ extensionPage: page }) => {
    const el = page.getByTestId('unsupported-password');
    await el.click();
    await el.fill('MySecurePassword123');

    await page.waitForTimeout(TIMING.idleDelayMs * 2);

    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).not.toBeVisible();
  });

  test('input[type=number] does not trigger suggestion', async ({ extensionPage: page }) => {
    const el = page.getByTestId('unsupported-number');
    await el.click();
    await el.fill('123456789');

    await page.waitForTimeout(TIMING.idleDelayMs * 2);

    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).not.toBeVisible();
  });

  test('input[type=url] does not trigger suggestion', async ({ extensionPage: page }) => {
    const el = page.getByTestId('unsupported-url');
    await el.click();
    await el.fill('https://example.com/path/to/page');

    await page.waitForTimeout(TIMING.idleDelayMs * 2);

    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).not.toBeVisible();
  });

  test('input[type=search] does not trigger suggestion', async ({ extensionPage: page }) => {
    const el = page.getByTestId('unsupported-search');
    await el.click();
    await el.fill('search for something here');

    await page.waitForTimeout(TIMING.idleDelayMs * 2);

    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).not.toBeVisible();
  });

  test('input[type=tel] does not trigger suggestion', async ({ extensionPage: page }) => {
    const el = page.getByTestId('unsupported-tel');
    await el.click();
    await el.fill('09012345678');

    await page.waitForTimeout(TIMING.idleDelayMs * 2);

    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).not.toBeVisible();
  });
});
