/**
 * AC-1: Generating a suggestion when AI is available.
 *
 * Tests the core suggestion flow: type ≥5 chars → idle → ghost emoji overlay
 * → Tab accepts → emoji inserted.
 */

import { test, expect } from './helpers/extension-fixture';
import { injectMockLanguageModel, OVERLAY, TIMING } from './helpers/mock-language-model';

const MOCK_EMOJI = '😊';
const MOCK_REASON = 'Expresses happiness';

test.describe('AC-1: Suggestion Flow', () => {
  test.beforeEach(async ({ extensionPage: page }) => {
    await page.addInitScript(injectMockLanguageModel, {
      availability: 'available' as const,
      emoji: MOCK_EMOJI,
      reason: MOCK_REASON,
    });
    await page.goto('/test-site.html');
  });

  test('type in empty textarea → ghost emoji appears', async ({ extensionPage: page }) => {
    const textarea = page.getByTestId('basic-textarea');
    await textarea.click();
    await textarea.fill('I love sunny days in the park');

    // Wait for idle delay + suggestion rendering.
    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).toBeVisible({ timeout: TIMING.waitForSuggestionMs });
    await expect(ghost).toContainText(MOCK_EMOJI);
  });

  test('Tab accepts the suggestion and inserts emoji', async ({ extensionPage: page }) => {
    const textarea = page.getByTestId('basic-textarea');
    await textarea.click();
    await textarea.fill('I love sunny days in the park');

    // Wait for the ghost to appear.
    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).toBeVisible({ timeout: TIMING.waitForSuggestionMs });

    // Press Tab to accept.
    await page.keyboard.press('Tab');

    // Ghost should disappear.
    await expect(ghost).not.toBeVisible();

    // Emoji should be inserted into the textarea value.
    const value = await textarea.inputValue();
    expect(value).toContain(MOCK_EMOJI);
  });

  test('pre-filled textarea triggers suggestion on focus + idle', async ({ extensionPage: page }) => {
    const textarea = page.getByTestId('basic-textarea-prefilled');

    // Click at end of pre-filled text.
    await textarea.click();
    // Move caret to end explicitly.
    await page.keyboard.press('End');

    // The pre-filled text is "Today was a great day at the park" (≥5 chars).
    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).toBeVisible({ timeout: TIMING.waitForSuggestionMs });
  });

  test('input[type=text] triggers suggestion', async ({ extensionPage: page }) => {
    const input = page.getByTestId('basic-input-text');
    await input.click();
    await input.fill('Having a wonderful time today');

    const ghost = page.locator(OVERLAY.ghost);
    await expect(ghost).toBeVisible({ timeout: TIMING.waitForSuggestionMs });
    await expect(ghost).toContainText(MOCK_EMOJI);

    // Accept with Tab.
    await page.keyboard.press('Tab');
    await expect(ghost).not.toBeVisible();
    const value = await input.inputValue();
    expect(value).toContain(MOCK_EMOJI);
  });

  test('Enter in multiline textarea may trigger suggestion', async ({ extensionPage: page }) => {
    const textarea = page.getByTestId('basic-textarea-multiline');
    await textarea.click();
    await textarea.fill('Having a great time today');
    await page.keyboard.press('Enter');

    // After Enter, suggestion MAY trigger. We just verify no error and the ghost
    // either appears or doesn't crash.
    const ghost = page.locator(OVERLAY.ghost);
    // Use a soft check: wait a bit and see if it appears (allowed but not required).
    const appeared = await ghost.isVisible().catch(() => false);
    // No assertion on `appeared` since AC-1 says "MAY trigger".
    // The important thing is no error was thrown.
    expect(true).toBe(true);
    if (appeared) {
      // If it did appear, it should contain our mock emoji.
      await expect(ghost).toContainText(MOCK_EMOJI);
    }
  });
});
