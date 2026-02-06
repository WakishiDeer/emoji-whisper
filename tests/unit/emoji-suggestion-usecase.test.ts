import { describe, expect, it } from 'vitest';

import { SuggestionSession } from '../../src/core/domain/suggestion/suggestion-session';
import { createSuggestionResult } from '../../src/core/domain/suggestion/suggestion';
import { DEFAULT_PROMPT_CONFIG } from '../../src/core/services/prompt';
import { applyEmojiSuggestionResult, beginEmojiSuggestionRequest } from '../../src/core/services/emoji-suggestion-usecase';
import { DEFAULT_SENTENCE_CONTEXT_SETTINGS } from '../../src/core/services/context';

describe('emoji-suggestion-usecase', () => {
    const settings = {
        contextMode: 'characters' as const,
        minContextLength: 1,
        maxContextLength: 200,
        adjustToBoundary: false,
        sentenceContext: DEFAULT_SENTENCE_CONTEXT_SETTINGS,
    };

    const skip = {
        skipIfEmpty: true,
        skipIfEmojiOnly: false,
        skipIfUrlOnly: false,
    };

    it('returns skipped when preparation says not-supported', () => {
        const session = new SuggestionSession();

        const result = beginEmojiSuggestionRequest({
            session,
            nowMs: 1000,
            snapshot: {
                isSupportedInput: false,
                hasFocus: true,
                isComposing: false,
                hasCollapsedSelection: true,
                fullText: 'Hello world',
                cursorIndex: 5,
            },
            settings,
            skip,
            promptConfig: DEFAULT_PROMPT_CONFIG,
            cooldownMs: 2000,
        });

        expect(result).toEqual({ kind: 'skipped', reason: 'not-supported' });
    });

    it('begins a request and returns requestId + prompt + hashes', () => {
        const session = new SuggestionSession();

        const result = beginEmojiSuggestionRequest({
            session,
            nowMs: 1000,
            snapshot: {
                isSupportedInput: true,
                hasFocus: true,
                isComposing: false,
                hasCollapsedSelection: true,
                fullText: 'Hello world',
                cursorIndex: 'Hello world'.length,
            },
            settings,
            skip,
            promptConfig: DEFAULT_PROMPT_CONFIG,
            cooldownMs: 2000,
        });

        expect(result.kind).toBe('begun');
        if (result.kind !== 'begun') throw new Error('expected begun');

        expect(result.prompt).toContain('Hello world');
        expect(result.context).toBe('Hello world');
        expect(result.requestId).toBeDefined();

        const snap = session.getSnapshot();
        expect(snap.state).toBe('Pending');
        expect(snap.pendingRequestId).toBe(result.requestId);
    });

    it('skips on cooldown and preserves the previous pending request', () => {
        const session = new SuggestionSession();

        const first = beginEmojiSuggestionRequest({
            session,
            nowMs: 1000,
            snapshot: {
                isSupportedInput: true,
                hasFocus: true,
                isComposing: false,
                hasCollapsedSelection: true,
                fullText: 'Hello world',
                cursorIndex: 'Hello world'.length,
            },
            settings,
            skip,
            promptConfig: DEFAULT_PROMPT_CONFIG,
            cooldownMs: 2000,
        });
        expect(first.kind).toBe('begun');
        if (first.kind !== 'begun') throw new Error('expected begun');

        // Mimic controller behavior: cancel pending request but keep cooldown tracking.
        session.cancelPendingOnly();

        const second = beginEmojiSuggestionRequest({
            session,
            nowMs: 1000 + 1999,
            snapshot: {
                isSupportedInput: true,
                hasFocus: true,
                isComposing: false,
                hasCollapsedSelection: true,
                fullText: 'Hello world!!!',
                cursorIndex: 'Hello world!!!'.length,
            },
            settings,
            skip,
            promptConfig: DEFAULT_PROMPT_CONFIG,
            cooldownMs: 2000,
        });

        expect(second).toEqual({ kind: 'skipped', reason: 'cooldown' });
    });

    it('skips on same-context when outside cooldown', () => {
        const session = new SuggestionSession();

        const first = beginEmojiSuggestionRequest({
            session,
            nowMs: 1000,
            snapshot: {
                isSupportedInput: true,
                hasFocus: true,
                isComposing: false,
                hasCollapsedSelection: true,
                fullText: 'Hello world',
                cursorIndex: 'Hello world'.length,
            },
            settings,
            skip,
            promptConfig: DEFAULT_PROMPT_CONFIG,
            cooldownMs: 2000,
        });
        expect(first.kind).toBe('begun');

        session.cancelPendingOnly();

        const second = beginEmojiSuggestionRequest({
            session,
            nowMs: 1000 + 3000,
            snapshot: {
                isSupportedInput: true,
                hasFocus: true,
                isComposing: false,
                hasCollapsedSelection: true,
                fullText: 'Hello world',
                cursorIndex: 'Hello world'.length,
            },
            settings,
            skip,
            promptConfig: DEFAULT_PROMPT_CONFIG,
            cooldownMs: 2000,
        });

        expect(second).toEqual({ kind: 'skipped', reason: 'same-context' });
    });

    it('applies suggestion only for the matching requestId', () => {
        const session = new SuggestionSession();

        const begun = beginEmojiSuggestionRequest({
            session,
            nowMs: 1000,
            snapshot: {
                isSupportedInput: true,
                hasFocus: true,
                isComposing: false,
                hasCollapsedSelection: true,
                fullText: 'Hello world',
                cursorIndex: 'Hello world'.length,
            },
            settings,
            skip,
            promptConfig: DEFAULT_PROMPT_CONFIG,
            cooldownMs: 2000,
        });

        expect(begun.kind).toBe('begun');
        if (begun.kind !== 'begun') throw new Error('expected begun');

        const wrong = applyEmojiSuggestionResult({
            session,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            requestId: 'wrong' as any,
            suggestionResult: createSuggestionResult('😊', 'Expresses joy'),
        });
        expect(wrong).toBe(false);

        const right = applyEmojiSuggestionResult({
            session,
            requestId: begun.requestId,
            suggestionResult: createSuggestionResult('😊', 'Expresses joy'),
        });
        expect(right).toBe(true);
        expect(session.isOverlayVisible()).toBe(true);
    });
});
