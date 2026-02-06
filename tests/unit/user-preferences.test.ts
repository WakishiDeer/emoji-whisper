import { describe, expect, it } from 'vitest';

import {
  createUserPreferences,
  DEFAULT_USER_PREFERENCES,
} from '../../src/core/domain/preferences/user-preferences';

describe('createUserPreferences', () => {
  it('accepts valid preferences', () => {
    expect(() => createUserPreferences(DEFAULT_USER_PREFERENCES)).not.toThrow();
  });

  it('rejects unsupported acceptKey', () => {
    expect(() =>
      createUserPreferences({
        ...DEFAULT_USER_PREFERENCES,
        acceptKey: 'Enter' as 'Tab',
      }),
    ).toThrow('Invalid acceptKey');
  });

  it('rejects invalid context settings', () => {
    expect(() =>
      createUserPreferences({
        ...DEFAULT_USER_PREFERENCES,
        context: {
          ...DEFAULT_USER_PREFERENCES.context,
          minContextLength: 0,
        },
      }),
    ).toThrow('minContextLength must be > 0');

    expect(() =>
      createUserPreferences({
        ...DEFAULT_USER_PREFERENCES,
        context: {
          ...DEFAULT_USER_PREFERENCES.context,
          minContextLength: 10,
          maxContextLength: 5,
        },
      }),
    ).toThrow('maxContextLength must be >= minContextLength');

    expect(() =>
      createUserPreferences({
        ...DEFAULT_USER_PREFERENCES,
        context: {
          ...DEFAULT_USER_PREFERENCES.context,
          maxContextLength: 2000,
        },
      }),
    ).toThrow('maxContextLength must be <= 1000');
  });

  it('rejects invalid contextMode', () => {
    expect(() =>
      createUserPreferences({
        ...DEFAULT_USER_PREFERENCES,
        context: {
          ...DEFAULT_USER_PREFERENCES.context,
          contextMode: 'invalid' as 'sentences',
        },
      }),
    ).toThrow('contextMode must be "characters" or "sentences"');
  });

  it('rejects negative beforeSentenceCount', () => {
    expect(() =>
      createUserPreferences({
        ...DEFAULT_USER_PREFERENCES,
        context: {
          ...DEFAULT_USER_PREFERENCES.context,
          sentenceContext: {
            ...DEFAULT_USER_PREFERENCES.context.sentenceContext,
            beforeSentenceCount: -1,
          },
        },
      }),
    ).toThrow('beforeSentenceCount must be >= 0');
  });

  it('rejects beforeSentenceCount > 10', () => {
    expect(() =>
      createUserPreferences({
        ...DEFAULT_USER_PREFERENCES,
        context: {
          ...DEFAULT_USER_PREFERENCES.context,
          sentenceContext: {
            ...DEFAULT_USER_PREFERENCES.context.sentenceContext,
            beforeSentenceCount: 11,
          },
        },
      }),
    ).toThrow('beforeSentenceCount must be <= 10');
  });

  it('rejects negative afterSentenceCount', () => {
    expect(() =>
      createUserPreferences({
        ...DEFAULT_USER_PREFERENCES,
        context: {
          ...DEFAULT_USER_PREFERENCES.context,
          sentenceContext: {
            ...DEFAULT_USER_PREFERENCES.context.sentenceContext,
            afterSentenceCount: -1,
          },
        },
      }),
    ).toThrow('afterSentenceCount must be >= 0');
  });

  it('rejects afterSentenceCount > 10', () => {
    expect(() =>
      createUserPreferences({
        ...DEFAULT_USER_PREFERENCES,
        context: {
          ...DEFAULT_USER_PREFERENCES.context,
          sentenceContext: {
            ...DEFAULT_USER_PREFERENCES.context.sentenceContext,
            afterSentenceCount: 11,
          },
        },
      }),
    ).toThrow('afterSentenceCount must be <= 10');
  });

  it('rejects empty cursorMarker', () => {
    expect(() =>
      createUserPreferences({
        ...DEFAULT_USER_PREFERENCES,
        context: {
          ...DEFAULT_USER_PREFERENCES.context,
          sentenceContext: {
            ...DEFAULT_USER_PREFERENCES.context.sentenceContext,
            cursorMarker: '',
          },
        },
      }),
    ).toThrow('cursorMarker must not be empty');
  });

  it('rejects cursorMarker > 20 characters', () => {
    expect(() =>
      createUserPreferences({
        ...DEFAULT_USER_PREFERENCES,
        context: {
          ...DEFAULT_USER_PREFERENCES.context,
          sentenceContext: {
            ...DEFAULT_USER_PREFERENCES.context.sentenceContext,
            cursorMarker: 'A'.repeat(21),
          },
        },
      }),
    ).toThrow('cursorMarker must be <= 20 characters');
  });

  it('skips sentence validation when contextMode is characters', () => {
    // Should not throw even with invalid-looking sentence settings
    // because sentence mode is not active
    expect(() =>
      createUserPreferences({
        ...DEFAULT_USER_PREFERENCES,
        context: {
          ...DEFAULT_USER_PREFERENCES.context,
          contextMode: 'characters',
        },
      }),
    ).not.toThrow();
  });
});
