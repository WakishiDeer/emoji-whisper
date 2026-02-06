import { describe, expect, it } from 'vitest';

import { prepareSuggestionAttempt } from '../../src/core/services/emoji-suggestion-orchestrator';
import { hashContextDjb2 } from '../../src/core/domain/context/context-hash';
import { DEFAULT_PROMPT_CONFIG } from '../../src/core/services/prompt';
import { DEFAULT_SENTENCE_CONTEXT_SETTINGS } from '../../src/core/services/context';
import type { Context } from '../../src/core/domain/context/context';


describe('prepareSuggestionAttempt', () => {
  const settings = {
    contextMode: 'characters' as const,
    minContextLength: 5,
    maxContextLength: 200,
    adjustToBoundary: false,
    sentenceContext: DEFAULT_SENTENCE_CONTEXT_SETTINGS,
  };

  const skip = {
    skipIfEmpty: true,
    skipIfEmojiOnly: true,
    skipIfUrlOnly: true,
  };

  it('skips when input is not supported', () => {
    const result = prepareSuggestionAttempt({
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
    });

    expect(result).toEqual({ kind: 'skip', reason: 'not-supported' });
  });

  it('skips for composition or selection state', () => {
    const composing = prepareSuggestionAttempt({
      snapshot: {
        isSupportedInput: true,
        hasFocus: true,
        isComposing: true,
        hasCollapsedSelection: true,
        fullText: 'Hello world',
        cursorIndex: 5,
      },
      settings,
      skip,
      promptConfig: DEFAULT_PROMPT_CONFIG,
    });

    expect(composing).toEqual({ kind: 'skip', reason: 'composing' });

    const selection = prepareSuggestionAttempt({
      snapshot: {
        isSupportedInput: true,
        hasFocus: true,
        isComposing: false,
        hasCollapsedSelection: false,
        fullText: 'Hello world',
        cursorIndex: 5,
      },
      settings,
      skip,
      promptConfig: DEFAULT_PROMPT_CONFIG,
    });

    expect(selection).toEqual({ kind: 'skip', reason: 'selection' });
  });

  it('skips when context is too short or meets skip conditions', () => {
    const tooShort = prepareSuggestionAttempt({
      snapshot: {
        isSupportedInput: true,
        hasFocus: true,
        isComposing: false,
        hasCollapsedSelection: true,
        fullText: 'Hi',
        cursorIndex: 2,
      },
      settings,
      skip,
      promptConfig: DEFAULT_PROMPT_CONFIG,
    });

    expect(tooShort).toEqual({ kind: 'skip', reason: 'too-short' });

    const urlOnly = prepareSuggestionAttempt({
      snapshot: {
        isSupportedInput: true,
        hasFocus: true,
        isComposing: false,
        hasCollapsedSelection: true,
        fullText: 'https://example.com',
        cursorIndex: 19,
      },
      settings: { ...settings, minContextLength: 1 },
      skip,
      promptConfig: DEFAULT_PROMPT_CONFIG,
    });

    expect(urlOnly).toEqual({ kind: 'skip', reason: 'conditions' });
  });

  it('returns a ready attempt with context hash and prompt', () => {
    const snapshotText = 'Hello, this is a sample text for testing.' as Context;
    const ready = prepareSuggestionAttempt({
      snapshot: {
        isSupportedInput: true,
        hasFocus: true,
        isComposing: false,
        hasCollapsedSelection: true,
        fullText: snapshotText,
        cursorIndex: snapshotText.length,
      },
      settings,
      skip,
      promptConfig: DEFAULT_PROMPT_CONFIG,
    });

    expect(ready.kind).toBe('ready');
    if (ready.kind !== 'ready') throw new Error('expected ready');

    expect(ready.context).toBe(snapshotText);
    expect(ready.contextHash).toBe(hashContextDjb2(snapshotText));
    expect(ready.prompt).toContain(snapshotText);
  });
});
