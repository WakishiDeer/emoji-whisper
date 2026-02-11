import type { ContextExtractionSettings, SentenceContextSettings } from '../context/context-extraction';
import { DEFAULT_SENTENCE_CONTEXT_SETTINGS } from '../context/context-extraction';
import type { SkipConditions } from '../suggestion/suggestion-skip-policy';
import type { DisplaySettings } from './display-settings';
import { DEFAULT_DISPLAY_SETTINGS } from './display-settings';
import type { PresetMode } from './preset-mode';
import { isValidPresetMode } from './preset-mode';

export type AcceptKey = 'Tab';

export type UserPreferences = Readonly<{
  enabled: boolean;
  acceptKey: AcceptKey;
  presetMode: PresetMode;
  topK: number;
  temperature: number;
  context: ContextExtractionSettings;
  skip: SkipConditions;
  display: DisplaySettings;
}>;

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
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

export function createUserPreferences(input: UserPreferences): UserPreferences {
  validateContextSettings(input.context);
  validateModelSettings(input);
  if (input.acceptKey !== 'Tab') throw new Error('Invalid acceptKey');
  if (!isValidPresetMode(input.presetMode)) throw new Error('Invalid presetMode');
  return input;
}

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

function validateModelSettings(prefs: UserPreferences): void {
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
