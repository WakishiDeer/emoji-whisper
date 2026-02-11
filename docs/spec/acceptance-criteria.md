# Acceptance Criteria

The following acceptance criteria translate the functional requirements into concrete scenarios that can be automated as end‑to‑end (E2E) tests. Each criterion describes a precondition, an action, and the expected outcome.

## AC‑1: Generating a suggestion when AI is available

_Given_ the user is typing in a `<textarea>` and the Chrome or Edge built‑in AI is available on the device (as reported by `LanguageModel.availability()`)
_When_ the user stops typing for 500–800 ms (idle) while IME composition is not in progress, the input has a collapsed caret (no selection), and the trimmed input length is at least 5 characters
_Then_ the extension calls the Prompt API with the recent context and displays a single emoji suggestion overlay at the caret without moving focus.
_And_ pressing **Tab** inserts the suggested emoji at the cursor position and removes the overlay.

_And given_ the same conditions are satisfied after the user presses **Enter** (for example, in a multiline `<textarea>` where focus remains in the input)
_When_ the user presses **Enter**
_Then_ the extension MAY trigger the same suggestion flow.

## AC‑2: Handling unavailability of the built‑in AI

_Given_ the user is typing in a `<textarea>` and the built‑in AI is not available (e.g. the OS does not meet the requirements or the model is still downloading)
_When_ the user stops typing for 500–800 ms (idle) while IME composition is not in progress and the input has a collapsed caret (no selection)
_Then_ the extension does **not** attempt to call the Prompt API
_And_ it displays a brief message such as “Emoji suggestions require the browser’s built‑in AI (Chrome/Edge) and are unavailable on this device.”
_And_ the user can continue typing without any key interception.

## AC‑3: Ignoring IME composition

_Given_ the user is composing text using an Input Method Editor (composition events are in progress)
_When_ the user pauses typing or presses **Enter**
_Then_ the extension does not trigger a suggestion and does not interfere with the IME’s default behaviour.

## AC‑4: Cancelling a suggestion

_Given_ an emoji suggestion overlay is visible in a text field
_When_ the user presses **Esc**
_Then_ the overlay disappears
_And_ no emoji is inserted.

## AC‑5: Non‑supported input types

_Given_ the user is typing in a `contenteditable` element or a custom rich‑text editor
_When_ the user pauses typing or presses **Enter**
_Then_ the extension does not display any suggestions.

## AC‑6: Default behaviour when no suggestion is pending

_Given_ no suggestion overlay is visible
_When_ the user presses **Tab** in a standard text field
_Then_ the key press MUST behave exactly as it normally would (e.g. insert a tab character or move focus) and the extension MUST not intercept it.

## AC‑7: Skipping when context is too short or matches skip conditions

_Given_ the user has enabled the extension with `minContextLength = 5` and default skip conditions
_When_ the trimmed input length is fewer than 5 characters, or the input is empty, emoji‑only, or URL‑only (when enabled)
_Then_ the extension MUST not call the Prompt API
_And_ no overlay should be displayed.

## AC‑8: Persisting settings

_Given_ the user changes settings in the options page (e.g., `minContextLength` and `skipIfUrlOnly`)
_When_ the browser is restarted
_Then_ the settings MUST be restored from `chrome.storage.local`
_And_ the new settings MUST affect suggestion triggering behaviour.

## AC‑9: Accessibility announcement

_Given_ an emoji suggestion overlay is visible
_When_ a screen reader is active
_Then_ the overlay MUST expose a polite announcement such as “Suggested emoji: 😊” via ARIA attributes.

## AC‑10: Cancellation on input change

_Given_ a suggestion request is pending, or an emoji suggestion overlay is visible
_When_ the user edits the text, changes focus, moves the cursor, or clicks
_Then_ the pending request MUST be cancelled (or the overlay dismissed) and any late response MUST be ignored
_And_ no overlay should be displayed (or it should be removed immediately).

## AC‑11: Cooldown and same-context suppression

_Given_ a suggestion attempt happened less than 2 seconds ago, or the current extracted context matches the most recent suggested context
_When_ the user pauses typing again (idle)
_Then_ the extension MUST not call the Prompt API
_And_ it MUST not display a new overlay.

