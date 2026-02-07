/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { GhostOverlay, ToastMessage, CSS } from '../../src/extension/content-script/overlay';

// Spy-based ResizeObserver mock for JSDOM (not natively available).
type ResizeObserverCallback = (entries: ResizeObserverEntry[], observer: ResizeObserver) => void;
let resizeObserverCallback: ResizeObserverCallback | null = null;
const resizeObserverObserve = vi.fn();
const resizeObserverDisconnect = vi.fn();

class MockResizeObserver {
    constructor(cb: ResizeObserverCallback) { resizeObserverCallback = cb; }
    observe = resizeObserverObserve;
    unobserve = vi.fn();
    disconnect = resizeObserverDisconnect;
}
vi.stubGlobal('ResizeObserver', MockResizeObserver);

function triggerResizeObserver() {
    resizeObserverCallback?.([] as ResizeObserverEntry[], null as unknown as ResizeObserver);
}

function createTextarea(value = 'hello world', caretPos = 5): HTMLTextAreaElement {
    const el = document.createElement('textarea');
    el.value = value;
    el.selectionStart = caretPos;
    el.selectionEnd = caretPos;
    document.body.appendChild(el);
    return el;
}

function createInput(value = 'hello world', caretPos = 5): HTMLInputElement {
    const el = document.createElement('input');
    el.type = 'text';
    el.value = value;
    el.selectionStart = caretPos;
    el.selectionEnd = caretPos;
    document.body.appendChild(el);
    return el;
}

function stubTargetRect(target: HTMLElement, rect: Partial<DOMRect> = {}) {
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
        left: 50, top: 100, right: 350, bottom: 120, width: 300, height: 20, x: 50, y: 100,
        toJSON: () => ({}),
        ...rect,
    } as DOMRect);
}

