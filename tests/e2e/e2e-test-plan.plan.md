# Emoji Whisper E2E Test Plan

## Application Overview

End-to-end tests for the Emoji Whisper browser extension. The extension suggests a single emoji based on user input in textarea and input[type=text] fields using Chrome's on-device Prompt API. Tests use a mock LanguageModel injected via page.addInitScript() before navigation, so real AI is not required. The extension content script runs in MAIN world at document_idle. All tests use the fixture page at tests/e2e/fixtures/test-site.html served on localhost:3333.

## Test Scenarios

### 1. AC-2: AI Availability

**Seed:** `tests/e2e/seed.spec.ts`

#### 1.1. Toast appears when AI is unavailable

**File:** `tests/e2e/ai-availability.spec.ts`

**Steps:**
  1. Inject mock with availability: 'unavailable'. Navigate to test-site.html.
    - expect: Page loads successfully
  2. Click textarea [data-testid='basic-unavailable'] and type 'I love sunny days in the park' (≥5 chars). Wait for idle (~700ms).
    - expect: A toast message (.ec-toast) appears with text mentioning built-in AI and Chrome/Edge
    - expect: No ghost overlay (.ec-mirror-ghost) is shown
    - expect: No Prompt API call is made

#### 1.2. Tab behaves normally when AI is unavailable

**File:** `tests/e2e/ai-availability.spec.ts`

**Steps:**
  1. Inject mock with availability: 'unavailable'. Navigate to test-site.html.
    - expect: Page loads successfully
  2. Click input [data-testid='kb-field-1'] and type 'Hello world today'. Wait for idle. Then press Tab.
    - expect: No ghost overlay appears
    - expect: Tab moves focus to the next field [data-testid='kb-field-2'] (default browser behavior)

#### 1.3. Downloading status shows appropriate message

**File:** `tests/e2e/ai-availability.spec.ts`

**Steps:**
  1. Inject mock with availability: 'downloading'. Navigate to test-site.html.
    - expect: Page loads successfully
  2. Click textarea [data-testid='basic-unavailable'] and type 'Having a great day today'. Wait for idle.
    - expect: A toast message (.ec-toast) appears mentioning 'downloading'
    - expect: No ghost overlay is shown

#### 1.4. Generation failure shows toast gracefully

**File:** `tests/e2e/ai-availability.spec.ts`

**Steps:**
  1. Inject mock with availability: 'available' and shouldThrow: true. Navigate to test-site.html.
    - expect: Page loads successfully
  2. Click textarea [data-testid='basic-gen-failure'] and type 'I love sunny days in the park'. Wait for idle + generation attempt.
    - expect: A toast message appears saying 'temporarily unavailable'
    - expect: No ghost overlay is shown
    - expect: No unhandled errors

#### 1.5. Toast is throttled within 30 seconds

**File:** `tests/e2e/ai-availability.spec.ts`

**Steps:**
  1. Inject mock with availability: 'unavailable'. Navigate to test-site.html.
    - expect: Page loads successfully
  2. Click textarea [data-testid='basic-toast-throttle'], type ≥5 chars, wait for toast to appear.
    - expect: Toast appears
  3. Wait for toast to auto-dismiss (~3.5s). Then click a different textarea, type ≥5 chars, wait for idle again.
    - expect: Second toast does NOT appear (throttled within 30s window)
    - expect: No ghost overlay is shown

### 2. AC-3: IME Composition

**Seed:** `tests/e2e/seed.spec.ts`

#### 2.1. No suggestion during IME composition

**File:** `tests/e2e/ime-composition.spec.ts`

**Steps:**
  1. Inject mock with availability: 'available'. Navigate to test-site.html.
    - expect: Page loads successfully
  2. Click textarea [data-testid='ime-textarea']. Dispatch compositionstart event. Type characters using page.keyboard (simulating IME input). Wait longer than idle delay.
    - expect: No ghost overlay appears during composition
    - expect: Extension does not interfere with the IME

#### 2.2. Suggestion may trigger after IME commit

**File:** `tests/e2e/ime-composition.spec.ts`

**Steps:**
  1. Click textarea [data-testid='ime-textarea']. Dispatch compositionstart, type text, then dispatch compositionend. Wait for idle.
    - expect: After compositionend, the idle timer starts
    - expect: If text is ≥5 chars, ghost overlay may appear after idle delay

### 3. AC-4 & AC-6: Keyboard Behavior

**Seed:** `tests/e2e/seed.spec.ts`

#### 3.1. Esc dismisses suggestion overlay

**File:** `tests/e2e/keyboard-behavior.spec.ts`

