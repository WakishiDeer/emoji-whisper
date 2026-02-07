# ADR 0010: Inline Mirror Overlay for Ghost Emoji Display

## Status

Accepted

## Date

2026-02-07

## Context

The current overlay implementation places a single `<div>` at the exact pixel coordinates of the caret using `position: absolute` on `document.body`. While simple, this creates a fundamental visual problem: the overlay **covers** existing text instead of integrating with it.

### Root cause

The caret module (`caret.ts`) calculates the top-left corner of the caret in page coordinates. The overlay element is then placed at those coordinates with a minimal vertical nudge (`height * 0.15 ≈ 2.4 px`). Because the element is absolutely positioned and does not participate in the text flow, it paints directly on top of whatever text is at or after the caret — obscuring it with 80 % opacity.

This violates the spirit of FR-5 ("overlay the proposed emoji **near the cursor** in a semi-transparent style (ghost text) without inserting it") and creates a poor user experience, especially when the cursor is in the middle of existing text or on a line with content following the caret.

### Options considered

| Option | Pros | Cons |
|--------|------|------|
| A. Reposition below the line | Simple offset change | Not "ghost text"; looks like a dropdown, not inline |
| **B. Mirror overlay (chosen)** | **Renders emoji inline with text flow, like IDE ghost text; handles wrapping and scrolling naturally** | **More complex; requires a mirror div, text-color swap, and scroll sync** |
| C. Insert a real DOM node into the input value | True inline rendering | Mutates the input value; breaks form state and undo history |

## Decision

Replace the floating-div approach with an **inline mirror overlay** that renders the full input text plus the ghost emoji in a transparent div positioned exactly over the input's content area.

### 1. New domain value object: `MirrorLayout`

A value object in `src/core/domain/overlay/` captures the pure geometry of a mirror overlay, free of any DOM dependency:

```typescript
/** Pure layout geometry for the mirror overlay. */
export type MirrorLayout = Readonly<{
  /** Page-absolute left of the input content area. */
  left: number;
  /** Page-absolute top of the input content area. */
  top: number;
  /** Width of the input content area (px). */
  width: number;
  /** Height of the input content area (px). */
  height: number;
  /** Horizontal scroll offset to sync with the target. */
  scrollLeft: number;
  /** Vertical scroll offset to sync with the target. */
  scrollTop: number;
}>;
```

This keeps geometric calculations testable without JSDOM.

### 2. New domain value object: `MirrorContent`

A value object representing the decomposition of input text around the caret:

```typescript
/** Text split at the caret for the mirror's three-segment rendering. */
export type MirrorContent = Readonly<{
  /** Text before the caret. */
  before: string;
  /** Ghost emoji to render at the caret. */
  ghost: string;
  /** Text after the caret. */
  after: string;
}>;
```

### 3. Domain function: `splitTextAtCaret`

A pure function in the domain layer:

```typescript
function splitTextAtCaret(
  value: string,
  caretOffset: number,
  emoji: string,
): MirrorContent;
```

This function is trivially testable with no DOM dependency.

### 4. Rendering strategy (extension layer)

The `GhostOverlay` class in `src/extension/content-script/overlay.ts` is refactored:

#### `show(target, emoji, reason)`

1. Save the target's original `color` and `caretColor` CSS values.
2. Set `target.style.color = 'transparent'` to hide the native text rendering.
3. Set `target.style.caretColor = <savedColor>` to keep the blinking caret visible.
4. Create a mirror `<div>` (`.ec-mirror`) covering the target's content area:
   - Copy all text-layout properties from `getComputedStyle(target)`: `font`, `fontSize`, `lineHeight`, `letterSpacing`, `wordSpacing`, `textIndent`, `textTransform`, `textAlign`, `padding`, `border`, `boxSizing`, `direction`, `writingMode`.
   - For `<textarea>`: `white-space: pre-wrap; word-wrap: break-word; overflow: hidden`.
   - For `<input>`: `white-space: pre; overflow: hidden`.
5. Render three child nodes inside the mirror:
   - **Before segment** — text node with `target.value.slice(0, selectionStart)`, rendered in the original text color.
   - **Ghost span** (`.ec-mirror-ghost`) — contains the emoji, rendered semi-transparently (opacity 0.5).
   - **After segment** — text node with `target.value.slice(selectionStart)`, rendered in the original text color.
6. Sync scroll position: `mirror.scrollTop = target.scrollTop`.
7. Attach tooltip (`.ec-ghost-tooltip`) as a child of the ghost span.
8. Append mirror to `document.body`.

#### `reposition(target)`

1. Recalculate the mirror's position and dimensions from `target.getBoundingClientRect()`.
2. Re-sync scroll offsets.
3. Rebuild text content from `target.value` and `target.selectionStart` (in case the target was resized but the overlay was not dismissed).

#### `hide()`

1. Remove the mirror from the DOM.
2. Restore the target's original `color` and `caretColor`.
3. Detach scroll/resize listeners.

