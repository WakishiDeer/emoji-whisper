import { describe, expect, it } from 'vitest';

import { parseSuggestionFromModelOutput, parseSuggestionResultFromModelOutput } from '../../src/core/domain/suggestion/suggestion-parser';

describe('parseSuggestionFromModelOutput', () => {
  it('accepts a single emoji', () => {
    const s = parseSuggestionFromModelOutput('😊');
    expect(s).toBeTruthy();
  });

  it('rejects empty output', () => {
    expect(parseSuggestionFromModelOutput('')).toBeNull();
    expect(parseSuggestionFromModelOutput('   ')).toBeNull();
  });

  it('rejects multiple graphemes', () => {
    expect(parseSuggestionFromModelOutput('😊😊')).toBeNull();
    expect(parseSuggestionFromModelOutput('😊 👍')).toBeNull();
  });

  it('rejects obvious text', () => {
    expect(parseSuggestionFromModelOutput('ok')).toBeNull();
    expect(parseSuggestionFromModelOutput('A')).toBeNull();
    expect(parseSuggestionFromModelOutput('1')).toBeNull();
  });
});

describe('parseSuggestionResultFromModelOutput', () => {
  it('parses valid JSON with emoji and reason', () => {
    const result = parseSuggestionResultFromModelOutput('{ "reason": "Mentions playing guitar", "emoji": "🎸" }');
    expect(result).not.toBeNull();
    expect(result!.emoji).toBe('🎸');
    expect(result!.reason).toBe('Mentions playing guitar');
  });

  it('parses JSON with fields in any order', () => {
    const result = parseSuggestionResultFromModelOutput('{"emoji":"🍕","reason":"Directly mentions pizza"}');
    expect(result).not.toBeNull();
    expect(result!.emoji).toBe('🍕');
    expect(result!.reason).toBe('Directly mentions pizza');
  });

  it('falls back to bare emoji when JSON is invalid', () => {
    const result = parseSuggestionResultFromModelOutput('😊');
    expect(result).not.toBeNull();
    expect(result!.emoji).toBe('😊');
    expect(result!.reason).toBe('(no reason provided)');
  });

  it('returns null for empty output', () => {
    expect(parseSuggestionResultFromModelOutput('')).toBeNull();
    expect(parseSuggestionResultFromModelOutput('   ')).toBeNull();
  });

  it('returns null for JSON with invalid emoji', () => {
    expect(parseSuggestionResultFromModelOutput('{"emoji":"hello","reason":"test"}')).toBeNull();
  });

  it('returns null for JSON without emoji field', () => {
    expect(parseSuggestionResultFromModelOutput('{"reason":"test"}')).toBeNull();
  });

  it('handles JSON with empty reason', () => {
    const result = parseSuggestionResultFromModelOutput('{"emoji":"🚀","reason":""}');
    expect(result).not.toBeNull();
    expect(result!.emoji).toBe('🚀');
    expect(result!.reason).toBe('(no reason provided)');
  });

  it('handles JSON with missing reason field', () => {
    const result = parseSuggestionResultFromModelOutput('{"emoji":"🚀"}');
    expect(result).not.toBeNull();
    expect(result!.emoji).toBe('🚀');
    expect(result!.reason).toBe('(no reason provided)');
  });
});
