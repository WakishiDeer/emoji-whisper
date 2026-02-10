/**
 * AC-2: Handling unavailability of the built-in AI.
 * FR-3: Checking on-device AI availability.
 * FR-7: Graceful failure.
 *
 * Tests that the extension shows a toast message and does not display
 * a ghost overlay when AI is unavailable, downloading, or fails.
 */

import { test, expect } from './helpers/extension-fixture';
import { injectMockLanguageModel, OVERLAY, TIMING } from './helpers/mock-language-model';

test.describe('AC-2: AI Availability', () => {
  test('toast appears when AI is unavailable', async ({ extensionPage: page }) => {
    await page.addInitScript(injectMockLanguageModel, {
      availability: 'unavailable' as const,
    });
    await page.goto('/test-site.html');

    const textarea = page.getByTestId('basic-unavailable');
    await textarea.click();
    await textarea.fill('I love sunny days in the park');

    // Wait for idle + availability check.
    const toast = page.locator(OVERLAY.toast);
    await expect(toast).toBeVisible({ timeout: TIMING.waitForSuggestionMs });
    await expect(toast).toContainText('built-in AI');

    // Ghost overlay must NOT appear.
    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).not.toBeVisible();
  });

  test('Tab behaves normally when AI is unavailable', async ({ extensionPage: page }) => {
    await page.addInitScript(injectMockLanguageModel, {
      availability: 'unavailable' as const,
    });
    await page.goto('/test-site.html');

    const field1 = page.getByTestId('kb-field-1');
    await field1.click();
    await field1.fill('Hello world today');

    // Wait for idle so extension processes the input.
    await page.waitForTimeout(TIMING.idleDelayMs + 300);

    // No ghost overlay should appear.
    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).not.toBeVisible();

    // Tab should move focus normally.
    await page.keyboard.press('Tab');
    const field2 = page.getByTestId('kb-field-2');
    await expect(field2).toBeFocused();
  });

  test('downloading status shows appropriate message', async ({ extensionPage: page }) => {
    await page.addInitScript(injectMockLanguageModel, {
      availability: 'downloading' as const,
    });
    await page.goto('/test-site.html');

    const textarea = page.getByTestId('basic-unavailable');
    await textarea.click();
    await textarea.fill('Having a great day today');

    const toast = page.locator(OVERLAY.toast);
    await expect(toast).toBeVisible({ timeout: TIMING.waitForSuggestionMs });
    await expect(toast).toContainText('downloading');

    // No ghost overlay.
    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).not.toBeVisible();
  });

  test('generation failure shows toast gracefully', async ({ extensionPage: page }) => {
    await page.addInitScript(injectMockLanguageModel, {
      availability: 'available' as const,
      shouldThrow: true,
    });
    await page.goto('/test-site.html');

    const textarea = page.getByTestId('basic-gen-failure');
    await textarea.click();
    await textarea.fill('I love sunny days in the park');

    // Toast should appear with a failure message.
    const toast = page.locator(OVERLAY.toast);
    await expect(toast).toBeVisible({ timeout: TIMING.waitForSuggestionMs });
    await expect(toast).toContainText('unavailable');

    // No ghost overlay.
    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).not.toBeVisible();
  });

  test('toast is throttled within 30 seconds', async ({ extensionPage: page }) => {
    await page.addInitScript(injectMockLanguageModel, {
      availability: 'unavailable' as const,
    });
    await page.goto('/test-site.html');

    // First trigger — toast appears.
    const textarea1 = page.getByTestId('basic-toast-throttle');
    await textarea1.click();
    await textarea1.fill('I love sunny days in the park');

    const toast = page.locator(OVERLAY.toast);
    await expect(toast).toBeVisible({ timeout: TIMING.waitForSuggestionMs });

    // Wait for toast to auto-dismiss.
    await expect(toast).not.toBeVisible({ timeout: TIMING.toastDurationMs + 1000 });

    // Second trigger in a different field within 30 s window.
    const textarea2 = page.getByTestId('basic-unavailable');
    await textarea2.click();
    await textarea2.fill('Another sentence typed here');

    // Wait for idle + processing.
    await page.waitForTimeout(TIMING.idleDelayMs + 500);

    // Toast should NOT reappear (throttled).
    await expect(toast).not.toBeVisible();
  });
});
