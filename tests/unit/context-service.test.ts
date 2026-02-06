import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SENTENCE_CONTEXT_SETTINGS,
  extractContext,
  extractContextAroundCursor,
  extractContextBeforeCursor,
  shouldSkipByConditions,
  shouldSkipByLength,
} from '../../src/core/services/context';

/**
 * Context Extraction Tests
 *
 * These tests document the context extraction behavior as specified in:
 * - docs/spec/functional-requirements.md (Section 4, Context extraction rules)
 * - docs/spec/functional-requirements.md (Section 8, Context length settings)
 *
 * Key specification points:
 * - maxContextLength (default: 200): Maximum characters to extract BEFORE cursor
 * - adjustToBoundary (default: true): Align truncation to sentence boundary
 * - Boundary characters: . ! ? 。 ！ ？ \n
 * - If no boundary exists, use the raw truncated window
 */
describe('extractContextBeforeCursor', () => {
  const defaultSettings = {
    contextMode: 'characters' as const,
    minContextLength: 1,
    maxContextLength: 200,
    adjustToBoundary: true,
    sentenceContext: DEFAULT_SENTENCE_CONTEXT_SETTINGS,
  };

  // ============================================================
  // BASIC: Cursor position determines extraction range
  // ============================================================
  describe('cursor position (extracts text BEFORE cursor only)', () => {
    it('extracts all text when cursor is at end and text is within maxContextLength', () => {
      const text = 'Hello world';
      const cursor = text.length; // cursor at end

      const result = extractContextBeforeCursor(text, cursor, {
        ...defaultSettings,
        adjustToBoundary: false,
      });

      expect(result).toBe('Hello world');
    });

    it('extracts only text BEFORE cursor when cursor is in the middle', () => {
      // Text: "Hello world. More text here."
      //              ^cursor at position 11 (after "Hello world")
      const text = 'Hello world. More text here.';
      const cursor = 11;

      const result = extractContextBeforeCursor(text, cursor, {
        ...defaultSettings,
        adjustToBoundary: false,
      });

      expect(result).toBe('Hello world');
    });

    it('returns empty string when cursor is at position 0', () => {
      const text = 'Hello world';
      const cursor = 0;

      const result = extractContextBeforeCursor(text, cursor, {
        ...defaultSettings,
        adjustToBoundary: false,
      });

      expect(result).toBe('');
    });

    it('returns empty string when text is empty', () => {
      const text = '';
      const cursor = 0;

      const result = extractContextBeforeCursor(text, cursor, {
        ...defaultSettings,
        adjustToBoundary: false,
      });

      expect(result).toBe('');
    });
  });

  // ============================================================
  // maxContextLength: Truncation from the END (closest to cursor)
  // ============================================================
  describe('maxContextLength (truncates from start, keeps end closest to cursor)', () => {
    it('truncates from start when text exceeds maxContextLength', () => {
      // Text: "abcdefghij" (10 chars), maxContextLength: 5
      // Expected: last 5 chars before cursor = "fghij"
      const text = 'abcdefghij';
      const cursor = text.length;

      const result = extractContextBeforeCursor(text, cursor, {
        ...defaultSettings,
        maxContextLength: 5,
        adjustToBoundary: false,
      });

      expect(result).toBe('fghij');
    });

    it('keeps all text when within maxContextLength', () => {
      const text = 'Short';
      const cursor = text.length;

      const result = extractContextBeforeCursor(text, cursor, {
        ...defaultSettings,
        maxContextLength: 200,
        adjustToBoundary: false,
      });

      expect(result).toBe('Short');
    });

    it('respects maxContextLength when cursor is in middle of long text', () => {
      // Text: "aaaaaaaaaa|bbbbbbbbbb" (cursor at position 10)
      // maxContextLength: 5 → extracts "aaaaa" (last 5 chars before cursor)
      const text = 'aaaaaaaaaabbbbbbbbbb';
      const cursor = 10;

      const result = extractContextBeforeCursor(text, cursor, {
        ...defaultSettings,
        maxContextLength: 5,
        adjustToBoundary: false,
      });

      expect(result).toBe('aaaaa');
    });
  });

  // ============================================================
  // adjustToBoundary: Sentence boundary alignment
  // Spec: "Boundary characters are: . ! ? 。 ！ ？ and newline (\n)"
  // ============================================================
  describe('adjustToBoundary (aligns to sentence boundary)', () => {
    it('adjusts to period (.) boundary - extracts text AFTER the first boundary', () => {
      // Text: "First sentence. Second sentence"
      // Window (full): "First sentence. Second sentence"
      // First boundary: "." at index 14
      // Result: text after boundary = " Second sentence"
      const text = 'First sentence. Second sentence';
      const cursor = text.length;

      const result = extractContextBeforeCursor(text, cursor, defaultSettings);

      expect(result).toBe(' Second sentence');
    });

    it('adjusts to exclamation mark (!) boundary', () => {
      const text = 'Wow! That is amazing';
      const cursor = text.length;

      const result = extractContextBeforeCursor(text, cursor, defaultSettings);

      expect(result).toBe(' That is amazing');
    });

    it('adjusts to question mark (?) boundary', () => {
      const text = 'Really? I did not know that';
      const cursor = text.length;

      const result = extractContextBeforeCursor(text, cursor, defaultSettings);

      expect(result).toBe(' I did not know that');
    });

    it('adjusts to Japanese period (。) boundary', () => {
      const text = 'これはテストです。次の文です';
      const cursor = text.length;

      const result = extractContextBeforeCursor(text, cursor, defaultSettings);

      expect(result).toBe('次の文です');
    });

    it('adjusts to Japanese exclamation (！) boundary', () => {
      const text = 'すごい！本当に素晴らしい';
      const cursor = text.length;

      const result = extractContextBeforeCursor(text, cursor, defaultSettings);

      expect(result).toBe('本当に素晴らしい');
    });

    it('adjusts to Japanese question mark (？) boundary', () => {
      const text = '本当？そうなんだ';
      const cursor = text.length;

      const result = extractContextBeforeCursor(text, cursor, defaultSettings);

      expect(result).toBe('そうなんだ');
    });

    it('adjusts to newline (\\n) boundary', () => {
      const text = 'First line\nSecond line';
      const cursor = text.length;

      const result = extractContextBeforeCursor(text, cursor, defaultSettings);

      expect(result).toBe('Second line');
    });

    it('uses FIRST boundary when multiple boundaries exist in window', () => {
      // Text: "A. B! C? D"
      // First boundary: "." at index 1
      // Result: text after first boundary
      const text = 'A. B! C? D';
      const cursor = text.length;

      const result = extractContextBeforeCursor(text, cursor, defaultSettings);

      expect(result).toBe(' B! C? D');
    });

    it('keeps full window when no boundary exists', () => {
      const text = 'No boundaries here just text';
      const cursor = text.length;

      const result = extractContextBeforeCursor(text, cursor, defaultSettings);

      expect(result).toBe('No boundaries here just text');
    });

    it('keeps full window when boundary is at the very end', () => {
      // If boundary is at the end, there is nothing after it worth keeping
      const text = 'This ends with period.';
      const cursor = text.length;

      const result = extractContextBeforeCursor(text, cursor, defaultSettings);

      expect(result).toBe('This ends with period.');
    });

    it('does NOT adjust boundary when adjustToBoundary is false', () => {
      const text = 'First sentence. Second sentence';
      const cursor = text.length;

      const result = extractContextBeforeCursor(text, cursor, {
        ...defaultSettings,
        adjustToBoundary: false,
      });

      expect(result).toBe('First sentence. Second sentence');
    });
  });

  // ============================================================
  // Combined: maxContextLength + adjustToBoundary
  // ============================================================
  describe('combined maxContextLength and adjustToBoundary', () => {
    it('first truncates by maxContextLength, then adjusts to boundary within window', () => {
      // Text: "Sentence one. Sentence two. Sentence three. Final words"
      // maxContextLength: 20 → window = ". Final words" (last 20 chars)
      // Wait, let me recalculate...
      // Full text length: 55 chars
      // maxContextLength: 25
      // Window start: 55 - 25 = 30
      // Window: "ence three. Final words"
      // First boundary in window: "." at relative index 10
      // Result: " Final words"
      const text = 'Sentence one. Sentence two. Sentence three. Final words';
      const cursor = text.length;

      const result = extractContextBeforeCursor(text, cursor, {
        ...defaultSettings,
        maxContextLength: 25,
        adjustToBoundary: true,
      });

      expect(result).toBe(' Final words');
    });
  });

  // ============================================================
  // Edge cases
  // ============================================================
  describe('edge cases', () => {
    it('handles cursor beyond text length gracefully', () => {
      const text = 'Short';
      const cursor = 1000; // way beyond

      const result = extractContextBeforeCursor(text, cursor, {
        ...defaultSettings,
        adjustToBoundary: false,
      });

      expect(result).toBe('Short');
    });

    it('handles negative cursor gracefully', () => {
      const text = 'Hello';
      const cursor = -5;

      const result = extractContextBeforeCursor(text, cursor, {
        ...defaultSettings,
        adjustToBoundary: false,
      });

      expect(result).toBe('');
    });
  });
});

