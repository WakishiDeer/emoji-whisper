/**
 * Pure keyboard event utilities.
 * No DOM dependency - operates on event-like objects.
 */

export type KeyEventLike = Readonly<{
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
}>;

/**
 * Checks whether any modifier key (Shift, Alt, Ctrl, or Meta) is pressed.
 */
export function hasModifiers(evt: KeyEventLike): boolean {
    return Boolean(evt.shiftKey || evt.altKey || evt.ctrlKey || evt.metaKey);
}

/**
 * Determines whether the given key event represents a plain Tab key press
 * (without any modifier keys like Shift, Alt, Ctrl, or Meta).
 *
 * This is important for accessibility: Shift+Tab is used for backwards navigation
 * and must not be intercepted by the extension (see NFR: Keyboard navigation).
 */
export function isPlainTabKey(evt: KeyEventLike): boolean {
    if (evt.key !== 'Tab') return false;
    return !hasModifiers(evt);
}

/**
 * Determines whether the given key event represents an Escape key press.
 * Used for dismissing the suggestion overlay (see AC-4).
 */
export function isEscapeKey(evt: KeyEventLike): boolean {
    return evt.key === 'Escape';
}

/**
 * Determines whether the given key event represents an Enter key press.
 * Used for optional suggestion triggering after line breaks (see AC-1).
 */
export function isEnterKey(evt: KeyEventLike): boolean {
    return evt.key === 'Enter';
}

/**
 * Determines whether the given key event represents a Tab key press
 * (with or without modifiers).
 */
export function isTabKey(evt: KeyEventLike): boolean {
    return evt.key === 'Tab';
}
