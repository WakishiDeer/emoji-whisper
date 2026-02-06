/**
 * Input snapshot creation for suggestion flow.
 * Converts DOM state into a domain-compatible snapshot object.
 */

import type { SuggestionInputSnapshot } from '../../core/services/emoji-suggestion-orchestrator';
import type { SupportedEl } from './dom-utils';

/**
 * Reasons why reading an input snapshot may be skipped.
 * These are extension-layer concerns (DOM state) rather than domain skip reasons.
 */
export type InputGuardSkipReason =
    | 'element-disconnected'
    | 'lost-focus'
    | 'composing'
    | 'no-selection'
    | 'selection-not-collapsed';

export type InputSnapshotResult =
    | { kind: 'skip'; reason: InputGuardSkipReason }
    | { kind: 'ready'; cursorIndex: number; snapshot: SuggestionInputSnapshot };

/**
 * Reads the current state of an active input element and converts it to a
 * domain-compatible SuggestionInputSnapshot.
 *
 * This function performs DOM-level guards:
 * - Element must still be connected to the document
 * - Element must still have focus
 * - IME composition must not be in progress
 * - Selection must exist and be collapsed (caret only, no range)
 *
 * @returns A skip result with reason, or a ready result with the snapshot.
 */
export function readSuggestionSnapshotFromActiveEl(params: {
    activeEl: SupportedEl;
    isComposing: boolean;
}): InputSnapshotResult {
    const { activeEl, isComposing } = params;

    if (!activeEl.isConnected) return { kind: 'skip', reason: 'element-disconnected' };
    if (document.activeElement !== activeEl) return { kind: 'skip', reason: 'lost-focus' };
    if (isComposing) return { kind: 'skip', reason: 'composing' };

    const start = activeEl.selectionStart;
    const end = activeEl.selectionEnd;
    if (start == null || end == null) return { kind: 'skip', reason: 'no-selection' };
    if (start !== end) return { kind: 'skip', reason: 'selection-not-collapsed' };

    return {
        kind: 'ready',
        cursorIndex: start,
        snapshot: {
            isSupportedInput: true,
            hasFocus: true,
            isComposing,
            hasCollapsedSelection: true,
            fullText: activeEl.value,
            cursorIndex: start,
        },
    };
}