/**
 * Skip by Length Tests
 *
 * Spec: minContextLength (default: 5) – Minimum characters required to trigger a suggestion.
 * Uses TRIMMED length for comparison.
 */
describe('shouldSkipByLength', () => {
  it('skips when trimmed length is below minimum', () => {
    expect(shouldSkipByLength('ab', 5)).toBe(true);     // 2 < 5
    expect(shouldSkipByLength('  ab  ', 5)).toBe(true); // trimmed "ab" = 2 < 5
  });

  it('does NOT skip when trimmed length meets minimum', () => {
    expect(shouldSkipByLength('hello', 5)).toBe(false);     // 5 >= 5
    expect(shouldSkipByLength('  hello  ', 5)).toBe(false); // trimmed "hello" = 5 >= 5
  });

  it('does NOT skip when trimmed length exceeds minimum', () => {
    expect(shouldSkipByLength('hello world', 5)).toBe(false); // 11 >= 5
  });
});

/**
 * Skip by Conditions Tests
 *
 * Spec (Section 4, Skip rules):
 * - skipIfEmpty: trimmed input is empty
 * - skipIfEmojiOnly: trimmed input contains only emoji, variation selectors or whitespace
 * - skipIfUrlOnly: trimmed input matches URL-like pattern (https://... or http://...)
 */
