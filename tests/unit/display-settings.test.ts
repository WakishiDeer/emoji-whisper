import { describe, expect, it } from 'vitest';

import {
    DEFAULT_DISPLAY_SETTINGS,
} from '../../src/core/domain/preferences/display-settings';

describe('DisplaySettings', () => {
    it('defaults enable both toasts and tooltips', () => {
        expect(DEFAULT_DISPLAY_SETTINGS).toEqual({
            showUnavailableToast: true,
            showReasonTooltip: true,
        });
    });

    it('is a frozen-shape object (readonly type enforced at compile time)', () => {
        // Runtime check: the default object has exactly two keys
        expect(Object.keys(DEFAULT_DISPLAY_SETTINGS)).toHaveLength(2);
        expect(DEFAULT_DISPLAY_SETTINGS).toHaveProperty('showUnavailableToast');
        expect(DEFAULT_DISPLAY_SETTINGS).toHaveProperty('showReasonTooltip');
    });
});
