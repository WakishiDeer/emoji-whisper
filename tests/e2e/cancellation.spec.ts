/**
 * AC-10: Cancellation on input change.
 * AC-12: No suggestion while selecting text.
 *
 * Tests that overlays are dismissed or requests cancelled when the user
 * edits text, changes focus, moves the caret, clicks, or makes a selection.
 */

import { test, expect } from './helpers/extension-fixture';
import { injectMockLanguageModel, OVERLAY, TIMING } from './helpers/mock-language-model';

const MOCK_EMOJI = '😊';

test.describe('AC-10 & AC-12: Cancellation', () => {
  test.beforeEach(async ({ extensionPage: page }) => {
    await page.addInitScript(injectMockLanguageModel, {
      availability: 'available' as const,
      emoji: MOCK_EMOJI,
      reason: 'Expresses happiness',
    });
    await page.goto('/test-site.html');
  });

  test('typing more dismisses the overlay', async ({ extensionPage: page }) => {
    const textarea = page.getByTestId('cancel-on-edit');
    await textarea.click();
    await textarea.fill('I love sunny days in the park');

    // Wait for ghost.
    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).toBeVisible({ timeout: TIMING.waitForSuggestionMs });

    // Type additional characters → overlay should vanish.
    await page.keyboard.type(' and more');
    await expect(ghost).not.toBeVisible();

    // No emoji should have been inserted.
    const value = await textarea.inputValue();
    expect(value).not.toContain(MOCK_EMOJI);
  });

  test('focus change dismisses the overlay', async ({ extensionPage: page }) => {
    const textareaA = page.getByTestId('cancel-focus-a');
    await textareaA.click();
    await textareaA.fill('I love sunny days in the park');

    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).toBeVisible({ timeout: TIMING.waitForSuggestionMs });

    // Click another textarea → overlay dismissed.
    const textareaB = page.getByTestId('cancel-focus-b');
    await textareaB.click();

    await expect(ghost).not.toBeVisible();

    // No emoji in textarea A.
    const value = await textareaA.inputValue();
    expect(value).not.toContain(MOCK_EMOJI);
  });

  test('arrow key (caret move) dismisses the overlay', async ({ extensionPage: page }) => {
    const textarea = page.getByTestId('cancel-caret-move');
    await textarea.click();
    // Move caret to end.
    await page.keyboard.press('End');

    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).toBeVisible({ timeout: TIMING.waitForSuggestionMs });

    // Press ArrowLeft to move caret.
    await page.keyboard.press('ArrowLeft');

    await expect(ghost).not.toBeVisible();

    // No emoji inserted.
    const value = await textarea.inputValue();
    expect(value).not.toContain(MOCK_EMOJI);
  });

  test('non-collapsed selection blocks suggestion', async ({ extensionPage: page }) => {
    const textarea = page.getByTestId('cancel-on-selection');
    await textarea.click();
    // The textarea has pre-filled text. Place caret at start.
    await page.keyboard.press('Home');

    // Create a selection using Shift+ArrowRight.
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Shift+ArrowRight');
    }

    // Wait well beyond idle delay.
    await page.waitForTimeout(TIMING.idleDelayMs * 2);

    // Ghost overlay must NOT appear while selection exists.
    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).not.toBeVisible();
  });

  test('selecting text while overlay is visible dismisses it', async ({
    extensionPage: page,
  }) => {
    const textarea = page.getByTestId('basic-textarea');
    await textarea.click();
    await textarea.fill('I love sunny days in the park');

    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).toBeVisible({ timeout: TIMING.waitForSuggestionMs });

    // Create a selection → overlay should disappear.
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Shift+ArrowLeft');
    }

    await expect(ghost).not.toBeVisible();

    // No emoji inserted.
    const value = await textarea.inputValue();
    expect(value).not.toContain(MOCK_EMOJI);
  });
});
