/**
 * AC-9: Accessibility announcement.
 *
 * Tests that overlay and toast elements have correct ARIA attributes
 * for screen reader compatibility.
 */

import { test, expect } from './helpers/extension-fixture';
import { injectMockLanguageModel, OVERLAY, TIMING } from './helpers/mock-language-model';

const MOCK_EMOJI = '😊';

test.describe('AC-9: Accessibility', () => {
  test('overlay has correct ARIA attributes', async ({ extensionPage: page }) => {
    await page.addInitScript(injectMockLanguageModel, {
      availability: 'available' as const,
      emoji: MOCK_EMOJI,
      reason: 'Expresses happiness',
    });
    await page.goto('/test-site.html');

    const textarea = page.getByTestId('overlay-aria');
    await textarea.click();
    await textarea.fill('I love sunny days in the park');

    // Wait for ghost overlay.
    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).toBeVisible({ timeout: TIMING.waitForSuggestionMs });

    // Check ARIA attributes on the mirror container.
    const mirror = page.locator(OVERLAY.mirror);
    await expect(mirror).toHaveAttribute('role', 'status');
    await expect(mirror).toHaveAttribute('aria-live', 'polite');
    await expect(mirror).toHaveAttribute('aria-atomic', 'true');
    await expect(mirror).toHaveAttribute('aria-label', `Suggested emoji: ${MOCK_EMOJI}`);
  });

  test('toast has correct ARIA attributes', async ({ extensionPage: page }) => {
    await page.addInitScript(injectMockLanguageModel, {
      availability: 'unavailable' as const,
    });
    await page.goto('/test-site.html');

    const textarea = page.getByTestId('basic-unavailable');
    await textarea.click();
    await textarea.fill('I love sunny days in the park');

    // Wait for toast.
    const toast = page.locator(OVERLAY.toast);
    await expect(toast).toBeVisible({ timeout: TIMING.waitForSuggestionMs });

    await expect(toast).toHaveAttribute('role', 'status');
    await expect(toast).toHaveAttribute('aria-live', 'polite');
  });
});
