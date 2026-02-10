/**
 * AC-13: Reason tooltip on hover.
 *
 * Tests that hovering the ghost emoji overlay shows a tooltip with
 * the AI's reasoning, without dismissing the overlay or stealing focus.
 */

import { test, expect } from './helpers/extension-fixture';
import { injectMockLanguageModel, OVERLAY, TIMING } from './helpers/mock-language-model';

const MOCK_EMOJI = '😊';
const MOCK_REASON = 'Expresses joy and happiness';

test.describe('AC-13: Tooltip on Hover', () => {
  test.beforeEach(async ({ extensionPage: page }) => {
    await page.addInitScript(injectMockLanguageModel, {
      availability: 'available' as const,
      emoji: MOCK_EMOJI,
      reason: MOCK_REASON,
    });
    await page.goto('/test-site.html');
  });

  test('hovering ghost shows reason tooltip', async ({ extensionPage: page }) => {
    const textarea = page.getByTestId('overlay-tooltip');
    await textarea.click();
    await textarea.fill('I love sunny days in the park');

    // Wait for ghost overlay.
    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).toBeVisible({ timeout: TIMING.waitForSuggestionMs });
    await expect(ghost).toContainText(MOCK_EMOJI);

    // Hover over the ghost emoji.
    await ghost.hover();

    // Tooltip should become visible with the reason text.
    const tooltip = page.locator(OVERLAY.tooltip);
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(MOCK_REASON);

    // Overlay should still be visible (hover doesn't dismiss it).
    await expect(ghost).toBeVisible();
  });

  test('hovering does not steal focus from input', async ({ extensionPage: page }) => {
    const textarea = page.getByTestId('overlay-tooltip');
    await textarea.click();
    await textarea.fill('I love sunny days in the park');

    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).toBeVisible({ timeout: TIMING.waitForSuggestionMs });

    // Hover over ghost.
    await ghost.hover();

    // Focus should remain on the textarea.
    await expect(textarea).toBeFocused();
  });

  test('moving mouse away hides tooltip', async ({ extensionPage: page }) => {
    const textarea = page.getByTestId('overlay-tooltip');
    await textarea.click();
    await textarea.fill('I love sunny days in the park');

    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).toBeVisible({ timeout: TIMING.waitForSuggestionMs });

    // Hover to show tooltip.
    await ghost.hover();
    const tooltip = page.locator(OVERLAY.tooltip);
    await expect(tooltip).toBeVisible();

    // Move mouse away from the ghost (hover the textarea body).
    await textarea.hover({ position: { x: 5, y: 5 } });

    // Tooltip should hide, but ghost overlay remains.
    await expect(tooltip).not.toBeVisible();
    await expect(ghost).toBeVisible();
  });
});