**Steps:**
  1. Inject mock with availability: 'available', emoji: '😊'. Navigate to test-site.html.
    - expect: Page loads
  2. Click textarea [data-testid='basic-textarea']. Type 'I love sunny days in the park'. Wait for ghost overlay to appear.
    - expect: Ghost overlay (.ec-mirror-ghost) is visible with emoji
  3. Press Esc key.
    - expect: Ghost overlay disappears
    - expect: No emoji is inserted into the textarea
    - expect: Textarea value remains 'I love sunny days in the park'

#### 3.2. Tab with no suggestion moves focus normally

**File:** `tests/e2e/keyboard-behavior.spec.ts`

**Steps:**
  1. Inject mock with availability: 'available'. Navigate to test-site.html.
    - expect: Page loads
  2. Click input [data-testid='kb-field-1']. Do NOT type anything (no suggestion will trigger). Press Tab.
    - expect: Focus moves to the next field [data-testid='kb-field-2']
    - expect: Tab is NOT intercepted by the extension

#### 3.3. Shift+Tab with suggestion visible moves focus (never intercepted)

**File:** `tests/e2e/keyboard-behavior.spec.ts`

**Steps:**
  1. Inject mock. Navigate to test-site.html.
    - expect: Page loads
  2. Click textarea [data-testid='kb-field-2']. Type 'I love sunny days in the park'. Wait for ghost to appear.
    - expect: Ghost overlay is visible
  3. Press Shift+Tab.
    - expect: Focus moves to [data-testid='kb-field-1']
    - expect: Ghost overlay is dismissed
    - expect: No emoji is inserted

#### 3.4. Shift+Tab with no suggestion moves focus normally

**File:** `tests/e2e/keyboard-behavior.spec.ts`

**Steps:**
  1. Navigate to test-site.html. Click input [data-testid='kb-field-2']. Press Shift+Tab.
    - expect: Focus moves back to [data-testid='kb-field-1']

#### 3.5. Tab with suggestion accepts emoji and keeps focus

**File:** `tests/e2e/keyboard-behavior.spec.ts`

**Steps:**
  1. Inject mock with emoji: '😊'. Navigate to test-site.html.
    - expect: Page loads
  2. Click textarea [data-testid='kb-field-2']. Type 'I love sunny days in the park'. Wait for ghost overlay to appear.
    - expect: Ghost overlay visible
  3. Press Tab.
    - expect: Emoji '😊' is inserted into the textarea value
    - expect: Focus remains on [data-testid='kb-field-2'] (does NOT move to next field)
    - expect: Ghost overlay disappears

### 4. AC-5: Unsupported Input Types

**Seed:** `tests/e2e/seed.spec.ts`

#### 4.1. contenteditable div does not trigger suggestion

**File:** `tests/e2e/unsupported-inputs.spec.ts`

**Steps:**
  1. Inject mock with availability: 'available'. Navigate to test-site.html.
    - expect: Page loads
  2. Click [data-testid='unsupported-contenteditable']. Clear content and type 'I love sunny days in the park' (≥5 chars). Wait well beyond idle delay (2x).
    - expect: No ghost overlay (.ec-mirror-ghost) appears

#### 4.2. input[type=email] does not trigger suggestion

**File:** `tests/e2e/unsupported-inputs.spec.ts`

**Steps:**
  1. Click [data-testid='unsupported-email']. Type 'user@example.com plus some text'. Wait beyond idle delay.
    - expect: No ghost overlay appears

#### 4.3. input[type=password] does not trigger suggestion

**File:** `tests/e2e/unsupported-inputs.spec.ts`

**Steps:**
  1. Click [data-testid='unsupported-password']. Type 'MySecurePassword123'. Wait beyond idle delay.
    - expect: No ghost overlay appears

#### 4.4. input[type=number] does not trigger suggestion

**File:** `tests/e2e/unsupported-inputs.spec.ts`

**Steps:**
  1. Click [data-testid='unsupported-number']. Type '123456789'. Wait beyond idle delay.
    - expect: No ghost overlay appears

#### 4.5. input[type=url] does not trigger suggestion

**File:** `tests/e2e/unsupported-inputs.spec.ts`

**Steps:**
  1. Click [data-testid='unsupported-url']. Type 'https://example.com/path'. Wait beyond idle delay.
    - expect: No ghost overlay appears

#### 4.6. input[type=search] does not trigger suggestion

**File:** `tests/e2e/unsupported-inputs.spec.ts`

**Steps:**
  1. Click [data-testid='unsupported-search']. Type 'search for something here'. Wait beyond idle delay.
    - expect: No ghost overlay appears

#### 4.7. input[type=tel] does not trigger suggestion

**File:** `tests/e2e/unsupported-inputs.spec.ts`

**Steps:**
  1. Click [data-testid='unsupported-tel']. Type '09012345678'. Wait beyond idle delay.
    - expect: No ghost overlay appears

