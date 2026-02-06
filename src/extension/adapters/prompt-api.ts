import { parseSuggestionFromModelOutput } from '../../core/domain/suggestion/suggestion-parser';
import type { Suggestion } from '../../core/domain/suggestion/suggestion';
import type { AvailabilityChecker, AvailabilityState } from '../../core/ports/availability-checker';
import type { SuggestionGenerator } from '../../core/ports/suggestion-generator';
import type { PromptConfig } from '../../core/services/prompt';
import { createExtensionLogger } from '../diagnostics/logger';

/**
 * Chrome 138+ exposes LanguageModel as a global with static methods.
 */
type LanguageModelStatic = {
  availability: (options?: Record<string, unknown>) => Promise<AvailabilityState>;
  create: (options?: Record<string, unknown>) => Promise<LanguageModelSession>;
};

type LanguageModelSession = {
  prompt: (input: string) => Promise<string>;
  destroy?: () => void;
};

function isLanguageModelStatic(value: unknown): value is LanguageModelStatic {
  if (!value) return false;
  const t = typeof value;
  // In practice `LanguageModel` may be a function object with static methods.
  if (t !== 'object' && t !== 'function') return false;
  const v = value as { availability?: unknown; create?: unknown };
  return typeof v.availability === 'function' && typeof v.create === 'function';
}

type LanguageModelExpectedIO = {
  type: 'text';
  languages?: Array<'en' | 'es' | 'ja'>;
};

function buildLanguageModelOptions(config: PromptConfig): {
  expectedInputs: LanguageModelExpectedIO[];
  expectedOutputs: LanguageModelExpectedIO[];
  outputLanguage: NonNullable<PromptConfig['outputLanguage']>;
} {
  // Our prompts are currently authored in English.
  const expectedInputs: LanguageModelExpectedIO[] = [{ type: 'text', languages: ['en'] }];

  // Constrain outputs if requested; default to English.
  const outputLanguage = config.outputLanguage ?? 'en';
  const expectedOutputs: LanguageModelExpectedIO[] = [{ type: 'text', languages: [outputLanguage] }];

  // Some implementations require specifying an output language for safety and quality.
  return { expectedInputs, expectedOutputs, outputLanguage };
}

/**
 * Exported for unit tests.
 * Chrome 138+ stable: globalThis.LanguageModel (static methods)
 */
export function detectLanguageModelBinding(): { model: LanguageModelStatic | null; binding: string } {
  const g = globalThis as unknown as Record<string, unknown>;

  // Chrome 138+ stable: LanguageModel is a global constructor with static methods
  const globalLanguageModel = g.LanguageModel;
  if (isLanguageModelStatic(globalLanguageModel)) return { model: globalLanguageModel, binding: 'globalThis.LanguageModel' };

  return { model: null, binding: 'none' };
}

export class PromptAPIAdapter implements AvailabilityChecker, SuggestionGenerator {
  private readonly log = createExtensionLogger('prompt-api');
  private didProbe = false;

  async checkAvailability(config: PromptConfig): Promise<AvailabilityState> {
    const detected = detectLanguageModelBinding();

    if (!this.didProbe) {
      this.didProbe = true;
      const g = globalThis as unknown as Record<string, unknown>;
      const nav = (globalThis as unknown as { navigator?: unknown }).navigator as unknown as Record<string, unknown> | undefined;
      this.log.info('availability.probe', {
        binding: detected.binding,
        hasGlobalLanguageModel: Boolean(g.LanguageModel),
        hasGlobalAi: Boolean(g.ai),
        hasNavigatorAi: Boolean(nav && (nav as Record<string, unknown>).ai),
      });
    }

    if (!detected.model) {
      this.log.info('availability.no-model', { hint: 'No supported LanguageModel binding found' });
      return 'unavailable';
    }

    try {
      // Chrome 138+: LanguageModel.availability() is a static method
      // IMPORTANT: Always pass the same expected input/output options you will use
      // for prompting/creating a session. Some implementations vary availability
      // by modality or language.
      const state = await detected.model.availability(buildLanguageModelOptions(config));
      this.log.info('availability.result', { state, binding: detected.binding });
      return state;
    } catch (err) {
      this.log.warn('availability.error', {
        message: err instanceof Error ? err.message : String(err),
        binding: detected.binding,
      });
      return 'unavailable';
    }
  }

  async generateSuggestion(prompt: string, config: PromptConfig, signal?: AbortSignal): Promise<Suggestion> {
    const detected = detectLanguageModelBinding();
    if (!detected.model) throw new Error('Prompt API unavailable');

    if (signal?.aborted) throw new Error('Aborted');

    this.log.debug('generate.begin', {
      binding: detected.binding,
      promptLength: prompt.length,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      topK: config.topK,
      outputLanguage: config.outputLanguage ?? null,
    });

    // Chrome 138+: LanguageModel.create() is a static method
    const session = await detected.model.create({
      topK: config.topK,
      temperature: config.temperature,
      ...buildLanguageModelOptions(config),
      ...(signal ? { signal } : {}),
    });

    try {
      if (signal?.aborted) throw new Error('Aborted');

      const output = await session.prompt(prompt);
      if (signal?.aborted) throw new Error('Aborted');

      this.log.debug('generate.output', { rawOutput: output, rawOutputLength: output.length });

      const suggestion = parseSuggestionFromModelOutput(output);
      if (!suggestion) {
        this.log.warn('generate.parse-failed', { rawOutput: output });
        throw new Error('Invalid suggestion output');
      }

      this.log.debug('generate.success', { suggestionLength: suggestion.length });
      return suggestion;
    } finally {
      // Release resources; creating a session can be expensive, but this avoids
      // leaks in long-lived pages. We can cache/reuse later if needed.
      session.destroy?.();
    }
  }
}
