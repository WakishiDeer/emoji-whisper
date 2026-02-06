import { describe, expect, it } from 'vitest';

import { shouldAllowThrottledAction } from '../../src/core/services/throttle';

describe('throttle', () => {
    describe('shouldAllowThrottledAction', () => {
        it('allows when never shown before (null)', () => {
            expect(
                shouldAllowThrottledAction({
                    lastShownAtMs: null,
                    nowMs: 1000,
                    throttleMs: 30_000,
                }),
            ).toBe(true);
        });

        it('throttles within the window', () => {
            const throttleMs = 30_000;

            expect(
                shouldAllowThrottledAction({
                    lastShownAtMs: 1000,
                    nowMs: 1000 + throttleMs - 1,
                    throttleMs,
                }),
            ).toBe(false);
        });

        it('allows after the throttle window expires', () => {
            const throttleMs = 30_000;

            expect(
                shouldAllowThrottledAction({
                    lastShownAtMs: 1000,
                    nowMs: 1000 + throttleMs,
                    throttleMs,
                }),
            ).toBe(true);
        });

        it('allows well after the throttle window', () => {
            expect(
                shouldAllowThrottledAction({
                    lastShownAtMs: 1000,
                    nowMs: 1000 + 60_000,
                    throttleMs: 30_000,
                }),
            ).toBe(true);
        });
    });
});
