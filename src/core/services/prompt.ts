export type PromptConfig = Readonly<{
  systemPromptTemplate: string;
  maxTokens: number;
  temperature: number;
  /**
   * Some LanguageModel API implementations require specifying an output language.
   * Keep values constrained for predictable behavior.
   */
  outputLanguage?: 'en' | 'es' | 'ja';
}>;

export const DEFAULT_PROMPT_CONFIG: PromptConfig = {
  systemPromptTemplate:
    'You are an assistant that returns exactly one emoji. Output must be a single emoji character and nothing else.',
  maxTokens: 10,
  temperature: 0.7,
  outputLanguage: 'en',
};

/**
 * Build a prompt for emoji suggestion.
 * @param context The extracted context (may contain a cursor marker in sentence mode).
 * @param config Prompt configuration.
 * @param isSentenceMode Whether the context was extracted in sentence mode (contains cursor marker).
 */
export function buildEmojiPrompt(context: string, config: PromptConfig, isSentenceMode = false): string {
  if (isSentenceMode) {
    return [
      config.systemPromptTemplate,
      '',
      'Text:',
      context,
      '',
      'Return exactly one emoji that best fits the position marked by [CURSOR].',
    ].join('\n');
  }

  return [
    config.systemPromptTemplate,
    '',
    'Text:',
    context,
    '',
    'Return exactly one emoji that best matches the tone/sentiment of the text.',
  ].join('\n');
}