### 5. AC-7: Skip Conditions

**Seed:** `tests/e2e/seed.spec.ts`

#### 5.1. Text shorter than 5 characters does not trigger

**File:** `tests/e2e/skip-conditions.spec.ts`

**Steps:**
  1. Inject mock with availability: 'available'. Navigate to test-site.html.
    - expect: Page loads
  2. Click textarea [data-testid='skip-short']. Type 'Hi' (2 chars). Wait well beyond idle delay.
    - expect: No ghost overlay appears

#### 5.2. Exactly 4 characters does not trigger

**File:** `tests/e2e/skip-conditions.spec.ts`

**Steps:**
  1. Click textarea [data-testid='skip-short']. Type 'Test' (4 chars). Wait beyond idle delay.
    - expect: No ghost overlay appears

#### 5.3. Exactly 5 characters does trigger

**File:** `tests/e2e/skip-conditions.spec.ts`

**Steps:**
  1. Click textarea [data-testid='basic-textarea']. Type 'Hello' (5 chars). Wait for idle.
    - expect: Ghost overlay appears (minimum threshold met)

#### 5.4. Emoji-only input does not trigger

**File:** `tests/e2e/skip-conditions.spec.ts`

**Steps:**
  1. Click textarea [data-testid='skip-emoji-only']. Type '😀🎉🔥🌟💯'. Wait beyond idle delay.
    - expect: No ghost overlay appears

#### 5.5. Empty or whitespace-only does not trigger

**File:** `tests/e2e/skip-conditions.spec.ts`

**Steps:**
  1. Click textarea [data-testid='skip-empty']. Type '     ' (spaces only). Wait beyond idle delay.
    - expect: No ghost overlay appears

### 6. AC-9: Accessibility

**Seed:** `tests/e2e/seed.spec.ts`

#### 6.1. Overlay has correct ARIA attributes

**File:** `tests/e2e/accessibility.spec.ts`

**Steps:**
  1. Inject mock with availability: 'available', emoji: '😊'. Navigate to test-site.html.
    - expect: Page loads
  2. Click textarea [data-testid='overlay-aria']. Type 'I love sunny days in the park'. Wait for ghost overlay to appear.
    - expect: Ghost overlay is visible
  3. Inspect the mirror element (.ec-mirror) attributes.
    - expect: Element has role='status'
    - expect: Element has aria-live='polite'
    - expect: Element has aria-atomic='true'
    - expect: Element has aria-label='Suggested emoji: 😊'

#### 6.2. Toast has correct ARIA attributes

**File:** `tests/e2e/accessibility.spec.ts`

**Steps:**
  1. Inject mock with availability: 'unavailable'. Navigate to test-site.html.
    - expect: Page loads
  2. Click textarea [data-testid='basic-unavailable']. Type ≥5 chars. Wait for toast to appear.
    - expect: Toast is visible
  3. Inspect the toast element (.ec-toast) attributes.
    - expect: Element has role='status'
    - expect: Element has aria-live='polite'

### 7. AC-10 & AC-12: Cancellation

**Seed:** `tests/e2e/seed.spec.ts`

#### 7.1. Typing more dismisses the overlay

**File:** `tests/e2e/cancellation.spec.ts`

**Steps:**
  1. Inject mock with availability: 'available', emoji: '😊'. Navigate to test-site.html.
    - expect: Page loads
  2. Click textarea [data-testid='cancel-on-edit']. Type 'I love sunny days in the park'. Wait for ghost overlay to appear.
    - expect: Ghost overlay is visible
  3. Type additional characters (e.g. ' and more').
    - expect: Ghost overlay disappears immediately
    - expect: No emoji is inserted

#### 7.2. Focus change dismisses the overlay

**File:** `tests/e2e/cancellation.spec.ts`

**Steps:**
  1. Inject mock. Navigate to test-site.html.
    - expect: Page loads
  2. Click textarea [data-testid='cancel-focus-a']. Type 'I love sunny days in the park'. Wait for ghost overlay to appear.
    - expect: Ghost overlay is visible
  3. Click textarea [data-testid='cancel-focus-b'].
    - expect: Ghost overlay disappears immediately
    - expect: No emoji is inserted into textarea A

#### 7.3. Arrow key (caret move) dismisses the overlay

**File:** `tests/e2e/cancellation.spec.ts`

**Steps:**
  1. Inject mock. Navigate to test-site.html.
    - expect: Page loads
  2. Click textarea [data-testid='cancel-caret-move']. Place caret at end. Wait for ghost overlay to appear.
    - expect: Ghost overlay is visible
  3. Press ArrowLeft key.
    - expect: Ghost overlay disappears immediately
    - expect: No emoji is inserted

#### 7.4. Non-collapsed selection blocks suggestion

