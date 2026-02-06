import { describe, expect, it } from 'vitest';

import { buildEmojiPrompt } from '../../src/core/services/prompt';

describe('buildEmojiPrompt', () => {
  const config = {
    systemPromptTemplate: 'Return a single emoji only.',
    maxTokens: 5,
    temperature: 0.1,
  };

  it('includes the system template and context (character mode)', () => {
    const context = 'Excited about launch day!';
    const prompt = buildEmojiPrompt(context, config);

    expect(prompt).toContain(config.systemPromptTemplate);
    expect(prompt).toContain(`Text:\n${context}`);
    expect(prompt).toContain('Return exactly one emoji that best matches the tone/sentiment');
  });

  it('uses cursor marker instruction in sentence mode', () => {
    const context = 'Hello [CURSOR] world';
    const prompt = buildEmojiPrompt(context, config, true);

    expect(prompt).toContain(config.systemPromptTemplate);
    expect(prompt).toContain(`Text:\n${context}`);
    expect(prompt).toContain('Return exactly one emoji that best fits the position marked by [CURSOR]');
  });
});
