/**
 * AC-7: Skipping when context is too short or matches skip conditions.
 *
 * Tests that the extension does not call the Prompt API or
 * display an overlay when skip conditions are met.
 */

import { test, expect } from './helpers/extension-fixture';
import { injectMockLanguageModel, OVERLAY, TIMING } from './helpers/mock-language-model';

test.describe('AC-7: Skip Conditions', () => {
  test.beforeEach(async ({ extensionPage: page }) => {
    await page.addInitScript(injectMockLanguageModel, {
      availability: 'available' as const,
      emoji: '😊',
    });
    await page.goto('/test-site.html');
  });

  test('text shorter than 5 characters does not trigger', async ({ extensionPage: page }) => {
    const textarea = page.getByTestId('skip-short');
    await textarea.click();
    await textarea.fill('Hi');

    // Wait well beyond idle delay.
    await page.waitForTimeout(TIMING.idleDelayMs * 2);

    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).not.toBeVisible();
  });

  test('exactly 4 characters does not trigger', async ({ extensionPage: page }) => {
    const textarea = page.getByTestId('skip-short');
    await textarea.click();
    await textarea.fill('Test');

    await page.waitForTimeout(TIMING.idleDelayMs * 2);

    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).not.toBeVisible();
  });

  test('exactly 5 characters does trigger', async ({ extensionPage: page }) => {
    const textarea = page.getByTestId('basic-textarea');
    await textarea.click();
    await textarea.fill('Hello');

    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).toBeVisible({ timeout: TIMING.waitForSuggestionMs });
  });

  test('emoji-only input does not trigger', async ({ extensionPage: page }) => {
    const textarea = page.getByTestId('skip-emoji-only');
    await textarea.click();
    await textarea.fill('😀🎉🔥🌟💯');

    await page.waitForTimeout(TIMING.idleDelayMs * 2);

    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).not.toBeVisible();
  });

  test('empty or whitespace-only does not trigger', async ({ extensionPage: page }) => {
    const textarea = page.getByTestId('skip-empty');
    await textarea.click();
    await textarea.fill('     ');

    await page.waitForTimeout(TIMING.idleDelayMs * 2);

    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).not.toBeVisible();
  });
});
