export type PromptConfig = Readonly<{
  systemPromptTemplate: string;
  maxTokens: number;
  temperature: number;
  /**
   * Controls how many top-probability tokens the model considers at each step.
   * Lower values (e.g. 3) restrict diversity; higher values (e.g. 8–40) allow
   * the model to pick from a wider set of candidates.
   * Chrome Prompt API default varies by implementation; our default is 8.
   */
  topK: number;
  /**
   * Some LanguageModel API implementations require specifying an output language.
   * Keep values constrained for predictable behavior.
   */
  outputLanguage?: 'en' | 'es' | 'ja';
}>;

export const DEFAULT_PROMPT_CONFIG: PromptConfig = {
  systemPromptTemplate: [
    'You are an assistant that returns exactly one emoji. Output must be a single emoji character and nothing else.',
    'If the text mentions a specific object, animal, food, activity, or place, prefer the emoji that directly represents it.',
    'If the text is a single word or short phrase, pick the emoji that most directly represents it.',
    'If no emoji directly represents the concept, pick the closest metaphorical match.',
    'Only fall back to a general sentiment/mood emoji when nothing specific is mentioned.',
    '',
    'Examples:',
    '"I am playing guitar with friends" → 🎸',
    '"I am so happy today" → 😊',
    '"pizza" → 🍕',
    '"rocket" → 🚀',
    '"debugging the code" → 🐛',
    '"shipped to production" → 📦',
    '"feeling overwhelmed" → 😵‍💫',
    '"so proud of you" → 🏆',
    '"good morning" → ☀️',
    '"happy birthday" → 🎂',
    '"meeting at 3pm" → 📅',
    '"working from home" → 🏠',
  ].join('\n'),
  maxTokens: 10,
  temperature: 0.7,
  topK: 8,
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
      'Return exactly one emoji that best fits the position marked by [CURSOR]. Prefer a specific emoji over a generic sentiment emoji.',
    ].join('\n');
  }

  return [
    config.systemPromptTemplate,
    '',
    'Text:',
    context,
    '',
    'Return exactly one emoji that best represents the text. Prefer a specific emoji over a generic sentiment emoji.',
  ].join('\n');
}
