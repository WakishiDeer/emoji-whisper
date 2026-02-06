import { describe, expect, it } from 'vitest';

import { parseSuggestionFromModelOutput } from '../../src/core/domain/suggestion/suggestion-parser';

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
