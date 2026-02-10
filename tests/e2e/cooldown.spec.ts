/**
 * AC-11: Cooldown and same-context suppression.
 *
 * Tests that the extension respects a 2-second cooldown between
 * suggestion attempts and does not re-suggest for the same context.
 */

import { test, expect } from './helpers/extension-fixture';
import { injectMockLanguageModel, OVERLAY, TIMING } from './helpers/mock-language-model';

const MOCK_EMOJI = '😊';

test.describe('AC-11: Cooldown & Same-Context Suppression', () => {
  test.beforeEach(async ({ extensionPage: page }) => {
    await page.addInitScript(injectMockLanguageModel, {
      availability: 'available' as const,
      emoji: MOCK_EMOJI,
      reason: 'Expresses happiness',
    });
    await page.goto('/test-site.html');
  });

  test('cooldown suppresses suggestion within 2 seconds', async ({ extensionPage: page }) => {
    const textarea = page.getByTestId('cooldown-test');
    await textarea.click();
    await textarea.fill('I love sunny days in the park');

    // Wait for ghost and accept.
    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).toBeVisible({ timeout: TIMING.waitForSuggestionMs });
    await page.keyboard.press('Tab');
    await expect(ghost).not.toBeVisible();

    // Immediately type more text (within 2s cooldown).
    await page.keyboard.type(' and the weather is great');

    // Wait for idle but NOT for cooldown to expire.
    await page.waitForTimeout(TIMING.idleDelayMs + 300);

    // Ghost should NOT appear (cooldown active).
    await expect(ghost).not.toBeVisible();
  });

  test('same context does not re-trigger after dismissal', async ({ extensionPage: page }) => {
    const textarea = page.getByTestId('same-context-test');
    await textarea.click();
    await textarea.fill('I love sunny days in the park');

    // Wait for ghost and dismiss with Esc.
    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).toBeVisible({ timeout: TIMING.waitForSuggestionMs });
    await page.keyboard.press('Escape');
    await expect(ghost).not.toBeVisible();

    // Wait for cooldown to expire.
    await page.waitForTimeout(TIMING.cooldownMs + 500);

    // Re-focus the textarea without changing text.
    await page.getByTestId('basic-textarea').click();
    await textarea.click();
    await page.keyboard.press('End');

    // Wait for idle.
    await page.waitForTimeout(TIMING.idleDelayMs + 500);

    // Ghost should NOT appear (same context hash).
    await expect(ghost).not.toBeVisible();
  });

  test('after cooldown with new context, suggestion triggers again', async ({
    extensionPage: page,
  }) => {
    const textarea = page.getByTestId('cooldown-test');
    await textarea.click();
    await textarea.fill('I love sunny days in the park');

    // Wait for ghost and dismiss.
    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).toBeVisible({ timeout: TIMING.waitForSuggestionMs });
    await page.keyboard.press('Escape');
    await expect(ghost).not.toBeVisible();

    // Wait for cooldown to expire.
    await page.waitForTimeout(TIMING.cooldownMs + 500);

    // Type different text (new context).
    await textarea.fill('But sometimes it rains heavily');

    // Ghost should appear again.
    await expect(ghost).toBeVisible({ timeout: TIMING.waitForSuggestionMs });
  });
});
