/**
 * AC-3: Ignoring IME composition.
 *
 * Tests that the extension does not trigger suggestions while an IME
 * composition is in progress, and only triggers after the composition ends.
 */

import { test, expect } from './helpers/extension-fixture';
import { injectMockLanguageModel, OVERLAY, TIMING } from './helpers/mock-language-model';

test.describe('AC-3: IME Composition', () => {
  test.beforeEach(async ({ extensionPage: page }) => {
    await page.addInitScript(injectMockLanguageModel, {
      availability: 'available' as const,
      emoji: '😊',
      reason: 'Expresses happiness',
    });
    await page.goto('/test-site.html');
  });

  test('no suggestion during IME composition', async ({ extensionPage: page }) => {
    const textarea = page.getByTestId('ime-textarea');
    await textarea.click();

    // Simulate IME composition start.
    await textarea.dispatchEvent('compositionstart', {});

    // Type characters while composing (simulated IME input).
    await page.keyboard.type('kyouhaiitenki', { delay: 30 });

    // Wait well beyond the idle delay.
    await page.waitForTimeout(TIMING.idleDelayMs * 2);

    // Ghost overlay must NOT appear during composition.
    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).not.toBeVisible();
  });

  test('suggestion triggers after IME commit', async ({ extensionPage: page }) => {
    const textarea = page.getByTestId('ime-textarea');
    await textarea.click();

    // Simulate IME composition lifecycle.
    await textarea.dispatchEvent('compositionstart', {});
    await page.keyboard.type('Today is nice weather', { delay: 20 });

    // No ghost during composition.
    const ghost = page.locator(OVERLAY.ghost);
    await page.waitForTimeout(TIMING.idleDelayMs + 200);
    await expect(ghost).not.toBeVisible();

    // End composition (commit).
    await textarea.dispatchEvent('compositionend', {});

    // After commit, idle timer should start and suggestion should trigger.
    await expect(ghost).toBeVisible({ timeout: TIMING.waitForSuggestionMs });
  });
});
