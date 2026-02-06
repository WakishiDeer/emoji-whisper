import type { Context } from '../domain/context/context';
import type { Suggestion } from '../domain/suggestion/suggestion';
import type { SkipReason } from '../domain/suggestion/suggestion-session';

export type SuggestionEvent =
  | { type: 'SuggestionRequested'; context: Context }
  | { type: 'SuggestionGenerated'; suggestion: Suggestion }
  | { type: 'SuggestionShown'; suggestion: Suggestion }
  | { type: 'SuggestionAccepted'; suggestion: Suggestion }
  | { type: 'SuggestionDismissed' }
  | { type: 'SuggestionSkipped'; reason: SkipReason }
  | { type: 'SuggestionFailed' };