**File:** `tests/e2e/cancellation.spec.ts`

**Steps:**
  1. Inject mock. Navigate to test-site.html.
    - expect: Page loads
  2. Click textarea [data-testid='cancel-on-selection'] which has pre-filled text. Select some text using Shift+ArrowRight (3-5 times). Wait well beyond idle delay.
    - expect: No ghost overlay appears while text is selected (non-collapsed selection)
    - expect: AC-12: extension must not call Prompt API

#### 7.5. Selecting text while overlay is visible dismisses it

**File:** `tests/e2e/cancellation.spec.ts`

**Steps:**
  1. Inject mock. Navigate to test-site.html.
    - expect: Page loads
  2. Click textarea [data-testid='basic-textarea']. Type 'I love sunny days in the park'. Wait for ghost overlay to appear.
    - expect: Ghost overlay is visible
  3. Hold Shift and press ArrowLeft several times to create a selection.
    - expect: Ghost overlay disappears
    - expect: No emoji is inserted

### 8. AC-11: Cooldown & Same-Context Suppression

**Seed:** `tests/e2e/seed.spec.ts`

#### 8.1. Cooldown suppresses suggestion within 2 seconds

**File:** `tests/e2e/cooldown.spec.ts`

**Steps:**
  1. Inject mock with availability: 'available', emoji: '😊'. Navigate to test-site.html.
    - expect: Page loads
  2. Click textarea [data-testid='cooldown-test']. Type 'I love sunny days in the park'. Wait for ghost overlay to appear. Press Tab to accept.
    - expect: Emoji accepted and inserted
  3. Immediately type more text ('and the weather is great'). Wait for idle.
    - expect: No new ghost overlay appears within 2 seconds of the first attempt
    - expect: Suggestion is suppressed by cooldown

#### 8.2. Same context does not re-trigger after dismissal

**File:** `tests/e2e/cooldown.spec.ts`

**Steps:**
  1. Inject mock. Navigate to test-site.html.
    - expect: Page loads
  2. Click textarea [data-testid='same-context-test']. Type 'I love sunny days in the park'. Wait for ghost overlay to appear. Press Esc to dismiss.
    - expect: Ghost overlay disappears
  3. Wait for cooldown (>2s). Then click the textarea again (focus it) and wait for idle WITHOUT changing the text.
    - expect: No ghost overlay appears
    - expect: Same context hash prevents re-triggering

#### 8.3. After cooldown with new context, suggestion triggers again

**File:** `tests/e2e/cooldown.spec.ts`

**Steps:**
  1. Inject mock. Navigate to test-site.html.
    - expect: Page loads
  2. Click textarea [data-testid='cooldown-test']. Type 'I love sunny days in the park'. Wait for ghost. Press Esc.
    - expect: Ghost dismissed
  3. Wait 2.5 seconds (past cooldown). Then type additional different text ('but sometimes it rains'). Wait for idle.
    - expect: Ghost overlay appears again (new context, past cooldown)
    - expect: Suggestion triggers normally

### 9. AC-13: Tooltip on Hover

**Seed:** `tests/e2e/seed.spec.ts`

#### 9.1. Hovering ghost shows reason tooltip

**File:** `tests/e2e/tooltip.spec.ts`

**Steps:**
  1. Inject mock with availability: 'available', emoji: '😊', reason: 'Expresses joy and happiness'. Navigate to test-site.html.
    - expect: Page loads
  2. Click textarea [data-testid='overlay-tooltip']. Type 'I love sunny days in the park'. Wait for ghost overlay to appear.
    - expect: Ghost overlay is visible with emoji '😊'
  3. Hover the mouse over the ghost emoji element (.ec-mirror-ghost).
    - expect: Tooltip (.ec-ghost-tooltip) becomes visible
    - expect: Tooltip text is 'Expresses joy and happiness'
    - expect: Suggestion overlay is NOT dismissed by hover

#### 9.2. Hovering does not steal focus from input

**File:** `tests/e2e/tooltip.spec.ts`

**Steps:**
  1. Inject mock. Navigate to test-site.html.
    - expect: Page loads
  2. Click textarea [data-testid='overlay-tooltip']. Type text. Wait for ghost. Hover over ghost emoji.
    - expect: Focus remains on the textarea (document.activeElement is still the textarea)
    - expect: Tooltip is visible

#### 9.3. Moving mouse away hides tooltip

**File:** `tests/e2e/tooltip.spec.ts`

**Steps:**
  1. Trigger suggestion and hover ghost to show tooltip.
    - expect: Tooltip is visible
  2. Move the mouse away from the ghost emoji (hover over the textarea body instead).
    - expect: Tooltip (.ec-ghost-tooltip) is hidden
    - expect: Ghost overlay itself remains visible (not dismissed)
