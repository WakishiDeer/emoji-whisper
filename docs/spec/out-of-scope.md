# Out of Scope

To keep the initial implementation focused and manageable, several features and considerations are explicitly excluded from the current scope.  These exclusions may be revisited in later phases once the core functionality is stable.

## Rule‑based fall‑back

No heuristically generated or rule‑based emoji suggestions will be implemented.  If the on‑device AI is unavailable, the extension simply displays a message and does nothing else.  This decision is intentional to prioritise privacy and to avoid maintaining two separate suggestion engines.

## Multi‑candidate suggestions

The MVP will not cycle through multiple emoji candidates or allow the user to choose from a list.  Only the single top suggestion returned by the Prompt API will be surfaced.  Cycling or alternative modes (e.g. Professional, Friendly) may be considered in the future.

## Rich text editors

Support for `contenteditable` elements, WYSIWYG editors, or applications with deeply customised input components (such as Notion, Slack or Gmail rich editors) is not included.  These editors often use complex DOM structures that require site‑specific adaptors.

## Remote AI services

The extension will not send user text to remote AI services (e.g. Gemini Pro or third‑party LLMs).  All inference happens locally via the built‑in AI in Chrome/Edge.  Should remote options be added in the future, they will require explicit user opt‑in and a separate privacy review.

## Personalisation and learning

While future versions may learn from user choices to refine suggestions, the MVP will not store user text or maintain a long‑term preference model.  Accept or reject actions will not influence future suggestions.

## User-configurable prompt templates

The MVP does not allow users to edit or replace the system prompt template or prompt instructions.  Prompt configuration is modeled as a domain object for future changes, but it is not user-configurable yet.
