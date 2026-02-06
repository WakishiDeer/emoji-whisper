/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { GhostOverlay, ToastMessage } from '../../src/extension/content-script/overlay';

// Mock the caret module so we can control positioning
vi.mock('../../src/extension/content-script/caret', () => ({
    getCaretPosition: vi.fn(),
}));

// Must import after vi.mock so the mock is in place
import { getCaretPosition } from '../../src/extension/content-script/caret';
const mockedGetCaretPosition = vi.mocked(getCaretPosition);

function createTextarea(): HTMLTextAreaElement {
    const el = document.createElement('textarea');
    el.value = 'hello world';
    el.selectionStart = 5;
    el.selectionEnd = 5;
    document.body.appendChild(el);
    return el;
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
    });

    it('shows the overlay with the emoji', () => {
        const target = createTextarea();
        mockedGetCaretPosition.mockReturnValue({ left: 100, top: 200, height: 16 });

        overlay.show(target, '😊');

        expect(overlay.isVisible()).toBe(true);
        expect(overlay.getEmoji()).toBe('😊');
    });

    it('copies font metrics from target to the overlay element', () => {
        const target = createTextarea();
        // Stub getComputedStyle to return known values
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

        mockedGetCaretPosition.mockReturnValue({ left: 100, top: 200, height: 16 });
        overlay.show(target, '😊');

        const ghostEl = document.querySelector('.ec-ghost') as HTMLDivElement;
        expect(ghostEl).not.toBeNull();
        expect(ghostEl.style.fontSize).toBe('18px');
        expect(ghostEl.style.lineHeight).toBe('24px');
    });

    it('positions overlay using caret position', () => {
        const target = createTextarea();
        mockedGetCaretPosition.mockReturnValue({ left: 120, top: 250, height: 18 });

        overlay.show(target, '🎉');

        const ghostEl = document.querySelector('.ec-ghost') as HTMLDivElement;
        expect(ghostEl.style.left).toBe('120px');
        expect(ghostEl.style.top).toBe('250px');
    });

    it('uses fallback positioning when getCaretPosition returns null', () => {
        const target = createTextarea();
        mockedGetCaretPosition.mockReturnValue(null);

        // Stub getBoundingClientRect on the target
        vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
            left: 50, top: 100, right: 350, bottom: 120, width: 300, height: 20, x: 50, y: 100, toJSON: () => ({}),
        } as DOMRect);

        Object.defineProperty(window, 'scrollX', { value: 10, writable: true, configurable: true });
        Object.defineProperty(window, 'scrollY', { value: 20, writable: true, configurable: true });

        overlay.show(target, '🤔');

        const ghostEl = document.querySelector('.ec-ghost') as HTMLDivElement;
        expect(ghostEl).not.toBeNull();
        // Fallback: left = rect.right + scrollX = 350 + 10 = 360
        // Fallback: top  = rect.bottom + scrollY = 120 + 20 = 140
        expect(ghostEl.style.left).toBe('360px');
        expect(ghostEl.style.top).toBe('140px');
        // Transform should be cleared on fallback
        expect(ghostEl.style.transform).toBe('');
    });

    it('hides the overlay', () => {
        const target = createTextarea();
        mockedGetCaretPosition.mockReturnValue({ left: 100, top: 200, height: 16 });

        overlay.show(target, '😊');
        expect(overlay.isVisible()).toBe(true);

        overlay.hide();
        expect(overlay.isVisible()).toBe(false);
    });

    it('repositions an already-visible overlay', () => {
        const target = createTextarea();
        mockedGetCaretPosition.mockReturnValue({ left: 100, top: 200, height: 16 });
        overlay.show(target, '😊');

        mockedGetCaretPosition.mockReturnValue({ left: 150, top: 300, height: 16 });
        overlay.reposition(target);

        const ghostEl = document.querySelector('.ec-ghost') as HTMLDivElement;
        expect(ghostEl.style.left).toBe('150px');
        expect(ghostEl.style.top).toBe('300px');
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
