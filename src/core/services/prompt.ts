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
  outputLanguage?: 'en' | 'ja';
}>;

// ---------------------------------------------------------------------------
// Few-shot example sections (module-private)
// ---------------------------------------------------------------------------

const EXAMPLES_SHORT = [
  'Examples (short input without cursor):',
  '"pizza" → { "reason": "Directly mentions pizza", "emoji": "🍕" }',
  '"rocket" → { "reason": "Directly represents a rocket", "emoji": "🚀" }',
].join('\n');

const EXAMPLES_END_OF_TEXT = [
  'Examples (end-of-text with [CURSOR]):',
  '"I am playing guitar with friends [CURSOR]" → { "reason": "Immediately before cursor: friends, guitar — directly represents a guitar", "emoji": "🎸" }',
  '"debugging the code [CURSOR]" → { "reason": "Immediately before cursor: debugging code — associated with bugs", "emoji": "🐛" }',
  '"feeling overwhelmed [CURSOR]" → { "reason": "Immediately before cursor: overwhelmed — shown as dizzy face", "emoji": "😵‍💫" }',
  '"happy birthday [CURSOR]" → { "reason": "Immediately before cursor: birthday — celebration with cake", "emoji": "🎂" }',
  '"working from home [CURSOR]" → { "reason": "Immediately before cursor: home — implies a house", "emoji": "🏠" }',
].join('\n');

const EXAMPLES_BEGINNING_OF_TEXT = [
  'Examples (beginning-of-text with [CURSOR]):',
  '"[CURSOR] keeps meowing at the door." → { "reason": "Immediately after cursor: keeps meowing — subject is a cat", "emoji": "🐱" }',
  '"[CURSOR] bloomed beautifully in the garden this spring." → { "reason": "Immediately after cursor: bloomed, garden, spring — flowers blooming", "emoji": "🌸" }',
  '"[CURSOR] started raining so we went inside." → { "reason": "Immediately after cursor: started raining — rain weather", "emoji": "🌧️" }',
  '"[CURSOR] scored the winning goal in the last minute." → { "reason": "Immediately after cursor: scored winning goal — soccer/football", "emoji": "⚽" }',
  '"[CURSOR] landed safely after a 12-hour flight." → { "reason": "Immediately after cursor: landed, flight — airplane", "emoji": "✈️" }',
].join('\n');

const EXAMPLES_MID_TEXT = [
  'Examples (mid-text with [CURSOR]):',
  '"I went to the [CURSOR] and bought some fresh fish." → { "reason": "Immediately before: to the, immediately after: and bought — market fits buying fish", "emoji": "🏪" }',
  '"The [CURSOR] was barking all night. I could not sleep." → { "reason": "Immediately before: The, immediately after: was barking — subject is a dog", "emoji": "🐕" }',
  '"We celebrated with [CURSOR] and dancing until midnight." → { "reason": "Immediately before: with, immediately after: and dancing — implies music", "emoji": "🎶" }',
  '"She opened the [CURSOR] and started reading chapter one." → { "reason": "Immediately before: opened the, immediately after: started reading — object is a book", "emoji": "📖" }',
  '"After the long hike we relaxed by the [CURSOR] and roasted marshmallows." → { "reason": "Immediately before: by the, immediately after: and roasted — campfire for marshmallows", "emoji": "🔥" }',
].join('\n');

// ---------------------------------------------------------------------------
// System prompt (rules only — examples are injected dynamically)
// ---------------------------------------------------------------------------

const SYSTEM_RULES = [
  'You are an emoji suggestion engine. Given user text, return the single best emoji with a short reason.',
  'Rules:',
  '- "emoji": exactly one emoji character.',
  '- "reason": one English sentence under 15 words explaining why this emoji fits.',
  '- Pick the emoji that most directly represents what the text describes. Only fall back to a mood emoji when nothing specific is mentioned.',
  '- When [CURSOR] is present, focus on the words immediately adjacent to [CURSOR] — they are the strongest clues.',
  '- In "reason", cite which words near [CURSOR] influenced your choice. ONLY reference words that actually appear in the provided Text, never words from the examples.',
].join('\n');

export const DEFAULT_PROMPT_CONFIG: PromptConfig = {
  systemPromptTemplate: SYSTEM_RULES,
  maxTokens: 64,
  temperature: 0.4,
  topK: 5,
  outputLanguage: 'en',
};

// ---------------------------------------------------------------------------
// Cursor-position detection (module-private)
// ---------------------------------------------------------------------------

const CURSOR_MARKER = '[CURSOR]';

type CursorPosition = 'beginning' | 'end' | 'mid';

function detectCursorPosition(context: string): CursorPosition {
  const trimmed = context.trim();
  if (trimmed.startsWith(CURSOR_MARKER)) return 'beginning';
  if (trimmed.endsWith(CURSOR_MARKER)) return 'end';
  return 'mid';
}

function examplesForCursorPosition(position: CursorPosition): string {
  switch (position) {
    case 'beginning':
      return EXAMPLES_BEGINNING_OF_TEXT;
    case 'end':
      return EXAMPLES_END_OF_TEXT;
    case 'mid':
      return EXAMPLES_MID_TEXT;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a prompt for emoji suggestion.
 *
 * In sentence mode the prompt includes only the few-shot section matching the
 * detected cursor position (beginning / end / mid) to minimise token overhead
 * and reduce contamination from unrelated example vocabulary.
 *
 * In character mode (no cursor) only the short-input examples are included.
 *
 * @param context The extracted context (may contain a cursor marker in sentence mode).
 * @param config Prompt configuration.
 * @param isSentenceMode Whether the context was extracted in sentence mode (contains cursor marker).
 */
export function buildEmojiPrompt(context: string, config: PromptConfig, isSentenceMode = false): string {
  if (isSentenceMode) {
    const position = detectCursorPosition(context);
    const examples = examplesForCursorPosition(position);
    return [
      config.systemPromptTemplate,
      '',
      examples,
      '',
      'Text:',
      context,
      '',
      'The emoji should best fit the position marked by [CURSOR]. Focus on the words immediately adjacent to [CURSOR] first, then use surrounding context. Prefer a specific emoji over a generic sentiment emoji.',
    ].join('\n');
  }

  return [
    config.systemPromptTemplate,
    '',
    EXAMPLES_SHORT,
    '',
    'Text:',
    context,
    '',
    'The emoji should best represent the text. Prefer a specific emoji over a generic sentiment emoji.',
  ].join('\n');
}
