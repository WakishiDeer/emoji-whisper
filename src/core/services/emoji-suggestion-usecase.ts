import type { ContextExtractionSettings, SkipConditions } from './context';
import { prepareSuggestionAttempt, type SuggestionInputSnapshot } from './emoji-suggestion-orchestrator';
import type { PromptConfig } from './prompt';
import type { Context } from '../domain/context/context';
import type { ContextHash } from '../domain/context/context-hash';
import { SuggestionSession, type SkipReason, type SuggestionRequestId } from '../domain/suggestion/suggestion-session';
import type { SuggestionResult } from '../domain/suggestion/suggestion';

export type BeginEmojiSuggestionRequestResult =
    | { kind: 'skipped'; reason: SkipReason }
    | {
        kind: 'begun';
        requestId: SuggestionRequestId;
        context: Context;
        contextHash: ContextHash;
        prompt: string;
        contextLength: number;
        promptLength: number;
    };

/**
 * Application service: decides whether we can start a suggestion request.
 *
 * - Pure domain/core logic (no DOM / browser APIs)
 * - Composes context extraction + skip rules + session begin
 */
export function beginEmojiSuggestionRequest(params: {
    session: SuggestionSession;
    nowMs: number;
    snapshot: SuggestionInputSnapshot;
    settings: ContextExtractionSettings;
    skip: SkipConditions;
    promptConfig: PromptConfig;
    cooldownMs: number;
}): BeginEmojiSuggestionRequestResult {
    const { session, nowMs, snapshot, settings, skip, promptConfig, cooldownMs } = params;

    const preparation = prepareSuggestionAttempt({ snapshot, settings, skip, promptConfig });
    if (preparation.kind !== 'ready') return { kind: 'skipped', reason: preparation.reason };

    const begun = session.beginRequest({
        nowMs,
        context: preparation.context,
        contextHash: preparation.contextHash,
        cooldownMs,
    });

    if (begun.kind !== 'begun') return { kind: 'skipped', reason: begun.reason };

    return {
        kind: 'begun',
        requestId: begun.requestId,
        context: preparation.context,
        contextHash: preparation.contextHash,
        prompt: preparation.prompt,
        contextLength: preparation.context.length,
        promptLength: preparation.prompt.length,
    };
}

/**
 * Application service: applies a model suggestion to the session.
 * Returns whether the suggestion was accepted (requestId matches, still pending, etc.).
 */
export function applyEmojiSuggestionResult(params: {
    session: SuggestionSession;
    requestId: SuggestionRequestId;
    suggestionResult: SuggestionResult;
}): boolean {
    return params.session.receiveSuggestion({ requestId: params.requestId, suggestionResult: params.suggestionResult });
}
