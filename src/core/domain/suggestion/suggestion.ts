export type Suggestion = string & { readonly __brand: 'Suggestion' };

export function createSuggestion(emoji: string): Suggestion {
  return emoji as Suggestion;
}
