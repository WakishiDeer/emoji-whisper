import { describe, expect, it } from 'vitest';

import { buildEmojiPrompt, DEFAULT_PROMPT_CONFIG } from '../../src/core/services/prompt';

describe('buildEmojiPrompt', () => {
  const config = {
    systemPromptTemplate: 'Return a single emoji only.',
    maxTokens: 5,
    temperature: 0.1,
    topK: 8,
  };

  it('includes the system template and context (character mode)', () => {
    const context = 'Excited about launch day!';
    const prompt = buildEmojiPrompt(context, config);

    expect(prompt).toContain(config.systemPromptTemplate);
    expect(prompt).toContain(`Text:\n${context}`);
    expect(prompt).toContain('Return exactly one emoji that best represents the text');
    expect(prompt).toContain('Prefer a specific emoji over a generic sentiment emoji');
  });

  it('uses cursor marker instruction in sentence mode', () => {
    const context = 'Hello [CURSOR] world';
    const prompt = buildEmojiPrompt(context, config, true);

    expect(prompt).toContain(config.systemPromptTemplate);
    expect(prompt).toContain(`Text:\n${context}`);
    expect(prompt).toContain('Return exactly one emoji that best fits the position marked by [CURSOR]');
    expect(prompt).toContain('Prefer a specific emoji over a generic sentiment emoji');
  });

  it('DEFAULT_PROMPT_CONFIG includes topK and few-shot examples', () => {
    expect(DEFAULT_PROMPT_CONFIG.topK).toBe(8);
    expect(DEFAULT_PROMPT_CONFIG.temperature).toBe(0.7);
    expect(DEFAULT_PROMPT_CONFIG.systemPromptTemplate).toContain('specific object');
    expect(DEFAULT_PROMPT_CONFIG.systemPromptTemplate).toContain('single word or short phrase');
    expect(DEFAULT_PROMPT_CONFIG.systemPromptTemplate).toContain('closest metaphorical match');
  });

  it('DEFAULT_PROMPT_CONFIG covers diverse few-shot categories', () => {
    const tpl = DEFAULT_PROMPT_CONFIG.systemPromptTemplate;
    // Sentence-level specificity
    expect(tpl).toContain('🎸');
    expect(tpl).toContain('😊');
    // Single words
    expect(tpl).toContain('🍕');
    expect(tpl).toContain('🚀');
    // Tech terms
    expect(tpl).toContain('🐛');
    expect(tpl).toContain('📦');
    // Abstract emotions
    expect(tpl).toContain('😵‍💫');
    expect(tpl).toContain('🏆');
    // Greetings / idioms
    expect(tpl).toContain('☀️');
    expect(tpl).toContain('🎂');
    // No-direct-emoji concepts
    expect(tpl).toContain('📅');
    expect(tpl).toContain('🏠');
  });
});
