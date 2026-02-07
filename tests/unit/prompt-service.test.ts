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
    expect(prompt).toContain('best represent the text');
    expect(prompt).toContain('Prefer a specific emoji over a generic sentiment emoji');
  });

  it('uses cursor marker instruction in sentence mode', () => {
    const context = 'Hello [CURSOR] world';
    const prompt = buildEmojiPrompt(context, config, true);

    expect(prompt).toContain(config.systemPromptTemplate);
    expect(prompt).toContain(`Text:\n${context}`);
    expect(prompt).toContain('[CURSOR]');
    expect(prompt).toContain('Analyze the words before and after [CURSOR] carefully');
    expect(prompt).toContain('Prefer a specific emoji over a generic sentiment emoji');
  });

  it('DEFAULT_PROMPT_CONFIG includes topK and content quality instructions', () => {
    expect(DEFAULT_PROMPT_CONFIG.topK).toBe(5);
    expect(DEFAULT_PROMPT_CONFIG.temperature).toBe(0.4);
    expect(DEFAULT_PROMPT_CONFIG.maxTokens).toBe(64);
    // Format instructions removed — responseConstraint enforces JSON structure.
    // Content quality guidance remains.
    expect(DEFAULT_PROMPT_CONFIG.systemPromptTemplate).toContain('"emoji"');
    expect(DEFAULT_PROMPT_CONFIG.systemPromptTemplate).toContain('"reason"');
    expect(DEFAULT_PROMPT_CONFIG.systemPromptTemplate).toContain('specific object');
    expect(DEFAULT_PROMPT_CONFIG.systemPromptTemplate).toContain('single word or short phrase');
    expect(DEFAULT_PROMPT_CONFIG.systemPromptTemplate).toContain('closest metaphorical match');
    // Cursor-position awareness rules
    expect(DEFAULT_PROMPT_CONFIG.systemPromptTemplate).toContain('[CURSOR] marker is present');
    expect(DEFAULT_PROMPT_CONFIG.systemPromptTemplate).toContain('before AND after [CURSOR]');
    // Verify JSON format instruction is NOT present (enforced by responseConstraint instead).
    expect(DEFAULT_PROMPT_CONFIG.systemPromptTemplate).not.toContain('Output MUST be valid JSON');
    expect(DEFAULT_PROMPT_CONFIG.systemPromptTemplate).not.toContain('respond with valid JSON');
  });

  it('DEFAULT_PROMPT_CONFIG covers diverse few-shot categories', () => {
    const tpl = DEFAULT_PROMPT_CONFIG.systemPromptTemplate;
    // Short input without cursor
    expect(tpl).toContain('Examples (short input without cursor)');
    expect(tpl).toContain('"pizza"');
    expect(tpl).toContain('🍕');
    expect(tpl).toContain('"rocket"');
    expect(tpl).toContain('🚀');
    // End-of-text with [CURSOR]: all examples include [CURSOR] marker
    expect(tpl).toContain('Examples (end-of-text with [CURSOR])');
    expect(tpl).toContain('playing guitar with friends [CURSOR]');
    expect(tpl).toContain('🎸');
    expect(tpl).toContain('I am so happy today [CURSOR]');
    expect(tpl).toContain('😊');
    // End-of-text with [CURSOR]: tech terms
    expect(tpl).toContain('debugging the code [CURSOR]');
    expect(tpl).toContain('🐛');
    expect(tpl).toContain('📦');
    // End-of-text with [CURSOR]: abstract emotions
    expect(tpl).toContain('😵‍💫');
    expect(tpl).toContain('🏆');
    // End-of-text with [CURSOR]: greetings / idioms
    expect(tpl).toContain('☀️');
    expect(tpl).toContain('🎂');
    // End-of-text with [CURSOR]: no-direct-emoji concepts
    expect(tpl).toContain('📅');
    expect(tpl).toContain('🏠');
    // End-of-text reasons use "Before cursor:" format
    expect(tpl).toContain('Before cursor:');
    // Mid-text [CURSOR] examples
    expect(tpl).toContain('Examples (mid-text with [CURSOR])');
    expect(tpl).toContain('🏪');
    expect(tpl).toContain('🐕');
    expect(tpl).toContain('🎶');
    expect(tpl).toContain('📖');
    expect(tpl).toContain('🔥');
  });
});