describe('shouldSkipByConditions', () => {
  describe('skipIfEmpty', () => {
    const skip = { skipIfEmpty: true, skipIfEmojiOnly: false, skipIfUrlOnly: false };

    it('skips empty string', () => {
      expect(shouldSkipByConditions('', skip)).toBe(true);
    });

    it('skips whitespace-only string', () => {
      expect(shouldSkipByConditions('   ', skip)).toBe(true);
      expect(shouldSkipByConditions('\t\n', skip)).toBe(true);
    });

    it('does NOT skip when text has content', () => {
      expect(shouldSkipByConditions('hello', skip)).toBe(false);
    });
  });

  describe('skipIfEmojiOnly', () => {
    const skip = { skipIfEmpty: false, skipIfEmojiOnly: true, skipIfUrlOnly: false };

    it('skips single emoji', () => {
      expect(shouldSkipByConditions('😊', skip)).toBe(true);
    });

    it('skips multiple emoji', () => {
      expect(shouldSkipByConditions('😊🎉👍', skip)).toBe(true);
    });

    it('skips emoji with whitespace', () => {
      expect(shouldSkipByConditions('  😊  ', skip)).toBe(true);
    });

    it('does NOT skip when text contains letters', () => {
      expect(shouldSkipByConditions('hello 😊', skip)).toBe(false);
      expect(shouldSkipByConditions('😊 hello', skip)).toBe(false);
    });
  });

  describe('skipIfUrlOnly', () => {
    const skip = { skipIfEmpty: false, skipIfEmojiOnly: false, skipIfUrlOnly: true };

    it('skips https URL', () => {
      expect(shouldSkipByConditions('https://example.com', skip)).toBe(true);
    });

    it('skips http URL', () => {
      expect(shouldSkipByConditions('http://example.com', skip)).toBe(true);
    });

    it('does NOT skip domain without protocol', () => {
      // Per spec: URL-like means "https://..." or "http://..."
      expect(shouldSkipByConditions('example.com', skip)).toBe(false);
      expect(shouldSkipByConditions('www.example.com', skip)).toBe(false);
    });

    it('does NOT skip URL with surrounding text', () => {
      expect(shouldSkipByConditions('Check out https://example.com', skip)).toBe(false);
    });
  });

  describe('combined conditions', () => {
    const skipAll = { skipIfEmpty: true, skipIfEmojiOnly: true, skipIfUrlOnly: true };

    it('skips when any condition matches', () => {
      expect(shouldSkipByConditions('', skipAll)).toBe(true);
      expect(shouldSkipByConditions('😊', skipAll)).toBe(true);
      expect(shouldSkipByConditions('https://x.com', skipAll)).toBe(true);
    });

    it('does NOT skip normal text', () => {
      expect(shouldSkipByConditions('Hello world', skipAll)).toBe(false);
      expect(shouldSkipByConditions('I am happy 😊', skipAll)).toBe(false);
    });
  });
});

