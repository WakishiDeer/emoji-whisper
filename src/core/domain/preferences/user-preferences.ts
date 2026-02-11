import type { ContextExtractionSettings, SentenceContextSettings } from '../context/context-extraction';
import { DEFAULT_SENTENCE_CONTEXT_SETTINGS } from '../context/context-extraction';
import type { SkipConditions } from '../suggestion/suggestion-skip-policy';
import type { DisplaySettings } from './display-settings';
import { DEFAULT_DISPLAY_SETTINGS } from './display-settings';
import type { PresetMode } from './preset-mode';
import { getPresetValues, isValidPresetMode } from './preset-mode';

export type AcceptKey = 'Tab';

/**
 * Plain object shape for UserPreferences data.
 * Used for serialization (toJSON/fromJSON), storage, and postMessage payloads.
 */
export type UserPreferencesInput = Readonly<{
  enabled: boolean;
  acceptKey: AcceptKey;
  presetMode: PresetMode;
  topK: number;
  temperature: number;
  context: ContextExtractionSettings;
  skip: SkipConditions;
  display: DisplaySettings;
}>;

/** Default values used for creating a default UserPreferences instance. */
const DEFAULT_INPUT: UserPreferencesInput = {
  enabled: true,
  acceptKey: 'Tab',
  presetMode: 'balanced',
  topK: 8,
  temperature: 0.7,
  context: {
    contextMode: 'sentences',
    minContextLength: 5,
    maxContextLength: 200,
    adjustToBoundary: true,
    sentenceContext: DEFAULT_SENTENCE_CONTEXT_SETTINGS,
  },
  skip: {
    skipIfEmpty: true,
    skipIfEmojiOnly: true,
    skipIfUrlOnly: false,
  },
  display: DEFAULT_DISPLAY_SETTINGS,
};

/**
 * Domain aggregate: validated, immutable user preferences.
 *
 * Construction is restricted to static factory methods (`create`, `createDefault`,
 * `fromJSON`). The private constructor enforces that every instance has passed
 * domain validation — it is impossible to hold an invalid `UserPreferences`.
 *
 * Immutable updates are performed via `with*()` methods that return new validated
 * instances.
 *
 * See ADR 0014 for design rationale.
 */
export class UserPreferences {
  readonly enabled: boolean;
  readonly acceptKey: AcceptKey;
  readonly presetMode: PresetMode;
  readonly topK: number;
  readonly temperature: number;
  readonly context: ContextExtractionSettings;
  readonly skip: SkipConditions;
  readonly display: DisplaySettings;

  private constructor(input: UserPreferencesInput) {
    validateContextSettings(input.context);
    validateModelSettings(input);
    if (input.acceptKey !== 'Tab') throw new Error('Invalid acceptKey');
    if (!isValidPresetMode(input.presetMode)) throw new Error('Invalid presetMode');

    this.enabled = input.enabled;
    this.acceptKey = input.acceptKey;
    this.presetMode = input.presetMode;
    this.topK = input.topK;
    this.temperature = input.temperature;
    this.context = input.context;
    this.skip = input.skip;
    this.display = input.display;
  }

  // ---------------------------------------------------------------------------
  // Static factories
  // ---------------------------------------------------------------------------

  /** Create a validated UserPreferences from a plain input object. */
  static create(input: UserPreferencesInput): UserPreferences {
    return new UserPreferences(input);
  }

  /** Create a UserPreferences with all default values. */
  static createDefault(): UserPreferences {
    return new UserPreferences(DEFAULT_INPUT);
  }