#### Scroll sync

- Attach a `scroll` listener on the target element itself (not just `window`) to sync `mirror.scrollTop`/`scrollLeft` on every scroll event.
- Attach a `ResizeObserver` on the target to handle user-initiated textarea resizing.
- Both are cleaned up in `hide()`.

### 5. CSS changes

```css
.ec-mirror {
  position: absolute;
  z-index: 2147483647;
  pointer-events: none;
  overflow: hidden;
  background: transparent;
  margin: 0;
}

.ec-mirror-ghost {
  opacity: 0.5;
  pointer-events: auto;
  cursor: default;
}

.ec-mirror-ghost:hover .ec-ghost-tooltip {
  display: block;
}
```

The old `.ec-ghost` class is replaced by `.ec-mirror` and `.ec-mirror-ghost`.

### 6. `caret.ts` dependency

`getCaretPosition` is **no longer needed** for the main ghost overlay. It remains in the codebase for `ToastMessage` positioning and potential future use, but the import is removed from `overlay.ts`.

### 7. Layer responsibilities

| Layer | Responsibility |
|-------|----------------|
| **Domain** (`src/core/domain/overlay/`) | `MirrorLayout`, `MirrorContent` value objects; `splitTextAtCaret` pure function |
| **Extension** (`src/extension/content-script/overlay.ts`) | DOM manipulation: create mirror div, copy computed styles, sync scroll, manage element lifecycle |
| **Extension** (`src/extension/content-script/controller.ts`) | Orchestration: call `overlay.show/hide/reposition`, handle keyboard events. **No changes to controller API.** |

Domain objects have no dependency on `window`, `document`, or any browser API. The extension layer reads DOM state and passes primitive values to domain functions.

## Consequences

### Positive

- Ghost emoji renders **inline** with the text flow — subsequent characters are visually displaced, preventing overlap.
- Line wrapping and multi-line textareas are handled naturally by the browser's text layout engine.
- Scroll sync keeps the mirror aligned with the textarea content.
- Domain value objects (`MirrorLayout`, `MirrorContent`) are pure and unit-testable with no JSDOM dependency.
- The `caret.ts` mirror-div technique is no longer on the critical rendering path, reducing per-frame computation.

### Negative

- Increased implementation complexity in the overlay module.
- `target.style.color = 'transparent'` temporarily alters the target element's appearance; incorrect cleanup could leave the field in a broken state. Mitigated by defensive `hide()` cleanup and the controller's `cancelAll()` flow.
- Some websites may use `!important` on the input's `color` property, preventing the transparency override. Edge case; documented as a known limitation.
- The mirror must re-copy computed styles on every `show()` call to handle dynamically themed pages. Minor performance cost.
- `ResizeObserver` adds a listener; must be properly disconnected.

### Risks

- CSS custom properties or shadow DOM encapsulation on some sites may cause style mismatches between the target and the mirror. Manual testing on major sites (Gmail, Slack web, Twitter/X) is recommended.
- `caret-color` is supported from Chrome 57+; the project targets Chrome 138+, so this is not a risk.

## Related Documents

- [ADR 0006: Domain Model Design](0006-domain-model-design.md) — aggregate and value object conventions
- [ADR 0009: Chain-of-Thought Reason](0009-chain-of-thought-reason.md) — tooltip and `pointer-events` design
- [FR-5](../spec/functional-requirements.md) — "overlay the proposed emoji near the cursor in a semi-transparent style"
- [Glossary: Overlay](../spec/glossary.md) — "A semi-transparent UI element displayed near the input field showing the suggestion"

## Addendum (2026-02-07)

### `caret.ts` removed

Section 6 stated that `getCaretPosition` was "retained for `ToastMessage` positioning." In practice, `ToastMessage` uses `target.getBoundingClientRect()` directly and never imported `getCaretPosition`. Since no production code references `caret.ts`, the file has been deleted. Git history preserves the implementation if caret-based positioning is ever needed.

### `MirrorLayout` removed (YAGNI)

Section 1 introduced `MirrorLayout` as a domain value object for testable geometry. In practice, the geometry in `positionMirror()` is 4 lines of `Math.round(rect.*)` — too simple to justify a separate domain type. The type was never imported by production code and has been deleted. If overlay geometry becomes more complex in the future, a domain value object can be reintroduced.

The layer-responsibility table in section 7 is updated accordingly:

| Layer | Responsibility |
|-------|----------------|
| **Domain** (`src/core/domain/overlay/`) | `MirrorContent` value object; `splitTextAtCaret` pure function |
| **Extension** (`src/extension/content-script/overlay.ts`) | DOM manipulation: create mirror div, copy computed styles, position geometry, sync scroll, manage element lifecycle |
| **Extension** (`src/extension/content-script/controller.ts`) | Orchestration: call `overlay.show/hide/reposition`, handle keyboard events. **No changes to controller API.** |
