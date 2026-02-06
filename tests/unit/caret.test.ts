/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, afterEach, vi } from 'vitest';
import { getCaretPosition } from '../../src/extension/content-script/caret';

/**
 * Unit tests for getCaretPosition.
 *
 * Uses JSDOM (Vitest default). Because JSDOM does not lay out elements,
 * getBoundingClientRect returns all-zero DOMRects. We therefore stub
 * the relevant methods to control geometry and verify coordinate math.
 */

function createTextarea(value: string, selectionStart: number): HTMLTextAreaElement {
    const el = document.createElement('textarea');
    el.value = value;
    el.selectionStart = selectionStart;
    el.selectionEnd = selectionStart;
    document.body.appendChild(el);
    return el;
}

function createTextInput(value: string, selectionStart: number): HTMLInputElement {
    const el = document.createElement('input');
    el.type = 'text';
    el.value = value;
    el.selectionStart = selectionStart;
    el.selectionEnd = selectionStart;
    document.body.appendChild(el);
    return el;
}

describe('getCaretPosition', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('returns null for unsupported element types', () => {
        const el = document.createElement('input');
        el.type = 'password';
        expect(getCaretPosition(el as HTMLInputElement)).toBeNull();
    });

    it('returns null when selectionStart is null', () => {
        const el = document.createElement('textarea');
        // In some browsers selectionStart can be null for hidden elements.
        Object.defineProperty(el, 'selectionStart', { value: null });
        expect(getCaretPosition(el)).toBeNull();
    });

    it('returns a CaretPosition for a textarea', () => {
        const el = createTextarea('hello world', 5);
        const pos = getCaretPosition(el);
        // JSDOM returns zero rects, so all values resolve to 0 + window.scrollX/Y
        expect(pos).not.toBeNull();
        expect(pos).toHaveProperty('left');
        expect(pos).toHaveProperty('top');
        expect(pos).toHaveProperty('height');
    });

    it('returns a CaretPosition for an input[type=text]', () => {
        const el = createTextInput('hello', 3);
        const pos = getCaretPosition(el);
        expect(pos).not.toBeNull();
        expect(pos).toHaveProperty('left');
        expect(pos).toHaveProperty('top');
        expect(pos).toHaveProperty('height');
    });

    it('includes window.scrollX and window.scrollY in coordinates', () => {
        // Simulate a scrolled page
        Object.defineProperty(window, 'scrollX', { value: 150, writable: true, configurable: true });
        Object.defineProperty(window, 'scrollY', { value: 300, writable: true, configurable: true });

        const el = createTextarea('test text', 4);

        // Stub getBoundingClientRect on the element
        const elRect = { left: 100, top: 200, right: 400, bottom: 220, width: 300, height: 20, x: 100, y: 200, toJSON: () => ({}) };
        vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(elRect as DOMRect);

        const pos = getCaretPosition(el);
        expect(pos).not.toBeNull();

        // With JSDOM, mirror and marker rects are zero, so:
        // left = elRect.left + (0 - 0) - 0 + scrollX = 100 + 150 = 250
        // top  = elRect.top  + (0 - 0) - 0 + scrollY = 200 + 300 = 500
        expect(pos!.left).toBe(250);
        expect(pos!.top).toBe(500);

        // Cleanup
        Object.defineProperty(window, 'scrollX', { value: 0, writable: true, configurable: true });
        Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
    });

    it('subtracts element scroll offsets', () => {
        const el = createTextarea('long text for scrolling', 10);
        Object.defineProperty(el, 'scrollLeft', { value: 20, configurable: true });
        Object.defineProperty(el, 'scrollTop', { value: 30, configurable: true });

        Object.defineProperty(window, 'scrollX', { value: 0, writable: true, configurable: true });
        Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });

        const elRect = { left: 50, top: 60, right: 350, bottom: 80, width: 300, height: 20, x: 50, y: 60, toJSON: () => ({}) };
        vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(elRect as DOMRect);

        const pos = getCaretPosition(el);
        expect(pos).not.toBeNull();
        // left = 50 + (0 - 0) - 20 + 0 = 30
        // top  = 60 + (0 - 0) - 30 + 0 = 30
        expect(pos!.left).toBe(30);
        expect(pos!.top).toBe(30);
    });
});
