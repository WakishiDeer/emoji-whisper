/**
 * DOM utilities for content script.
 * These functions depend on browser DOM APIs and belong in the extension layer.
 */

/**
 * Supported input element types for emoji suggestions.
 * The extension only operates on standard text inputs and textareas (see AC-5).
 */
export type SupportedEl = HTMLTextAreaElement | HTMLInputElement;

/**
 * Type guard to check if a target is a supported input element.
 * Returns true for:
 * - HTMLTextAreaElement
 * - HTMLInputElement with type="text"
 *
 * Returns false for contenteditable, custom editors, and other input types (see AC-5).
 */
export function isSupportedInput(target: unknown): target is SupportedEl {
    if (target instanceof HTMLTextAreaElement) return true;
    if (target instanceof HTMLInputElement && target.type === 'text') return true;
    return false;
}

/**
 * Searches event target and composedPath for a supported input element.
 * This handles Shadow DOM scenarios where the actual input may be in composedPath.
 */
export function findSupportedInputFromEvent(evt: Event): SupportedEl | null {
    const direct = evt.target;
    if (isSupportedInput(direct)) return direct;

    const maybeComposedPath = (evt as { composedPath?: () => EventTarget[] }).composedPath;
    if (typeof maybeComposedPath === 'function') {
        for (const node of maybeComposedPath.call(evt)) {
            if (isSupportedInput(node)) return node;
        }
    }
    return null;
}

/**
 * Inserts text at the current caret position in a supported input element.
 * Dispatches an 'input' event to notify the page of the change.
 */
export function insertAtCaret(el: SupportedEl, text: string): void {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;

    el.setRangeText(text, start, end, 'end');
    el.dispatchEvent(new Event('input', { bubbles: true }));
}
