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

  it('includes short-input examples in character mode', () => {
    const prompt = buildEmojiPrompt('hello', config);
    expect(prompt).toContain('Examples (short input without cursor)');
    expect(prompt).toContain('🍕');
    expect(prompt).toContain('🚀');
    // Must NOT include cursor-based examples
    expect(prompt).not.toContain('Examples (end-of-text');
    expect(prompt).not.toContain('Examples (beginning-of-text');
    expect(prompt).not.toContain('Examples (mid-text');
  });

  it('uses cursor marker instruction in sentence mode', () => {
    const context = 'Hello [CURSOR] world';
    const prompt = buildEmojiPrompt(context, config, true);

    expect(prompt).toContain(config.systemPromptTemplate);
    expect(prompt).toContain(`Text:\n${context}`);
    expect(prompt).toContain('[CURSOR]');
    expect(prompt).toContain('Focus on the words immediately adjacent to [CURSOR] first');
    expect(prompt).toContain('Prefer a specific emoji over a generic sentiment emoji');
  });

  describe('dynamic example selection (sentence mode)', () => {
    it('selects end-of-text examples when [CURSOR] is at the end', () => {
      const prompt = buildEmojiPrompt('working from home [CURSOR]', config, true);
      expect(prompt).toContain('Examples (end-of-text with [CURSOR])');
      expect(prompt).toContain('🎸');
      // Must NOT contain other sections
      expect(prompt).not.toContain('Examples (beginning-of-text');
      expect(prompt).not.toContain('Examples (mid-text');
      expect(prompt).not.toContain('Examples (short input');
    });

    it('selects beginning-of-text examples when [CURSOR] is at the start', () => {
      const prompt = buildEmojiPrompt('[CURSOR] is playing outside', config, true);
      expect(prompt).toContain('Examples (beginning-of-text with [CURSOR])');
      expect(prompt).toContain('🐱');
      // Must NOT contain other sections
      expect(prompt).not.toContain('Examples (end-of-text');
      expect(prompt).not.toContain('Examples (mid-text');
      expect(prompt).not.toContain('Examples (short input');
    });

    it('selects mid-text examples when [CURSOR] is in the middle', () => {
      const prompt = buildEmojiPrompt('I saw the [CURSOR] running away', config, true);
      expect(prompt).toContain('Examples (mid-text with [CURSOR])');
      expect(prompt).toContain('🏪');
      // Must NOT contain other sections
      expect(prompt).not.toContain('Examples (end-of-text');
      expect(prompt).not.toContain('Examples (beginning-of-text');
      expect(prompt).not.toContain('Examples (short input');
    });
  });

  it('DEFAULT_PROMPT_CONFIG includes topK and content quality instructions', () => {
    expect(DEFAULT_PROMPT_CONFIG.topK).toBe(5);
    expect(DEFAULT_PROMPT_CONFIG.temperature).toBe(0.4);
    expect(DEFAULT_PROMPT_CONFIG.maxTokens).toBe(64);
    const tpl = DEFAULT_PROMPT_CONFIG.systemPromptTemplate;
    // Output format constraints
    expect(tpl).toContain('"emoji"');
    expect(tpl).toContain('"reason"');
    // Specificity-first guidance (without category nouns that cause contamination)
    expect(tpl).toContain('most directly represents what the text describes');
    // Cursor-position awareness
    expect(tpl).toContain('immediately adjacent to [CURSOR]');
    expect(tpl).toContain('strongest clues');
    // Anti-hallucination rule
    expect(tpl).toContain('ONLY reference words that actually appear in the provided Text');
    expect(tpl).toContain('never words from the examples');
    // Must NOT contain category nouns that bias the model
    expect(tpl).not.toContain('animal');
    expect(tpl).not.toContain('food');
    expect(tpl).not.toContain('activity');
    // Verify JSON format instruction is NOT present (enforced by responseConstraint instead)
    expect(tpl).not.toContain('Output MUST be valid JSON');
    expect(tpl).not.toContain('respond with valid JSON');
    // System template no longer contains examples (they are injected dynamically)
    expect(tpl).not.toContain('Examples (');
  });

  it('assembled prompt contains the correct examples for each cursor position', () => {
    // End-of-text
    const endPrompt = buildEmojiPrompt('test [CURSOR]', DEFAULT_PROMPT_CONFIG, true);
    expect(endPrompt).toContain('🎸');
    expect(endPrompt).toContain('🐛');
    expect(endPrompt).toContain('😵‍💫');
    expect(endPrompt).toContain('🎂');
    expect(endPrompt).toContain('🏠');
    expect(endPrompt).toContain('Immediately before cursor:');

    // Beginning-of-text
    const beginPrompt = buildEmojiPrompt('[CURSOR] test', DEFAULT_PROMPT_CONFIG, true);
    expect(beginPrompt).toContain('🐱');
    expect(beginPrompt).toContain('🌸');
    expect(beginPrompt).toContain('🌧️');
    expect(beginPrompt).toContain('⚽');
    expect(beginPrompt).toContain('✈️');
    expect(beginPrompt).toContain('Immediately after cursor:');

    // Mid-text
    const midPrompt = buildEmojiPrompt('hello [CURSOR] world', DEFAULT_PROMPT_CONFIG, true);
    expect(midPrompt).toContain('🏪');
    expect(midPrompt).toContain('🐕');
    expect(midPrompt).toContain('🎶');
    expect(midPrompt).toContain('📖');
    expect(midPrompt).toContain('🔥');
    expect(midPrompt).toContain('Immediately before:');
    expect(midPrompt).toContain('immediately after:');

    // Character mode
    const charPrompt = buildEmojiPrompt('pizza', DEFAULT_PROMPT_CONFIG);
    expect(charPrompt).toContain('🍕');
    expect(charPrompt).toContain('🚀');
  });
});
