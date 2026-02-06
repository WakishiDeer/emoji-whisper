import {
  extractContext,
  shouldSkipByConditions,
  shouldSkipByLength,
  type ContextExtractionSettings,
  type SkipConditions,
} from './context';
import { buildEmojiPrompt, type PromptConfig } from './prompt';
import { createContext, type Context } from '../domain/context/context';
import { hashContextDjb2, type ContextHash } from '../domain/context/context-hash';
import type { SkipReason } from '../domain/suggestion/suggestion-session';

export type SuggestionInputSnapshot = Readonly<{
  isSupportedInput: boolean;
  hasFocus: boolean;
  isComposing: boolean;
  hasCollapsedSelection: boolean;
  fullText: string;
  cursorIndex: number;
}>;

export type SuggestionAttemptPreparation =
  | { kind: 'skip'; reason: SkipReason }
  | {
    kind: 'ready';
    context: Context;
    contextHash: ContextHash;
    prompt: string;
  };

export function prepareSuggestionAttempt(params: {
  snapshot: SuggestionInputSnapshot;
  settings: ContextExtractionSettings;
  skip: SkipConditions;
  promptConfig: PromptConfig;
}): SuggestionAttemptPreparation {
  const { snapshot, settings, skip, promptConfig } = params;

  if (!snapshot.isSupportedInput) return { kind: 'skip', reason: 'not-supported' };
  if (!snapshot.hasFocus) return { kind: 'skip', reason: 'not-focused' };
  if (snapshot.isComposing) return { kind: 'skip', reason: 'composing' };
  if (!snapshot.hasCollapsedSelection) return { kind: 'skip', reason: 'selection' };

  const extraction = extractContext(snapshot.fullText, snapshot.cursorIndex, settings);
  const context = createContext(extraction.contextForValidation);

  if (shouldSkipByLength(context, settings.minContextLength)) return { kind: 'skip', reason: 'too-short' };
  if (shouldSkipByConditions(context, skip)) return { kind: 'skip', reason: 'conditions' };

  const contextHash = hashContextDjb2(context);
  const prompt = buildEmojiPrompt(extraction.contextForPrompt, promptConfig, extraction.isSentenceMode);

  return { kind: 'ready', context, contextHash, prompt };
}
