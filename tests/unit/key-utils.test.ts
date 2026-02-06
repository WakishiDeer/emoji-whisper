import { describe, expect, it } from 'vitest';

import {
    hasModifiers,
    isEnterKey,
    isEscapeKey,
    isPlainTabKey,
    isTabKey,
} from '../../src/core/domain/keyboard/key-utils';

describe('key-utils', () => {
    describe('hasModifiers', () => {
        it('returns false when no modifiers are pressed', () => {
            expect(hasModifiers({ key: 'a' })).toBe(false);
            expect(hasModifiers({ key: 'Tab', shiftKey: false, altKey: false, ctrlKey: false, metaKey: false })).toBe(false);
        });

        it('returns true when any modifier is pressed', () => {
            expect(hasModifiers({ key: 'a', shiftKey: true })).toBe(true);
            expect(hasModifiers({ key: 'a', altKey: true })).toBe(true);
            expect(hasModifiers({ key: 'a', ctrlKey: true })).toBe(true);
            expect(hasModifiers({ key: 'a', metaKey: true })).toBe(true);
        });

        it('returns true when multiple modifiers are pressed', () => {
            expect(hasModifiers({ key: 'a', shiftKey: true, ctrlKey: true })).toBe(true);
        });
    });

    describe('isTabKey', () => {
        it('returns true for Tab key regardless of modifiers', () => {
            expect(isTabKey({ key: 'Tab' })).toBe(true);
            expect(isTabKey({ key: 'Tab', shiftKey: true })).toBe(true);
            expect(isTabKey({ key: 'Tab', ctrlKey: true })).toBe(true);
        });

        it('returns false for non-Tab keys', () => {
            expect(isTabKey({ key: 'Enter' })).toBe(false);
            expect(isTabKey({ key: 'Escape' })).toBe(false);
        });
    });

    describe('isPlainTabKey', () => {
        it('returns true only for Tab without modifiers', () => {
            expect(isPlainTabKey({ key: 'Tab' })).toBe(true);
            expect(isPlainTabKey({ key: 'Tab', shiftKey: true })).toBe(false);
            expect(isPlainTabKey({ key: 'Tab', altKey: true })).toBe(false);
            expect(isPlainTabKey({ key: 'Tab', ctrlKey: true })).toBe(false);
            expect(isPlainTabKey({ key: 'Tab', metaKey: true })).toBe(false);
        });

        it('returns false for non-Tab keys', () => {
            expect(isPlainTabKey({ key: 'Enter' })).toBe(false);
            expect(isPlainTabKey({ key: 'Escape' })).toBe(false);
            expect(isPlainTabKey({ key: 't' })).toBe(false);
        });

        it('returns true when modifier flags are explicitly false', () => {
            expect(
                isPlainTabKey({
                    key: 'Tab',
                    shiftKey: false,
                    altKey: false,
                    ctrlKey: false,
                    metaKey: false,
                }),
            ).toBe(true);
        });
    });

    describe('isEscapeKey', () => {
        it('returns true for Escape key', () => {
            expect(isEscapeKey({ key: 'Escape' })).toBe(true);
        });

        it('returns false for non-Escape keys', () => {
            expect(isEscapeKey({ key: 'Tab' })).toBe(false);
            expect(isEscapeKey({ key: 'Enter' })).toBe(false);
            expect(isEscapeKey({ key: 'Esc' })).toBe(false); // Non-standard but checking
        });

        it('returns true regardless of modifiers', () => {
            expect(isEscapeKey({ key: 'Escape', shiftKey: true })).toBe(true);
            expect(isEscapeKey({ key: 'Escape', ctrlKey: true })).toBe(true);
        });
    });

    describe('isEnterKey', () => {
        it('returns true for Enter key', () => {
            expect(isEnterKey({ key: 'Enter' })).toBe(true);
        });

        it('returns false for non-Enter keys', () => {
            expect(isEnterKey({ key: 'Tab' })).toBe(false);
            expect(isEnterKey({ key: 'Escape' })).toBe(false);
            expect(isEnterKey({ key: 'Return' })).toBe(false); // Non-standard but checking
        });

        it('returns true regardless of modifiers', () => {
            expect(isEnterKey({ key: 'Enter', shiftKey: true })).toBe(true);
            expect(isEnterKey({ key: 'Enter', ctrlKey: true })).toBe(true);
        });
    });
});