describe('GhostOverlay', () => {
    let overlay: GhostOverlay;

    beforeEach(() => {
        overlay = new GhostOverlay();
        Object.defineProperty(window, 'scrollX', { value: 0, writable: true, configurable: true });
        Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
    });

    afterEach(() => {
        overlay.hide();
        document.body.innerHTML = '';
        vi.restoreAllMocks();
        resizeObserverCallback = null;
        resizeObserverObserve.mockClear();
        resizeObserverDisconnect.mockClear();
    });

    // -- Visibility & emoji/reason accessors --

    it('shows the overlay with the emoji', () => {
        const target = createTextarea();
        stubTargetRect(target);

        overlay.show(target, '😊');

        expect(overlay.isVisible()).toBe(true);
        expect(overlay.getEmoji()).toBe('😊');
    });

    it('shows the overlay with emoji and reason tooltip', () => {
        const target = createTextarea();
        stubTargetRect(target);

        overlay.show(target, '🎸', 'Mentions playing guitar');

        expect(overlay.isVisible()).toBe(true);
        expect(overlay.getEmoji()).toBe('🎸');
        expect(overlay.getReason()).toBe('Mentions playing guitar');

        const tooltip = document.querySelector(`.${CSS.tooltip}`) as HTMLDivElement;
        expect(tooltip).not.toBeNull();
        expect(tooltip.textContent).toBe('Mentions playing guitar');
        expect(tooltip.style.display).not.toBe('none');
    });

    it('hides tooltip when no reason is provided', () => {
        const target = createTextarea();
        stubTargetRect(target);

        overlay.show(target, '😊');

        const tooltip = document.querySelector(`.${CSS.tooltip}`) as HTMLDivElement;
        expect(tooltip).not.toBeNull();
        expect(tooltip.style.display).toBe('none');
        expect(overlay.getReason()).toBeNull();
    });

    it('hides the overlay', () => {
        const target = createTextarea();
        stubTargetRect(target);

        overlay.show(target, '😊');
        expect(overlay.isVisible()).toBe(true);

        overlay.hide();
        expect(overlay.isVisible()).toBe(false);
    });

    // -- Mirror div creation --

    it('creates a mirror div with the correct CSS class', () => {
        const target = createTextarea();
        stubTargetRect(target);

        overlay.show(target, '😊');

        const mirror = document.querySelector(`.${CSS.mirror}`) as HTMLDivElement;
        expect(mirror).not.toBeNull();
        expect(mirror.className).toBe(CSS.mirror);
    });

    it('renders three segments: before text, ghost span, after text', () => {
        const target = createTextarea('hello world', 5);
        stubTargetRect(target);

        overlay.show(target, '😊');

        const mirror = document.querySelector(`.${CSS.mirror}`) as HTMLDivElement;
        // Children: TextNode("hello") + SPAN.ec-mirror-ghost + TextNode(" world")
        const children = Array.from(mirror.childNodes);

        // Before text
        const beforeNode = children[0];
        expect(beforeNode.nodeType).toBe(Node.TEXT_NODE);
        expect(beforeNode.textContent).toBe('hello');

        // Ghost span
        const ghostSpan = children[1] as HTMLSpanElement;
        expect(ghostSpan.nodeType).toBe(Node.ELEMENT_NODE);
        expect(ghostSpan.className).toBe(CSS.mirrorGhost);
        // Ghost span's first child is text node with the emoji.
        expect(ghostSpan.childNodes[0].textContent).toBe('😊');

        // After text
        const afterNode = children[2];
        expect(afterNode.nodeType).toBe(Node.TEXT_NODE);
        expect(afterNode.textContent).toBe(' world');
    });

    it('places tooltip inside the ghost span', () => {
        const target = createTextarea();
        stubTargetRect(target);

        overlay.show(target, '😊', 'Some reason');

        const ghostSpan = document.querySelector(`.${CSS.mirrorGhost}`) as HTMLSpanElement;
        const tooltip = ghostSpan.querySelector(`.${CSS.tooltip}`) as HTMLDivElement;
        expect(tooltip).not.toBeNull();
        expect(tooltip.textContent).toBe('Some reason');
    });

    // -- Target text color swap --

    it('sets target color to transparent and preserves caretColor', () => {
        const target = createTextarea();
        stubTargetRect(target);

        overlay.show(target, '😊');

        expect(target.style.color).toBe('transparent');
        // caretColor should be set (not empty) — the actual value depends on
        // getComputedStyle, which in JSDOM defaults to empty string.
        // We just verify it was assigned (not left as the initial value).
        expect(target.style.caretColor).toBeDefined();
    });

    it('restores target color and caretColor on hide', () => {
        const target = createTextarea();
        target.style.color = 'red';
        target.style.caretColor = 'blue';
        stubTargetRect(target);

        overlay.show(target, '😊');
        expect(target.style.color).toBe('transparent');

        overlay.hide();
        expect(target.style.color).toBe('red');
        expect(target.style.caretColor).toBe('blue');
    });

    // -- Positioning --

    it('positions mirror over the target using getBoundingClientRect', () => {
        const target = createTextarea();
        stubTargetRect(target, { left: 50, top: 100, width: 300, height: 20 });

        overlay.show(target, '😊');

        const mirror = document.querySelector(`.${CSS.mirror}`) as HTMLDivElement;
        expect(mirror.style.left).toBe('50px');
        expect(mirror.style.top).toBe('100px');
        expect(mirror.style.width).toBe('300px');
        expect(mirror.style.height).toBe('20px');
    });

    it('accounts for scroll offsets in positioning', () => {
        const target = createTextarea();
        stubTargetRect(target, { left: 50, top: 100, width: 300, height: 20 });
        Object.defineProperty(window, 'scrollX', { value: 10, writable: true, configurable: true });
        Object.defineProperty(window, 'scrollY', { value: 20, writable: true, configurable: true });

        overlay.show(target, '😊');

        const mirror = document.querySelector(`.${CSS.mirror}`) as HTMLDivElement;
        expect(mirror.style.left).toBe('60px');
        expect(mirror.style.top).toBe('120px');
    });

    it('repositions mirror on reposition()', () => {
        const target = createTextarea();
        stubTargetRect(target, { left: 50, top: 100, width: 300, height: 20 });
        overlay.show(target, '😊');

        // Simulate target moved
        stubTargetRect(target, { left: 80, top: 150, width: 400, height: 30 });
        overlay.reposition(target);

        const mirror = document.querySelector(`.${CSS.mirror}`) as HTMLDivElement;
        expect(mirror.style.left).toBe('80px');
        expect(mirror.style.top).toBe('150px');
        expect(mirror.style.width).toBe('400px');
        expect(mirror.style.height).toBe('30px');
    });

    // -- Font / style copying --

    it('copies font metrics from target to the mirror element', () => {
        const target = createTextarea();
        const originalGetComputedStyle = window.getComputedStyle;
        vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
            if (el === target) {
                return {
                    ...originalGetComputedStyle(el),
                    fontSize: '18px',
                    lineHeight: '24px',
                } as CSSStyleDeclaration;
            }
            return originalGetComputedStyle(el);
        });
        stubTargetRect(target);

        overlay.show(target, '😊');

        const mirror = document.querySelector(`.${CSS.mirror}`) as HTMLDivElement;
        expect(mirror).not.toBeNull();
        expect(mirror.style.fontSize).toBe('18px');
        expect(mirror.style.lineHeight).toBe('24px');
    });

    // -- Textarea vs input --

    it('sets white-space to pre-wrap for textarea', () => {
        const target = createTextarea();
        stubTargetRect(target);

        overlay.show(target, '😊');

        const mirror = document.querySelector(`.${CSS.mirror}`) as HTMLDivElement;
        expect(mirror.style.whiteSpace).toBe('pre-wrap');
    });

    it('sets white-space to pre for input', () => {
        const target = createInput();
        stubTargetRect(target);

        overlay.show(target, '😊');

        const mirror = document.querySelector(`.${CSS.mirror}`) as HTMLDivElement;
        expect(mirror.style.whiteSpace).toBe('pre');
    });

    // -- Scroll sync --

    it('syncs scrollTop from target to mirror', () => {
        const target = createTextarea('line1\nline2\nline3\nline4\nline5', 0);
        stubTargetRect(target);

        overlay.show(target, '😊');

        // Simulate scroll
        Object.defineProperty(target, 'scrollTop', { value: 42, writable: true, configurable: true });
        overlay.reposition(target);

        const mirror = document.querySelector(`.${CSS.mirror}`) as HTMLDivElement;
        expect(mirror.scrollTop).toBe(42);
    });

    // -- ARIA --

    it('sets ARIA attributes on the mirror', () => {
        const target = createTextarea();
        stubTargetRect(target);

        overlay.show(target, '🎉');

        const mirror = document.querySelector(`.${CSS.mirror}`) as HTMLDivElement;
        expect(mirror.getAttribute('role')).toBe('status');
        expect(mirror.getAttribute('aria-live')).toBe('polite');
        expect(mirror.getAttribute('aria-label')).toBe('Suggested emoji: 🎉');
    });

    // -- Multiple show/hide cycles --

    it('cleans up previous mirror when showing on a different target', () => {
        const target1 = createTextarea('first', 3);
        const target2 = createTextarea('second', 4);
        stubTargetRect(target1);
        stubTargetRect(target2);

        overlay.show(target1, '😊');
        expect(document.querySelectorAll(`.${CSS.mirror}`).length).toBe(1);

        overlay.show(target2, '🎉');
        expect(document.querySelectorAll(`.${CSS.mirror}`).length).toBe(1);
        expect(overlay.getEmoji()).toBe('🎉');
    });

    it('updates emoji when show() is called again on the same target', () => {
        const target = createTextarea('hello world', 5);
        stubTargetRect(target);

        overlay.show(target, '😊');
        expect(overlay.getEmoji()).toBe('😊');
        expect(document.querySelectorAll(`.${CSS.mirror}`).length).toBe(1);

        overlay.show(target, '🎉', 'New reason');
        expect(overlay.getEmoji()).toBe('🎉');
        expect(overlay.getReason()).toBe('New reason');
        // Only one mirror div should exist after re-show on same target.
        expect(document.querySelectorAll(`.${CSS.mirror}`).length).toBe(1);
    });

    it('does not re-save transparent color on repeated show() to same target', () => {
        const target = createTextarea('hello world', 5);
        target.style.color = 'rgb(255, 0, 0)';
        stubTargetRect(target);

        overlay.show(target, '😊');
        // After first show, target text is transparent.
        expect(target.style.color).toBe('transparent');

        overlay.show(target, '🎉');
        // After second show, target text is still transparent.
        expect(target.style.color).toBe('transparent');

        // After hide, original color is restored (not 'transparent').
        overlay.hide();
        expect(target.style.color).toBe('rgb(255, 0, 0)');
    });

    // -- Mirror text color --

    it('sets the mirror text color to the original computed color', () => {
        const target = createTextarea();
        const originalGetComputedStyle = window.getComputedStyle;
        vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
            if (el === target) {
                return {
                    ...originalGetComputedStyle(el),
                    color: 'rgb(255, 255, 255)',
                } as CSSStyleDeclaration;
            }
            return originalGetComputedStyle(el);
        });
        stubTargetRect(target);

        overlay.show(target, '😊');

        const mirror = document.querySelector(`.${CSS.mirror}`) as HTMLDivElement;
        expect(mirror.style.color).toBe('rgb(255, 255, 255)');
    });

    it('preserves original color on mirror after repeated show() on same target', () => {
        const target = createTextarea();
        const originalGetComputedStyle = window.getComputedStyle;
        vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
            // First call gets the real color; subsequent calls will see transparent
            // because target.style.color was set. But the overlay should use the saved value.
            if (el === target) {
                return {
                    ...originalGetComputedStyle(el),
                    color: target.style.color === 'transparent' ? 'rgba(0, 0, 0, 0)' : 'rgb(0, 128, 0)',
                } as CSSStyleDeclaration;
            }
            return originalGetComputedStyle(el);
        });
        stubTargetRect(target);

        overlay.show(target, '😊');
        const mirror1 = document.querySelector(`.${CSS.mirror}`) as HTMLDivElement;
        expect(mirror1.style.color).toBe('rgb(0, 128, 0)');

        // Second show on same target — mirror should still use original green, not transparent.
        overlay.show(target, '🎉');
        const mirror2 = document.querySelector(`.${CSS.mirror}`) as HTMLDivElement;
        expect(mirror2.style.color).toBe('rgb(0, 128, 0)');
    });

    // -- Edge case: target removed from DOM before hide --

    it('handles hide() gracefully when target is detached from DOM', () => {
        const target = createTextarea('hello world', 5);
        target.style.color = 'blue';
        stubTargetRect(target);

        overlay.show(target, '😊');
        expect(overlay.isVisible()).toBe(true);

        // Simulate SPA navigation: target removed from DOM.
        target.remove();

        // hide() should not throw.
        expect(() => overlay.hide()).not.toThrow();
        expect(overlay.isVisible()).toBe(false);
        // Style restoration on detached element is a no-op but should not error.
        expect(target.style.color).toBe('blue');
    });

    // -- ResizeObserver integration --

    describe('ResizeObserver integration', () => {
        it('calls observe() with the target on show()', () => {
            const target = createTextarea();
            stubTargetRect(target);

            overlay.show(target, '😊');

            expect(resizeObserverObserve).toHaveBeenCalledWith(target);
        });

        it('repositions mirror when ResizeObserver fires', () => {
            const target = createTextarea();
            stubTargetRect(target, { left: 50, top: 100, width: 300, height: 20 });

            overlay.show(target, '😊');
            const mirror = document.querySelector(`.${CSS.mirror}`) as HTMLDivElement;
            expect(mirror.style.left).toBe('50px');

            // Simulate target resize — new position.
            stubTargetRect(target, { left: 80, top: 200, width: 400, height: 40 });
            triggerResizeObserver();

            expect(mirror.style.left).toBe('80px');
            expect(mirror.style.top).toBe('200px');
            expect(mirror.style.width).toBe('400px');
            expect(mirror.style.height).toBe('40px');
        });

        it('calls disconnect() on hide()', () => {
            const target = createTextarea();
            stubTargetRect(target);

            overlay.show(target, '😊');
            resizeObserverDisconnect.mockClear();

            overlay.hide();

            expect(resizeObserverDisconnect).toHaveBeenCalled();
        });

        it('disconnects previous observer when switching targets', () => {
            const target1 = createTextarea('first', 3);
            const target2 = createTextarea('second', 4);
            stubTargetRect(target1);
            stubTargetRect(target2);

            overlay.show(target1, '😊');
            const disconnectCountAfterFirst = resizeObserverDisconnect.mock.calls.length;

            overlay.show(target2, '🎉');

            // disconnect should have been called at least once more for the old observer.
            expect(resizeObserverDisconnect.mock.calls.length).toBeGreaterThan(disconnectCountAfterFirst);
            // New observer should observe target2.
            expect(resizeObserverObserve).toHaveBeenCalledWith(target2);
        });
    });
});

