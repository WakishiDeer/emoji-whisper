# Non‑Functional Requirements

The following non‑functional requirements describe qualities that the extension must exhibit in order to provide a high‑quality user experience.

## Performance

* **Responsiveness.**  The extension SHOULD respond to input promptly and MUST never block typing.  When a suggestion trigger condition is met (for example, the user pauses typing for the idle delay or presses Enter in a supported input), the check for AI availability and the call to `prompt()` SHOULD be initiated without noticeable delay.  The overlay SHOULD be rendered immediately after a response is available and SHOULD appear within 400 ms of receiving the model response under typical conditions.  If the response takes longer than one second, the extension MUST allow the user to continue typing while the call completes asynchronously.
* **Minimal overhead.**  The content script MUST not significantly degrade the performance of websites.  Event listeners MUST be debounced and context extraction MUST operate on a limited sliding window of text to avoid large string manipulations.
* **Overlay positioning.**  The overlay MUST track the caret position and update with scrolling.  If caret coordinates cannot be computed for a given input, the overlay MUST fall back to a stable position near the input field (e.g., the bottom-right corner) without obscuring the user’s text.

## Privacy and security

* **Client‑side processing.**  All suggestion generation MUST occur via the Chrome/Edge on‑device Prompt API; no user text or model input may be sent to external servers.  The extension MUST not include any analytics, tracking or advertising scripts.
* **Permissions.**  The extension’s `manifest.json` MUST request only the minimal permissions required (likely `activeTab` and `storage`).  It MUST NOT request host permissions for all websites unnecessarily.  It MUST not run on pages where the browser forbids content scripts (e.g. the Chrome Web Store, `chrome://` pages, or `edge://` pages).

## Compatibility

* **Browser and OS.**  The extension MUST require Google Chrome version 138 or later, or a Microsoft Edge version with equivalent Prompt API availability.  It MUST detect whether the built‑in AI APIs are available on the current platform by calling `LanguageModel.availability()` and MUST disable suggestions when requirements are not met (for example, insufficient RAM, VRAM or storage).
* **Internationalisation.**  The extension SHOULD work with both English and Japanese text.  Because the Prompt API is language‑agnostic, the model is expected to infer the emotion or sentiment of the text regardless of language.  The UI (messages and overlay) MUST support Japanese localisation in later versions.

## Accessibility and usability

* **Non‑intrusive design.**  The suggestion overlay MUST be visually subtle and MUST not obscure the user’s text.  Users MUST be able to ignore or cancel suggestions without hindering normal navigation.  If a user relies on the Tab key to navigate between form fields, the interception MUST occur only when a suggestion is actively being processed.
* **Keyboard navigation.**  The extension MUST not capture `Shift+Tab` (backwards navigation) or other standard shortcuts.  The overlay MUST be dismissible via the `Esc` key without using a mouse.  Screen‑reader users SHOULD receive a textual description of the suggestion (e.g., “Suggested emoji: 😊”) via ARIA attributes.
* **Assistive announcements.**  When a suggestion is shown, the overlay SHOULD expose a polite live region (`aria-live="polite"`) to announce the suggestion without interrupting typing.

## Web Standards Compliance

* **Composition Events (MUST).**  Use `compositionstart` and `compositionend` to detect IME input. Never intercept Tab during composition.
* **Selection API (MUST).**  Use `selectionStart` and `selectionEnd` to determine cursor position for context extraction and emoji insertion.
* **CSSOM View (MUST).**  Use `getBoundingClientRect()` and caret coordinate calculation to position the overlay relative to the input field.
* **ARIA (MUST).**  The overlay MUST include an appropriate role (e.g., `tooltip` or `status`) and `aria-live="polite"` for screen reader announcements.
* **Shadow DOM (COULD).**  Consider using Shadow DOM for overlay encapsulation to avoid style conflicts with host pages. Not required for MVP.
* **Trusted Types (SHOULD).**  Avoid `innerHTML` for untrusted content. If used, ensure compatibility with Trusted Types CSP policies.
