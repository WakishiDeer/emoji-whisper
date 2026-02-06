export type Suggestion = string & { readonly __brand: 'Suggestion' };

export function createSuggestion(emoji: string): Suggestion {
  return emoji as Suggestion;
}

/**
 * Composite value object: an emoji suggestion together with the model's reasoning.
 * The `reason` is a short English sentence explaining why the emoji was chosen.
 */
export type SuggestionResult = Readonly<{
  emoji: Suggestion;
  reason: string;
}>;

const DEFAULT_REASON = '(no reason provided)';

export function createSuggestionResult(emoji: string, reason?: string): SuggestionResult {
  return {
    emoji: createSuggestion(emoji),
    reason: reason?.trim() || DEFAULT_REASON,
  };
}
