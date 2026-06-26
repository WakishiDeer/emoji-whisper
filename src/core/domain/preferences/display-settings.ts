/**
 * Domain: Display Settings value object.
 *
 * Groups UI presentation preferences (toast/tooltip toggles).
 * Independent of preset modes — display settings are personal UI choices
 * that persist across preset changes.
 *
 * Pure domain logic. No browser/DOM APIs.
 */

/**
 * UI display toggles for the extension's visual feedback.
 */
export type DisplaySettings = Readonly<{
    /** When true, shows a toast when the Prompt API is unavailable. Default: true. */
    showUnavailableToast: boolean;
    /** When true, shows the reason tooltip on hover over the ghost emoji. Default: true. */
    showReasonTooltip: boolean;
}>;

/** Default display settings — all visual feedback enabled. */
export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
    showUnavailableToast: true,
    showReasonTooltip: true,
};
