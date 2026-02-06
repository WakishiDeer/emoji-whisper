# ADR 0002: Tab key behaviour for accepting suggestions

## Status

Accepted – 02 Feb 2026

## Context

Our extension proposes an emoji suggestion proactively (for example, after the user pauses typing). If the suggestion is visible, the user needs a quick and low-friction way to accept it. Using Tab is appealing because it mimics code completion behaviour and allows for quick acceptance without additional gestures. However, Tab is also an important accessibility key: it moves focus between form fields. Overriding Tab indiscriminately could break the user’s navigation flow.

## Decision

We will **conditionally intercept** the Tab key:

* When no suggestion is pending, pressing Tab MUST behave exactly as the browser intends.  We will not override the default behaviour; the event handler will exit early.  This ensures that keyboard navigation and tab insertion remain unaffected (see Acceptance Criteria AC‑6).
* When the suggestion overlay is visible, pressing Tab will **accept the suggestion** and insert the emoji. We will prevent the default behaviour in this specific case so that focus does not change.
* We will provide a way to cancel the overlay (Esc) so that users can return to normal navigation quickly.

We considered using an alternative shortcut (such as `Ctrl+;`) but decided against it for the MVP in order to mimic familiar completion behaviour and reduce cognitive load. However, the settings page (should we implement it) may expose a way to configure the accept key.

## Consequences

* The Tab key remains safe and predictable outside of suggestion interactions.  Accessibility for keyboard users is preserved.
* The conditional interception adds complexity to the event handler but reduces the risk of user frustration.
* Implementing an alternate keybinding remains a possible enhancement for users who rely heavily on Tab for navigation or use screen readers.