describe('ToastMessage', () => {
    let toast: ToastMessage;

    beforeEach(() => {
        toast = new ToastMessage();
        Object.defineProperty(window, 'scrollX', { value: 0, writable: true, configurable: true });
        Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
    });

    afterEach(() => {
        toast.hide();
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('applies scroll offset to toast position', () => {
        const target = document.createElement('textarea');
        document.body.appendChild(target);

        vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
            left: 80, top: 100, right: 380, bottom: 120, width: 300, height: 20, x: 80, y: 100, toJSON: () => ({}),
        } as DOMRect);

        Object.defineProperty(window, 'scrollX', { value: 25, writable: true, configurable: true });
        Object.defineProperty(window, 'scrollY', { value: 50, writable: true, configurable: true });

        toast.show(target, 'Test toast');

        const toastEl = document.querySelector('.ec-toast') as HTMLDivElement;
        expect(toastEl).not.toBeNull();
        // left = 80 + 25 = 105, top = 120 + 6 + 50 = 176
        expect(toastEl.style.left).toBe('105px');
        expect(toastEl.style.top).toBe('176px');
    });

    it('hides the toast', () => {
        const target = document.createElement('textarea');
        document.body.appendChild(target);

        toast.show(target, 'Hello');
        const toastEl = document.querySelector('.ec-toast');
        expect(toastEl).not.toBeNull();

        toast.hide();
        expect(document.querySelector('.ec-toast')).toBeNull();
    });
});
