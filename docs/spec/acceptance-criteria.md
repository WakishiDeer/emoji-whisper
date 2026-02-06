# Acceptance Criteria

The following acceptance criteria translate the functional requirements into concrete scenarios that can be automated as end‑to‑end (E2E) tests.  Each criterion describes a precondition, an action, and the expected outcome.

## AC‑1: Generating a suggestion when AI is available

*Given* the user is typing in a `<textarea>` and the Chrome or Edge built‑in AI is available on the device (as reported by `LanguageModel.availability()`)
*When* the user stops typing for 500–800 ms (idle) while IME composition is not in progress, the input has a collapsed caret (no selection), and the trimmed input length is at least 5 characters
*Then* the extension calls the Prompt API with the recent context and displays a single emoji suggestion overlay at the caret without moving focus.
*And* pressing **Tab** inserts the suggested emoji at the cursor position and removes the overlay.

*And given* the same conditions are satisfied after the user presses **Enter** (for example, in a multiline `<textarea>` where focus remains in the input)
*When* the user presses **Enter**
*Then* the extension MAY trigger the same suggestion flow.

## AC‑2: Handling unavailability of the built‑in AI

*Given* the user is typing in a `<textarea>` and the built‑in AI is not available (e.g. the OS does not meet the requirements or the model is still downloading)
*When* the user stops typing for 500–800 ms (idle) while IME composition is not in progress and the input has a collapsed caret (no selection)
*Then* the extension does **not** attempt to call the Prompt API
*And* it displays a brief message such as “Emoji suggestions require the browser’s built‑in AI (Chrome/Edge) and are unavailable on this device.”
*And* the user can continue typing without any key interception.

## AC‑3: Ignoring IME composition

*Given* the user is composing text using an Input Method Editor (composition events are in progress)
*When* the user pauses typing or presses **Enter**
*Then* the extension does not trigger a suggestion and does not interfere with the IME’s default behaviour.

## AC‑4: Cancelling a suggestion

*Given* an emoji suggestion overlay is visible in a text field
*When* the user presses **Esc**
*Then* the overlay disappears
*And* no emoji is inserted.

## AC‑5: Non‑supported input types

*Given* the user is typing in a `contenteditable` element or a custom rich‑text editor
*When* the user pauses typing or presses **Enter**
*Then* the extension does not display any suggestions.

## AC‑6: Default behaviour when no suggestion is pending

*Given* no suggestion overlay is visible
*When* the user presses **Tab** in a standard text field
*Then* the key press MUST behave exactly as it normally would (e.g. insert a tab character or move focus) and the extension MUST not intercept it.

## AC‑7: Skipping when context is too short or matches skip conditions

*Given* the user has enabled the extension with `minContextLength = 5` and default skip conditions
*When* the trimmed input length is fewer than 5 characters, or the input is empty, emoji‑only, or URL‑only (when enabled)
*Then* the extension MUST not call the Prompt API
*And* no overlay should be displayed.

## AC‑8: Persisting settings

*Given* the user changes settings in the options page (e.g., `minContextLength` and `skipIfUrlOnly`)
*When* the browser is restarted
*Then* the settings MUST be restored from `chrome.storage.local`
*And* the new settings MUST affect suggestion triggering behaviour.

## AC‑9: Accessibility announcement

*Given* an emoji suggestion overlay is visible
*When* a screen reader is active
*Then* the overlay MUST expose a polite announcement such as “Suggested emoji: 😊” via ARIA attributes.

## AC‑10: Cancellation on input change

*Given* a suggestion request is pending, or an emoji suggestion overlay is visible
*When* the user edits the text, changes focus, moves the cursor, or clicks
*Then* the pending request MUST be cancelled (or the overlay dismissed) and any late response MUST be ignored
*And* no overlay should be displayed (or it should be removed immediately).

## AC‑11: Cooldown and same-context suppression

*Given* a suggestion attempt happened less than 2 seconds ago, or the current extracted context matches the most recent suggested context
*When* the user pauses typing again (idle)
*Then* the extension MUST not call the Prompt API
*And* it MUST not display a new overlay.

## AC‑12: No suggestion while selecting text

*Given* the user has a non-collapsed selection in a supported text input (selectionStart != selectionEnd)
*When* the user pauses typing (idle)
*Then* the extension MUST not call the Prompt API
*And* it MUST not display an overlay.
