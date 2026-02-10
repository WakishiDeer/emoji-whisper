/**
 * Seed test — verifies that the extension loads, the fixture page serves,
 * and the mock LanguageModel is injected before the content script runs.
 *
 * This file doubles as the "seed" for the Playwright test generator agent.
 */

import { test, expect } from './helpers/extension-fixture';
import { injectMockLanguageModel, OVERLAY } from './helpers/mock-language-model';

test.describe('Seed', () => {
  test('extension loads and mock LanguageModel is available', async ({ extensionPage: page }) => {
    // Inject the mock before navigating so the content script sees it.
    await page.addInitScript(injectMockLanguageModel, {
      availability: 'available',
      emoji: '😊',
      reason: 'Seed test reason',
    } as const);

    await page.goto('/test-site.html');

    // The fixture page should have rendered.
    await expect(page.locator('header h1')).toContainText('Emoji Whisper');

    // The mock should be in place (page context = MAIN world).
    const hasModel = await page.evaluate(() => {
      return typeof (globalThis as Record<string, unknown>).LanguageModel === 'object';
    });
    expect(hasModel).toBe(true);

    // Verify extension content script loaded by checking that typing
    // into a supported input eventually produces an overlay.
    const textarea = page.getByTestId('basic-textarea');
    await textarea.click();
    await textarea.fill('I love sunny days in the park');

    // Wait for idle + suggestion.
    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).toBeVisible({ timeout: 3000 });
  });
});
