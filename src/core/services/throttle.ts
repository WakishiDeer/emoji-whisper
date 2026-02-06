/**
 * Pure time-based throttle utilities.
 * No side effects - returns whether an action should be allowed based on timing.
 */

export type ThrottleParams = Readonly<{
    lastShownAtMs: number | null;
    nowMs: number;
    throttleMs: number;
}>;

/**
 * Determines whether a throttled action (e.g., showing a toast message)
 * should be allowed based on the time elapsed since the last occurrence.
 *
 * @returns true if the action should proceed, false if it should be suppressed.
 */
export function shouldAllowThrottledAction(params: ThrottleParams): boolean {
    if (params.lastShownAtMs == null) return true;
    return params.nowMs - params.lastShownAtMs >= params.throttleMs;
}
