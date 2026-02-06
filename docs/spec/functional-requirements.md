# Functional Requirements

This document lists the functional requirements for the initial release of the Emoji Suggestion Extension. Requirements marked **MUST** are mandatory for the minimal viable product (MVP). Items marked **SHOULD** or **COULD** may be addressed in later iterations.

## Primary workflow

1. **Monitoring user input (MUST).** The extension MUST monitor keystrokes in `<textarea>` and `<input type="text">` elements on the active tab when the extension is enabled. It MUST ignore composition events (IME input) and must not intercept contenteditable or other custom rich-text editors.
2. **Triggering a suggestion (MUST).** The extension SHOULD proactively suggest an emoji when the user “pauses” after typing (similar to code completion ghost text). A suggestion attempt MUST be triggered only when **all** of the following conditions are met:
   * **Not composing (MUST).** IME composition is not in progress.
   * **Caret only (MUST).** The input has a collapsed caret (no selection) and remains focused.
   * **Idle delay (MUST).** No input has occurred for 500–800 ms (MVP default: 700 ms).
   * **Minimum length (MUST).** The trimmed input length is at least 5 characters.
   * **Cooldown (MUST).** At least 2 seconds have elapsed since the last suggestion attempt.
   * **No re-suggest (MUST).** The extension MUST avoid re-suggesting for the same context using an in-memory, ephemeral cache (must not be persisted).
   
   The extension MAY also trigger a suggestion attempt when the user presses **Enter**, as long as the conditions above are still satisfied (for example, in a multiline `<textarea>` where focus remains in the input).
3. **Checking on-device AI availability (MUST).** Before requesting a suggestion, the extension MUST check `LanguageModel.availability()` from the browser Prompt API (Chrome/Edge) with the same parameters that will be used for the actual call. If the result indicates that the model is downloading or unavailable, the extension MUST display a brief, unobtrusive message to the user (e.g. via a tooltip) stating that emoji suggestions require the browser’s built-in AI (Chrome/Edge) and cannot be provided. The message MUST disappear after a few seconds.
   * **Message UX (MUST).** The message MUST not steal focus, MUST be readable within 3–5 seconds, and MUST be anchored to the active input field. Repeated triggers within 30 seconds SHOULD not spam multiple messages; a single refreshed message is acceptable.
4. **Generating a suggestion (MUST).** When the built-in AI is available, the extension MUST call `LanguageModel.create()` and `prompt()` with a prompt that includes the recent context extracted according to the user's context length settings (default: last 200 characters, adjusted to sentence boundary) and an instruction to return a single emoji that best matches the sentiment. The extension MUST skip suggestion if the context is shorter than `minContextLength` (default: 5 characters) or matches any configured skip conditions. The extension MUST run this call locally via the Prompt API; the user's text MUST never be transmitted off device. The call MUST honour the hardware and OS requirements enumerated by the browser's documentation.
   * **Structured output (MUST).** The `session.prompt()` call MUST include a `responseConstraint` option containing a JSON Schema that enforces the output shape `{ reason: string, emoji: string }`. This leverages Chrome 137+ structured output support to structurally guarantee valid JSON. The system prompt no longer contains explicit JSON format instructions; `responseConstraint` assumes that role. If the browser throws a `DOMException` (e.g. `NotSupportedError` for unsupported schema features, or `SyntaxError` if the model cannot produce conforming output), the extension MUST treat it as a generation failure.
   * **Prompt specification (MUST).** The prompt MUST instruct the model to choose the best emoji and explain its reasoning. The `reason` field must be a short English sentence (under 15 words) and the `emoji` field must be a single emoji character. Output format enforcement is delegated to `responseConstraint`. If the model returns anything other than valid JSON containing a single emoji, the parser MUST attempt a fallback (extracting a bare emoji from the raw text). If even the fallback fails, the extension MUST treat it as an invalid response and show no overlay. The reason field is used for logging, debugging, and user-facing tooltip display.
   * **Prompt configuration (MUST).** The prompt configuration is a domain object (`PromptConfig`) that includes a fixed system prompt template (MVP), the output constraint (JSON with reason and emoji), and model options (`maxTokens` default: 64, `temperature` default: 0.7, `topK` default: 8). `topK` controls how many top-probability tokens the model considers at each generation step; higher values increase output diversity while lower values make suggestions more predictable. In the MVP, the system prompt is fixed and not user-configurable, but the configuration must be represented as a value object to allow future changes. In a future iteration, `topK`, `temperature`, context extraction settings (`beforeSentenceCount`, `afterSentenceCount`), and other tuning knobs SHOULD be exposed on the extension's settings page.
   * **Context extraction rules (MUST).** When `adjustToBoundary` is true, truncation SHOULD align to the nearest sentence boundary character in the extracted window. Boundary characters are: `.`, `!`, `?`, `。`, `！`, `？`, and newline (`\n`). If no boundary exists, use the raw truncated window.
   * **Skip rules (MUST).** `skipIfEmpty` means the trimmed input is empty. `skipIfEmojiOnly` means the trimmed input contains only emoji, variation selectors or whitespace. `skipIfUrlOnly` means the trimmed input matches a URL-like pattern (e.g., `https://...` or `http://...`).
   * **Lifecycle and cancellation (MUST).** Only one suggestion request may be pending at a time. If the user edits the input, changes focus, moves the cursor, or clicks while a request is pending or while an overlay is visible, the extension MUST cancel the request (or dismiss the overlay) and ignore any late response.
