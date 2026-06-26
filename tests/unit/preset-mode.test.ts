import { describe, expect, it } from 'vitest';

import type { PresetMode } from '../../src/core/domain/preferences/preset-mode';
import {
    PRESET_MODES,
    SIMPLE_PRESET,
    BALANCED_PRESET,
    CREATIVE_PRESET,
    getPresetValues,
    isValidPresetMode,
} from '../../src/core/domain/preferences/preset-mode';

describe('PresetMode', () => {
    describe('PRESET_MODES', () => {
        it('contains all four modes', () => {
            expect(PRESET_MODES).toEqual(['simple', 'balanced', 'creative', 'custom']);
        });
    });

    describe('isValidPresetMode', () => {
        it.each(['simple', 'balanced', 'creative', 'custom'] as const)(
            'returns true for "%s"',
            (mode) => {
                expect(isValidPresetMode(mode)).toBe(true);
            },
        );

        it.each(['', 'unknown', 'SIMPLE', 'Simple', 'default'])('returns false for "%s"', (value) => {
            expect(isValidPresetMode(value)).toBe(false);
        });
    });

    describe('getPresetValues', () => {
        it('returns SIMPLE_PRESET for simple', () => {
            expect(getPresetValues('simple')).toBe(SIMPLE_PRESET);
        });

        it('returns BALANCED_PRESET for balanced', () => {
            expect(getPresetValues('balanced')).toBe(BALANCED_PRESET);
        });

        it('returns CREATIVE_PRESET for creative', () => {
            expect(getPresetValues('creative')).toBe(CREATIVE_PRESET);
        });

        it('returns undefined for custom', () => {
            expect(getPresetValues('custom')).toBeUndefined();
        });
    });

    describe('preset value constraints', () => {
        it('all presets have valid topK (1–40)', () => {
            for (const mode of ['simple', 'balanced', 'creative'] as PresetMode[]) {
                const values = getPresetValues(mode)!;
                expect(values.topK).toBeGreaterThanOrEqual(1);
                expect(values.topK).toBeLessThanOrEqual(40);
            }
        });

        it('all presets have valid temperature (0.0–2.0)', () => {
            for (const mode of ['simple', 'balanced', 'creative'] as PresetMode[]) {
                const values = getPresetValues(mode)!;
                expect(values.temperature).toBeGreaterThanOrEqual(0.0);
                expect(values.temperature).toBeLessThanOrEqual(2.0);
            }
        });

        it('simple uses characters mode', () => {
            expect(SIMPLE_PRESET.context.contextMode).toBe('characters');
        });

        it('balanced and creative use sentences mode', () => {
            expect(BALANCED_PRESET.context.contextMode).toBe('sentences');
            expect(CREATIVE_PRESET.context.contextMode).toBe('sentences');
        });
    });
});
