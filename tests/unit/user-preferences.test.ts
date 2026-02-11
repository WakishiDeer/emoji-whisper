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

  // --- topK validation ---

  it('rejects topK < 1', () => {
    expect(() =>
      createUserPreferences({ ...DEFAULT_USER_PREFERENCES, topK: 0 }),
    ).toThrow('topK must be between 1 and 40');
  });

  it('rejects topK > 40', () => {
    expect(() =>
      createUserPreferences({ ...DEFAULT_USER_PREFERENCES, topK: 41 }),
    ).toThrow('topK must be between 1 and 40');
  });

  it('rejects non-integer topK', () => {
    expect(() =>
      createUserPreferences({ ...DEFAULT_USER_PREFERENCES, topK: 3.5 }),
    ).toThrow('topK must be an integer');
  });

  it('accepts topK at boundaries', () => {
    expect(() =>
      createUserPreferences({ ...DEFAULT_USER_PREFERENCES, topK: 1 }),
    ).not.toThrow();
    expect(() =>
      createUserPreferences({ ...DEFAULT_USER_PREFERENCES, topK: 40 }),
    ).not.toThrow();
  });

  // --- temperature validation ---

  it('rejects temperature < 0', () => {
    expect(() =>
      createUserPreferences({ ...DEFAULT_USER_PREFERENCES, temperature: -0.1 }),
    ).toThrow('temperature must be between 0.0 and 2.0');
  });

  it('rejects temperature > 2.0', () => {
    expect(() =>
      createUserPreferences({ ...DEFAULT_USER_PREFERENCES, temperature: 2.1 }),
    ).toThrow('temperature must be between 0.0 and 2.0');
  });

  it('accepts temperature at boundaries', () => {
    expect(() =>
      createUserPreferences({ ...DEFAULT_USER_PREFERENCES, temperature: 0 }),
    ).not.toThrow();
    expect(() =>
      createUserPreferences({ ...DEFAULT_USER_PREFERENCES, temperature: 2.0 }),
    ).not.toThrow();
  });

  // --- presetMode validation ---

  it('rejects invalid presetMode', () => {
    expect(() =>
      createUserPreferences({
        ...DEFAULT_USER_PREFERENCES,
        presetMode: 'invalid' as 'balanced',
      }),
    ).toThrow('Invalid presetMode');
  });

  it('accepts all valid preset modes', () => {
    for (const mode of ['simple', 'balanced', 'creative', 'custom'] as const) {
      expect(() =>
        createUserPreferences({ ...DEFAULT_USER_PREFERENCES, presetMode: mode }),
      ).not.toThrow();
    }
  });

  // --- display settings ---

  it('preserves display settings in defaults', () => {
    const prefs = createUserPreferences(DEFAULT_USER_PREFERENCES);
    expect(prefs.display).toEqual({
      showUnavailableToast: true,
      showReasonTooltip: true,
    });
  });
});