// ============================================================
// Sentence-based context extraction (ADR 0007)
// ============================================================

describe('extractContextAroundCursor (sentence mode)', () => {
  const defaultSettings = {
    beforeSentenceCount: 2,
    afterSentenceCount: 1,
    cursorMarker: '[CURSOR]',
  };

  describe('basic extraction', () => {
    it('extracts partial sentences around cursor', () => {
      const text = 'Hello world';
      const cursor = 5; // "Hello|world"

      const result = extractContextAroundCursor(text, cursor, defaultSettings);

      expect(result.contextWithMarker).toBe('Hello[CURSOR] world');
      expect(result.contextWithoutMarker).toBe('Hello world');
    });

    it('handles cursor at the end of text', () => {
      const text = 'First. Second. Third.';
      const cursor = text.length;

      const result = extractContextAroundCursor(text, cursor, defaultSettings);

      // beforeSentenceCount=2: includes last 2 complete sentences before cursor
      // Text ends with ".", so all sentences are complete. "Third." is the last,
      // "Second." is before it, so we get " Second. Third."
      expect(result.contextWithMarker).toBe(' Second. Third.[CURSOR]');
      expect(result.contextWithoutMarker).toBe(' Second. Third.');
    });

    it('handles cursor at the beginning of text', () => {
      const text = 'First. Second.';
      const cursor = 0;

      const result = extractContextAroundCursor(text, cursor, defaultSettings);

      // afterSentenceCount=1: includes first complete sentence after cursor
      // "First." is the first complete sentence
      expect(result.contextWithMarker).toBe('[CURSOR]First. Second.');
      expect(result.contextWithoutMarker).toBe('First. Second.');
    });

    it('handles empty text', () => {
      const text = '';
      const cursor = 0;

      const result = extractContextAroundCursor(text, cursor, defaultSettings);

      expect(result.contextWithMarker).toBe('[CURSOR]');
      expect(result.contextWithoutMarker).toBe('');
    });
  });

  describe('sentence count limits', () => {
    it('limits sentences before cursor', () => {
      const text = 'A. B. C. D. E';
      const cursor = text.length;

      const result = extractContextAroundCursor(text, cursor, {
        ...defaultSettings,
        beforeSentenceCount: 2,
        afterSentenceCount: 0,
      });

      // "E" is partial (no terminator), "D." and "C." are the 2 complete sentences before it
      // The algorithm includes the space after "." as part of sentence splitting
      expect(result.contextWithMarker).toBe(' C. D. E[CURSOR]');
    });

    it('limits sentences after cursor when beforeSentenceCount is 0', () => {
      const text = 'AB. C. D. E.';
      const cursor = 1; // A|B. C. D. E.

      const result = extractContextAroundCursor(text, cursor, {
        beforeSentenceCount: 0,
        afterSentenceCount: 1,
        cursorMarker: '[CURSOR]',
      });

      // Before: "A" (partial, no complete sentences)
      // After: "B." (partial including terminator) + "C." (1 complete sentence)
      expect(result.contextWithMarker).toBe('A[CURSOR]B. C.');
    });

    it('extracts all sentences when count exceeds available', () => {
      const text = 'A. B.';
      const cursor = text.length;

      const result = extractContextAroundCursor(text, cursor, {
        beforeSentenceCount: 10, // More than available
        afterSentenceCount: 10,
        cursorMarker: '[CURSOR]',
      });

      expect(result.contextWithMarker).toBe('A. B.[CURSOR]');
    });
  });

  describe('Japanese boundaries', () => {
    it('handles Japanese period (。)', () => {
      const text = '今日は良い天気です。明日も晴れる';
      const cursor = text.length;

      const result = extractContextAroundCursor(text, cursor, defaultSettings);

      expect(result.contextWithMarker).toBe('今日は良い天気です。明日も晴れる[CURSOR]');
    });

    it('handles cursor in middle of Japanese text', () => {
      const text = '今日は良い天気です。明日も晴れるといいな。';
      const cursor = 10; // After 。

      const result = extractContextAroundCursor(text, cursor, defaultSettings);

      expect(result.contextWithMarker).toContain('[CURSOR]');
      expect(result.contextWithoutMarker).not.toContain('[CURSOR]');
    });
  });

  describe('custom cursor marker', () => {
    it('uses custom marker string', () => {
      const text = 'Hello world';
      const cursor = 5;

      const result = extractContextAroundCursor(text, cursor, {
        ...defaultSettings,
        cursorMarker: '▶',
      });

      expect(result.contextWithMarker).toBe('Hello▶ world');
    });
  });
});

