/**
 * Domain: Preset Mode value object.
 *
 * Named configuration profiles that batch-apply a set of user preferences.
 * Selecting a preset fills all AI-tuning and context fields with predefined values.
 * Display settings are excluded — they are personal UI choices independent of presets.
 *
 * Pure domain logic. No browser/DOM APIs.
 */

import type { ContextExtractionSettings } from '../context/context-extraction';
import type { SkipConditions } from '../suggestion/suggestion-skip-policy';

/** Supported preset mode identifiers. */
export type PresetMode = 'simple' | 'balanced' | 'creative' | 'custom';

/** All valid preset mode values (used for validation). */
export const PRESET_MODES: readonly PresetMode[] = ['simple', 'balanced', 'creative', 'custom'] as const;

/**
 * The subset of UserPreferences that a preset controls.
 * Display settings are intentionally excluded.
 */
export type PresetValues = Readonly<{
    topK: number;
    temperature: number;
    context: ContextExtractionSettings;
    skip: SkipConditions;
}>;

/** Predefined values for the Simple preset. */
export const SIMPLE_PRESET: PresetValues = {
    topK: 3,
    temperature: 0.5,
    context: {
        contextMode: 'characters',
        minContextLength: 5,
        maxContextLength: 100,
        adjustToBoundary: true,
        sentenceContext: {
            beforeSentenceCount: 0,
            afterSentenceCount: 0,
            cursorMarker: '[CURSOR]',
        },
    },
    skip: {
        skipIfEmpty: true,
        skipIfEmojiOnly: true,
        skipIfUrlOnly: true,
    },
};

/** Predefined values for the Balanced preset (matches FR-8 defaults). */
export const BALANCED_PRESET: PresetValues = {
    topK: 8,
    temperature: 0.7,
    context: {
        contextMode: 'sentences',
        minContextLength: 5,
        maxContextLength: 200,
        adjustToBoundary: true,
        sentenceContext: {
            beforeSentenceCount: 2,
            afterSentenceCount: 1,
            cursorMarker: '[CURSOR]',
        },
    },
    skip: {
        skipIfEmpty: true,
        skipIfEmojiOnly: true,
        skipIfUrlOnly: false,
    },
};

/** Predefined values for the Creative preset. */
export const CREATIVE_PRESET: PresetValues = {
    topK: 15,
    temperature: 1.2,
    context: {
        contextMode: 'sentences',
        minContextLength: 5,
        maxContextLength: 200,
        adjustToBoundary: true,
        sentenceContext: {
            beforeSentenceCount: 3,
            afterSentenceCount: 2,
            cursorMarker: '[CURSOR]',
        },
    },
    skip: {
        skipIfEmpty: true,
        skipIfEmojiOnly: true,
        skipIfUrlOnly: false,
    },
};

/** Map preset mode to its predefined values. Returns undefined for 'custom'. */
export function getPresetValues(mode: PresetMode): PresetValues | undefined {
    switch (mode) {
        case 'simple':
            return SIMPLE_PRESET;
        case 'balanced':
            return BALANCED_PRESET;
        case 'creative':
            return CREATIVE_PRESET;
        case 'custom':
            return undefined;
    }
}

/** Validates that the given string is a valid PresetMode. */
export function isValidPresetMode(value: string): value is PresetMode {
    return PRESET_MODES.includes(value as PresetMode);
}
