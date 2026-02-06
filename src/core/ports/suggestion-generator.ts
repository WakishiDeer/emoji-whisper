import type { PromptConfig } from '../services/prompt';
import type { Suggestion } from '../domain/suggestion/suggestion';

export interface SuggestionGenerator {
  generateSuggestion(prompt: string, config: PromptConfig, signal?: AbortSignal): Promise<Suggestion>;
}
