# Content Script

This folder contains DOM-facing content-script infrastructure for the emoji suggestion overlay.

Entry points live in `src/entrypoints/`. Keep domain logic in `src/core/`.

## Files

| File | Purpose |
|------|---------|
| `controller.ts` | Main orchestrator: wires DOM events (input, keydown, focus, blur), manages the suggestion lifecycle (idle → pending → shown → accepted/dismissed), and coordinates overlay display with AI suggestion generation. |
| `overlay.ts` | `GhostOverlay` class (mirror-based inline overlay) and `ToastMessage` class. Creates a transparent mirror `<div>` over the target input that renders the full text with the suggested emoji inline at the caret. |
| `dom-utils.ts` | `findSupportedInputFromEvent` (filters `<textarea>` / `<input type="text">`) and `insertAtCaret` (inserts text at cursor position). |
| `input-snapshot.ts` | Reads the current input state (value, caret position, field metadata) for the suggestion pipeline. |

## Mirror Overlay Lifecycle

1. **`show(target, emoji, reason)`** — saves the target's original text color, sets `color: transparent` to hide native text, creates a mirror `<div>` copying all text-layout styles, splits text at the caret via the domain function `splitTextAtCaret`, renders the ghost emoji inline, attaches scroll and resize listeners.
2. **`reposition(target)`** — recalculates mirror position and scroll offsets when the target moves.
3. **`hide()`** — removes the mirror from the DOM, restores the target's original colors, detaches all listeners.

## Key Invariants

- **Text-color swap**: the target's `color` becomes `transparent` while the overlay is visible; `caretColor` is preserved so the blinking cursor remains visible.
- **Scroll sync**: a `scroll` event listener on the target keeps `mirror.scrollTop`/`scrollLeft` in sync.
- **Resize tracking**: a `ResizeObserver` on the target triggers `positionMirror()` on size changes.
- **Single overlay**: only one mirror exists at a time; `show()` cleans up any previous overlay before creating a new one.