## AC‑12: No suggestion while selecting text

_Given_ the user has a non-collapsed selection in a supported text input (selectionStart != selectionEnd)
_When_ the user pauses typing (idle)
_Then_ the extension MUST not call the Prompt API
_And_ it MUST not display an overlay.

## AC‑13: Reason tooltip on hover

_Given_ an emoji suggestion overlay is visible in a text field
_When_ the user hovers the mouse over the ghost emoji overlay
_Then_ a tooltip MUST appear displaying the model's reasoning in English (e.g. "Expresses joy and happiness")
_And_ hovering MUST not dismiss the suggestion overlay
_And_ hovering MUST not steal focus from the input field
_And_ moving the mouse away from the overlay MUST hide the tooltip.

## AC‑14: Options page renders all settings

_Given_ the user opens the Options page (via `chrome.runtime.openOptionsPage()` or right-click → Options)
_Then_ all configurable preferences MUST be displayed with their current persisted values:
enable/disable toggle, accept key, topK, temperature, context extraction settings
(contextMode, minContextLength, maxContextLength, adjustToBoundary, beforeSentenceCount,
afterSentenceCount, cursorMarker), skip conditions (skipIfEmpty, skipIfEmojiOnly, skipIfUrlOnly),
display settings (showUnavailableToast, showReasonTooltip), and the preset mode selector.
_And_ each setting MUST be editable via appropriate form controls (toggles, sliders, dropdowns, text inputs).

## AC‑15: Preset mode applies batch settings

_Given_ the user opens the Options page (or Popup) and the current mode is "Balanced"
_When_ the user selects the "Simple" preset
_Then_ all individual settings MUST be updated to Simple's predefined values
_And_ the changes MUST be persisted to `chrome.storage.local`
_And_ the new settings MUST affect suggestion triggering behaviour immediately.

## AC‑16: Custom mode on manual change

_Given_ the user is in the "Balanced" preset mode
_When_ the user manually changes any individual setting (e.g. changes `topK` from 8 to 12)
_Then_ the preset mode label MUST automatically switch to "Custom"
_And_ the manually changed value MUST be persisted.

## AC‑17: Popup quick controls

_Given_ the user clicks the extension icon in the browser toolbar
_Then_ a popup MUST appear showing:
an enable/disable toggle reflecting the current state,
the current preset mode with a selector to switch modes,
and a link/button to open the full Options page.
_And_ changes made in the popup MUST take effect immediately
_And_ changes MUST be persisted to `chrome.storage.local`.

## AC‑18: Reset to defaults

_Given_ the user is on the Options page with modified settings
_When_ the user clicks "Reset to defaults"
_Then_ all settings MUST revert to `UserPreferences.createDefault()` values (Balanced preset)
_And_ the preset mode MUST switch to "Balanced"
_And_ the change MUST be persisted to `chrome.storage.local`.

## AC‑19: Settings validation feedback

_Given_ the user is on the Options page
_When_ the user enters an invalid value (e.g. `topK = 50`, `temperature = 3.0`, or `minContextLength = -1`)
_Then_ the Options page MUST display an inline validation error message near the invalid field
_And_ the invalid value MUST NOT be persisted to `chrome.storage.local`
_And_ other valid fields MUST remain unaffected.

## AC‑20: Disabling unavailability toast

_Given_ the user has set `showUnavailableToast` to false in the Options page
_When_ the built-in AI is not available and the user pauses typing (idle) in a supported text field
_Then_ the extension MUST NOT display the unavailability toast notification
_And_ the extension MUST still skip the Prompt API call (suggestion is not attempted)
_And_ if the user later re-enables `showUnavailableToast`, the toast MUST appear again on the next unavailability event.

## AC‑21: Disabling reason tooltip

_Given_ the user has set `showReasonTooltip` to false in the Options page and an emoji suggestion overlay is visible
_When_ the user hovers the mouse over the ghost emoji overlay
_Then_ no reason tooltip MUST appear
_And_ the suggestion overlay MUST remain visible and functional (Tab to accept, Esc to dismiss)
_And_ if the user later re-enables `showReasonTooltip`, the tooltip MUST appear on subsequent suggestions.
