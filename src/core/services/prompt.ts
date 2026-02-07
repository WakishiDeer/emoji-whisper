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
    '- When a [CURSOR] marker is present, the emoji MUST fit the context immediately surrounding [CURSOR]. Analyze what comes before AND after [CURSOR] to choose an emoji that belongs at that exact position.',
    '- In "reason", mention what context before and/or after the cursor influenced your choice.',
    '',
    'Examples (short input without cursor):',
    '"pizza" → { "reason": "Directly mentions pizza", "emoji": "🍕" }',
    '"rocket" → { "reason": "Directly represents a rocket", "emoji": "🚀" }',
    '',
    'Examples (end-of-text with [CURSOR]):',
    '"I am playing guitar with friends [CURSOR]" → { "reason": "Before cursor: playing guitar — directly represents a guitar", "emoji": "🎸" }',
    '"I am so happy today [CURSOR]" → { "reason": "Before cursor: so happy — expresses joy and happiness", "emoji": "😊" }',
    '"debugging the code [CURSOR]" → { "reason": "Before cursor: debugging — associated with bugs", "emoji": "🐛" }',
    '"shipped to production [CURSOR]" → { "reason": "Before cursor: shipped — implies a package or delivery", "emoji": "📦" }',
    '"feeling overwhelmed [CURSOR]" → { "reason": "Before cursor: overwhelmed — shown as dizzy face", "emoji": "😵‍💫" }',
    '"so proud of you [CURSOR]" → { "reason": "Before cursor: proud — associated with achievement", "emoji": "🏆" }',
    '"good morning [CURSOR]" → { "reason": "Before cursor: morning — greeting associated with sunrise", "emoji": "☀️" }',
    '"happy birthday [CURSOR]" → { "reason": "Before cursor: birthday — celebration with cake", "emoji": "🎂" }',
    '"meeting at 3pm [CURSOR]" → { "reason": "Before cursor: meeting at 3pm — scheduling implies a calendar", "emoji": "📅" }',
    '"working from home [CURSOR]" → { "reason": "Before cursor: from home — implies a house", "emoji": "🏠" }',
    '',
    'Examples (mid-text with [CURSOR]):',
    '"I went to the [CURSOR] and bought some fresh fish." → { "reason": "Before: went to, after: bought fish — implies a market", "emoji": "🏪" }',
    '"The [CURSOR] was barking all night. I could not sleep." → { "reason": "Before: The, after: was barking — the subject is a dog", "emoji": "🐕" }',
    '"We celebrated with [CURSOR] and dancing until midnight." → { "reason": "Before: celebrated with, after: and dancing — implies music", "emoji": "🎶" }',
    '"She opened the [CURSOR] and started reading chapter one." → { "reason": "Before: opened the, after: started reading — the object is a book", "emoji": "📖" }',
    '"After the long hike we relaxed by the [CURSOR] and roasted marshmallows." → { "reason": "Before: relaxed by the, after: roasted marshmallows — implies campfire", "emoji": "🔥" }',
  ].join('\n'),
  maxTokens: 64,
  temperature: 0.4,
  topK: 5,
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
      'The emoji should best fit the position marked by [CURSOR]. Analyze the words before and after [CURSOR] carefully. Prefer a specific emoji over a generic sentiment emoji.',
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