  /**
   * Deserialize from an unknown source (storage, postMessage).
   * Merges partial data over defaults to handle schema migrations.
   * Returns default preferences if `raw` is not a valid object.
   */
  static fromJSON(raw: unknown): UserPreferences {
    if (!raw || typeof raw !== 'object') return UserPreferences.createDefault();

    try {
      const partial = raw as Partial<UserPreferencesInput>;
      const merged: UserPreferencesInput = {
        ...DEFAULT_INPUT,
        ...partial,
        context: {
          ...DEFAULT_INPUT.context,
          ...(partial.context ?? {}),
          sentenceContext: {
            ...DEFAULT_INPUT.context.sentenceContext,
            ...((partial.context as Record<string, unknown>)?.sentenceContext as
              Record<string, unknown> ?? {}),
          },
        },
        skip: {
          ...DEFAULT_INPUT.skip,
          ...(partial.skip ?? {}),
        },
        display: {
          ...DEFAULT_INPUT.display,
          ...(partial.display ?? {}),
        },
      };
      return new UserPreferences(merged);
    } catch {
      return UserPreferences.createDefault();
    }
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  /** Return a plain serializable object (for storage / postMessage). */
  toJSON(): UserPreferencesInput {
    return {
      enabled: this.enabled,
      acceptKey: this.acceptKey,
      presetMode: this.presetMode,
      topK: this.topK,
      temperature: this.temperature,
      context: this.context,
      skip: this.skip,
      display: this.display,
    };
  }

  // ---------------------------------------------------------------------------
  // Immutable update methods
  // ---------------------------------------------------------------------------

  withEnabled(enabled: boolean): UserPreferences {
    return UserPreferences.create({ ...this.toJSON(), enabled });
  }

  withPresetMode(mode: PresetMode): UserPreferences {
    return UserPreferences.create({ ...this.toJSON(), presetMode: mode });
  }

  withTopK(topK: number): UserPreferences {
    return UserPreferences.create({ ...this.toJSON(), topK, presetMode: 'custom' });
  }

  withTemperature(temperature: number): UserPreferences {
    return UserPreferences.create({ ...this.toJSON(), temperature, presetMode: 'custom' });
  }

  withContext(partial: Partial<ContextExtractionSettings>): UserPreferences {
    return UserPreferences.create({
      ...this.toJSON(),
      context: { ...this.context, ...partial },
      presetMode: 'custom',
    });
  }

  withSentenceContext(partial: Partial<SentenceContextSettings>): UserPreferences {
    return UserPreferences.create({
      ...this.toJSON(),
      context: {
        ...this.context,
        sentenceContext: { ...this.context.sentenceContext, ...partial },
      },
      presetMode: 'custom',
    });
  }

  withSkip(partial: Partial<SkipConditions>): UserPreferences {
    return UserPreferences.create({
      ...this.toJSON(),
      skip: { ...this.skip, ...partial },
      presetMode: 'custom',
    });
  }

  /** Update display settings. Does NOT change presetMode (ADR 0012). */
  withDisplay(partial: Partial<DisplaySettings>): UserPreferences {
    return UserPreferences.create({
      ...this.toJSON(),
      display: { ...this.display, ...partial },
    });
  }

  /** Apply a named preset's values. For 'custom', only changes the mode label. */
  applyPreset(mode: PresetMode): UserPreferences {
    const presetValues = getPresetValues(mode);
    if (presetValues) {
      return UserPreferences.create({
        ...this.toJSON(),
        ...presetValues,
        presetMode: mode,
      });
    }
    // 'custom' — just update the mode label
    return this.withPresetMode(mode);
  }
}

// ---------------------------------------------------------------------------
// Deprecated backward-compatibility exports
// ---------------------------------------------------------------------------

/**
 * @deprecated Use `UserPreferences.createDefault()` instead.
 * Retained for backward compatibility during migration.
 */
export const DEFAULT_USER_PREFERENCES: UserPreferences = UserPreferences.createDefault();

/**
 * @deprecated Use `UserPreferences.create()` instead.
 * Retained for backward compatibility during migration.
 */
export function createUserPreferences(input: UserPreferencesInput): UserPreferences {
  return UserPreferences.create(input);
}

// ---------------------------------------------------------------------------
// Validation (module-private)
// ---------------------------------------------------------------------------

function validateContextSettings(context: ContextExtractionSettings): void {
  if (context.minContextLength <= 0) throw new Error('minContextLength must be > 0');
  if (context.maxContextLength < context.minContextLength) throw new Error('maxContextLength must be >= minContextLength');
  if (context.maxContextLength > 1000) throw new Error('maxContextLength must be <= 1000');

  if (context.contextMode !== 'characters' && context.contextMode !== 'sentences') {
    throw new Error('contextMode must be "characters" or "sentences"');
  }

  if (context.contextMode === 'sentences') {
    validateSentenceContextSettings(context.sentenceContext);
  }
}

function validateModelSettings(prefs: UserPreferencesInput): void {
  if (prefs.topK < 1 || prefs.topK > 40) throw new Error('topK must be between 1 and 40');
  if (!Number.isInteger(prefs.topK)) throw new Error('topK must be an integer');
  if (prefs.temperature < 0.0 || prefs.temperature > 2.0) throw new Error('temperature must be between 0.0 and 2.0');
}

function validateSentenceContextSettings(settings: SentenceContextSettings): void {
  if (settings.beforeSentenceCount < 0) throw new Error('beforeSentenceCount must be >= 0');
  if (settings.afterSentenceCount < 0) throw new Error('afterSentenceCount must be >= 0');
  if (settings.beforeSentenceCount > 10) throw new Error('beforeSentenceCount must be <= 10');
  if (settings.afterSentenceCount > 10) throw new Error('afterSentenceCount must be <= 10');
  if (settings.cursorMarker.length === 0) throw new Error('cursorMarker must not be empty');
  if (settings.cursorMarker.length > 20) throw new Error('cursorMarker must be <= 20 characters');
}