5. **Displaying a suggestion (MUST).** Once a suggestion is returned, the extension MUST overlay the proposed emoji near the cursor in a semi-transparent style (ghost text) without inserting it. The overlay MUST clearly indicate that it is a suggestion (e.g. via a subtle colour or outline). The user SHOULD be able to review the suggestion without losing focus on the text field.
   * **Reason tooltip (MUST).** When the user hovers over the ghost emoji overlay, the extension MUST display a tooltip showing the model's reasoning (the `reason` field from the JSON response). The tooltip MUST not steal focus from the input field. Hovering over the tooltip area MUST not dismiss the suggestion.
6. **Accepting or rejecting a suggestion (MUST).** While a suggestion overlay is visible:
   * Pressing the Tab key MUST accept the suggestion. The extension MUST insert the emoji at the cursor position and remove the overlay. The Tab key MUST not move focus when a suggestion is accepted.
   * Pressing `Esc` MUST cancel the suggestion. The overlay MUST disappear and no insertion should occur.
7. **Graceful failure (MUST).** If any error occurs during the call to the Prompt API (e.g. the model fails to load or times out), the extension MUST display the same unobtrusive message described in requirement 3 and MUST allow the Tab key to perform its normal behaviour.

## Secondary features

8. **Settings page (SHOULD).** The extension SHOULD provide an options page where the user can configure the following preferences. Any alternate accept key is optional and may be disabled for MVP; if disabled, only Tab is supported.
   * **Enable/Disable** – Toggle emoji suggestion functionality on or off.
    * **Accept key** – Choose whether to use Tab or an alternate shortcut (e.g. `Ctrl+;`) to accept a shown suggestion.
   * **AI model tuning** – Configure the AI model parameters:
     - `topK` (default: 8) – Number of top-probability tokens the model considers at each generation step. Lower values (e.g. 3) restrict diversity; higher values (e.g. 20–40) allow more varied suggestions. Must be between 1 and 40.
     - `temperature` (default: 0.7) – Controls randomness of AI output. Lower values make output more deterministic; higher values increase creativity. Must be between 0.0 and 2.0.
   * **Context extraction settings** – Configure how much text is sent to the AI:
     - `contextMode` (default: `'sentences'`) – Extraction strategy: `'characters'` for legacy character-based extraction or `'sentences'` for bidirectional sentence-based extraction (see ADR 0007).
     - `minContextLength` (default: 5) – Minimum characters required to trigger a suggestion. If the text is shorter, no suggestion is generated.
     - `maxContextLength` (default: 200) – Maximum characters to extract (used in character mode). Longer text is truncated from the end.
     - `adjustToBoundary` (default: true) – When truncating in character mode, adjust to the nearest sentence boundary to avoid cutting mid-sentence.
     - `beforeSentenceCount` (default: 2) – Number of sentences to extract before the cursor (sentence mode).
     - `afterSentenceCount` (default: 1) – Number of sentences to extract after the cursor (sentence mode).
     - `cursorMarker` (default: `'[CURSOR]'`) – Marker inserted at cursor position to indicate emoji insertion point (sentence mode).
   * **Skip conditions** – Configure when suggestions should be skipped:
     - `skipIfEmpty` (default: true) – Skip if input is empty or whitespace only.
     - `skipIfEmojiOnly` (default: true) – Skip if input contains only emoji.
     - `skipIfUrlOnly` (default: false) – Optionally skip if input appears to be a URL.
   * **Clear preferences** – Reset all settings to defaults.
9. **Persistent preferences (SHOULD).** The extension SHOULD save user preferences using `chrome.storage.local` so that settings persist across sessions. Preferences MUST never include any user text or AI prompt data.
10. **Hot-reload during development (COULD).** During development, the project COULD support hot module reloading for content scripts via WXT, to improve developer experience. This is not required in the production build.

## Out-of-scope for MVP
* Multi-candidate suggestions or suggestion cycling.
* Rule-based or heuristically generated emoji fall-backs.
* Support for `contenteditable` elements or custom editors.
* Integration with remote AI services or sending user text to external servers.