describe('extractContext (unified)', () => {
  const sentenceSettings = DEFAULT_SENTENCE_CONTEXT_SETTINGS;

  it('uses character mode when contextMode is characters', () => {
    const text = 'First sentence. Second sentence. Third sentence.';
    const cursor = text.length;

    const result = extractContext(text, cursor, {
      contextMode: 'characters',
      minContextLength: 5,
      maxContextLength: 200,
      adjustToBoundary: true,
      sentenceContext: sentenceSettings,
    });

    expect(result.isSentenceMode).toBe(false);
    expect(result.contextForPrompt).not.toContain('[CURSOR]');
    // With adjustToBoundary, finds FIRST boundary "." and returns text after it
    // "First sentence. Second sentence. Third sentence." - first "." is at index 14
    // Returns " Second sentence. Third sentence."
    expect(result.contextForPrompt).toBe(' Second sentence. Third sentence.');
  });

  it('uses sentence mode when contextMode is sentences', () => {
    const text = 'First sentence. Second sentence.';
    const cursor = 16; // After "First sentence."

    const result = extractContext(text, cursor, {
      contextMode: 'sentences',
      minContextLength: 5,
      maxContextLength: 200,
      adjustToBoundary: true,
      sentenceContext: sentenceSettings,
    });

    expect(result.isSentenceMode).toBe(true);
    expect(result.contextForPrompt).toContain('[CURSOR]');
    expect(result.contextForValidation).not.toContain('[CURSOR]');
  });

  it('contextForPrompt and contextForValidation are same in character mode', () => {
    const text = 'Hello world';
    const cursor = text.length;

    const result = extractContext(text, cursor, {
      contextMode: 'characters',
      minContextLength: 5,
      maxContextLength: 200,
      adjustToBoundary: false,
      sentenceContext: sentenceSettings,
    });

    expect(result.contextForPrompt).toBe(result.contextForValidation);
  });
});
