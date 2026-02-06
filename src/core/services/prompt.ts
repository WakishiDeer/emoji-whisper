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
    'You are an emoji suggestion engine. Given user text, choose the best single emoji and explain your reasoning.',
    'Rules:',
    '- "emoji" MUST contain exactly one emoji character.',
    '- "reason" MUST be one short English sentence explaining why this emoji fits, under 15 words.',
    '- If the text mentions a specific object, animal, food, activity, or place, prefer the emoji that directly represents it.',
    '- If the text is a single word or short phrase, pick the emoji that most directly represents it.',
    '- If no emoji directly represents the concept, pick the closest metaphorical match.',
    '- Only fall back to a general sentiment/mood emoji when nothing specific is mentioned.',
    '',
    'Examples:',
    '"I am playing guitar with friends" → { "reason": "Mentions playing guitar", "emoji": "🎸" }',
    '"I am so happy today" → { "reason": "Expresses joy and happiness", "emoji": "😊" }',
    '"pizza" → { "reason": "Directly mentions pizza", "emoji": "🍕" }',
    '"rocket" → { "reason": "Directly represents a rocket", "emoji": "🚀" }',
    '"debugging the code" → { "reason": "Debugging is associated with bugs", "emoji": "🐛" }',
    '"shipped to production" → { "reason": "Shipping implies a package or delivery", "emoji": "📦" }',
    '"feeling overwhelmed" → { "reason": "Overwhelmed feeling shown as dizzy face", "emoji": "😵‍💫" }',
    '"so proud of you" → { "reason": "Pride is associated with achievement", "emoji": "🏆" }',
    '"good morning" → { "reason": "Morning greeting associated with sunrise", "emoji": "☀️" }',
    '"happy birthday" → { "reason": "Birthday celebration with cake", "emoji": "🎂" }',
    '"meeting at 3pm" → { "reason": "Scheduling implies a calendar", "emoji": "📅" }',
    '"working from home" → { "reason": "Working from home implies a house", "emoji": "🏠" }',
  ].join('\n'),
  maxTokens: 64,
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
      'The emoji should best fit the position marked by [CURSOR]. Prefer a specific emoji over a generic sentiment emoji.',
    ].join('\n');
  }

  return [
    config.systemPromptTemplate,
    '',
    'Text:',
    context,
    '',
    'The emoji should best represent the text. Prefer a specific emoji over a generic sentiment emoji.',
  ].join('\n');
}
