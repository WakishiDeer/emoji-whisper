/**
 * AC-4: Cancelling a suggestion (Esc).
 * AC-6: Default behaviour when no suggestion is pending (Tab/Shift+Tab).
 *
 * Tests keyboard interactions: Tab accepts, Shift+Tab navigates,
 * Esc dismisses, and Tab moves focus when there's no overlay.
 */

import { test, expect } from './helpers/extension-fixture';
import { injectMockLanguageModel, OVERLAY, TIMING } from './helpers/mock-language-model';

const MOCK_EMOJI = '😊';

test.describe('AC-4 & AC-6: Keyboard Behavior', () => {
  test.beforeEach(async ({ extensionPage: page }) => {
    await page.addInitScript(injectMockLanguageModel, {
      availability: 'available' as const,
      emoji: MOCK_EMOJI,
      reason: 'Expresses happiness',
    });
    await page.goto('/test-site.html');
  });

  test('Esc dismisses suggestion overlay', async ({ extensionPage: page }) => {
    // Trigger a suggestion.
    const textarea = page.getByTestId('basic-textarea');
    await textarea.click();
    await textarea.fill('I love sunny days in the park');

    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).toBeVisible({ timeout: TIMING.waitForSuggestionMs });

    // Press Esc → overlay disappears, no emoji inserted.
    await page.keyboard.press('Escape');
    await expect(ghost).not.toBeVisible();

    const value = await textarea.inputValue();
    expect(value).not.toContain(MOCK_EMOJI);
    expect(value).toBe('I love sunny days in the park');
  });

  test('Tab with no suggestion moves focus normally', async ({ extensionPage: page }) => {
    // Click Field 1 but do NOT type enough to trigger a suggestion.
    const field1 = page.getByTestId('kb-field-1');
    await field1.click();

    // Ensure no ghost overlay is present.
    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).not.toBeVisible();

    // Press Tab → focus should move to Field 2.
    await page.keyboard.press('Tab');
    const field2 = page.getByTestId('kb-field-2');
    await expect(field2).toBeFocused();
  });

  test('Shift+Tab with suggestion visible moves focus (never intercepted)', async ({
    extensionPage: page,
  }) => {
    // Type in Field 2 (textarea) and wait for ghost.
    const field2 = page.getByTestId('kb-field-2');
    await field2.click();
    await field2.fill('I love sunny days in the park');

    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).toBeVisible({ timeout: TIMING.waitForSuggestionMs });

    // Shift+Tab → focus moves back to Field 1; overlay is dismissed; no emoji inserted.
    await page.keyboard.press('Shift+Tab');

    const field1 = page.getByTestId('kb-field-1');
    await expect(field1).toBeFocused();
    await expect(ghost).not.toBeVisible();

    const value = await field2.inputValue();
    expect(value).not.toContain(MOCK_EMOJI);
  });

  test('Shift+Tab with no suggestion moves focus normally', async ({ extensionPage: page }) => {
    // Focus Field 2 without triggering a suggestion.
    const field2 = page.getByTestId('kb-field-2');
    await field2.click();

    await page.keyboard.press('Shift+Tab');

    const field1 = page.getByTestId('kb-field-1');
    await expect(field1).toBeFocused();
  });

  test('Tab with suggestion accepts emoji and keeps focus', async ({ extensionPage: page }) => {
    // Type in Field 2 and wait for ghost.
    const field2 = page.getByTestId('kb-field-2');
    await field2.click();
    await field2.fill('I love sunny days in the park');

    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).toBeVisible({ timeout: TIMING.waitForSuggestionMs });

    // Press Tab → emoji inserted, focus stays, ghost disappears.
    await page.keyboard.press('Tab');

    await expect(ghost).not.toBeVisible();
    await expect(field2).toBeFocused();

    const value = await field2.inputValue();
    expect(value).toContain(MOCK_EMOJI);
  });
});
