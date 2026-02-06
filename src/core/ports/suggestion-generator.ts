import type { PromptConfig } from '../services/prompt';
import type { SuggestionResult } from '../domain/suggestion/suggestion';

export interface SuggestionGenerator {
  generateSuggestion(prompt: string, config: PromptConfig, signal?: AbortSignal): Promise<SuggestionResult>;
}
