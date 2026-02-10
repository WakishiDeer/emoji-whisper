/**
 * Configurable LanguageModel mock for E2E tests.
 *
 * Inject via `page.addInitScript()` **before** navigating so the content script
 * (world: MAIN, runAt: document_idle) sees globalThis.LanguageModel on startup.
 *
 * Example:
 *   await page.addInitScript(injectMockLanguageModel, {
 *     availability: 'available',
 *     emoji: '😊',
 *     reason: 'Expresses happiness',
 *   });
 *   await page.goto('/test-site.html');
 */

export type MockLanguageModelConfig = {
  /** What `LanguageModel.availability()` returns. Default: `'available'`. */
  availability?: 'available' | 'unavailable' | 'downloading' | 'downloadable';
  /** The emoji the mock returns. Default: `'😊'`. */
  emoji?: string;
  /** The reason the mock returns. Default: `'Expresses happiness'`. */
  reason?: string;
  /** Artificial delay in ms before the prompt resolves. Default: `0`. */
  delayMs?: number;
  /** If true, `session.prompt()` throws an error. Default: `false`. */
  shouldThrow?: boolean;
};

/**
 * This function is serialised and executed inside the page context.
 * It installs a mock `globalThis.LanguageModel` before the content script runs.
 */
export function injectMockLanguageModel(config: MockLanguageModelConfig = {}): void {
  const availability = config.availability ?? 'available';
  const emoji = config.emoji ?? '😊';
  const reason = config.reason ?? 'Expresses happiness';
  const delayMs = config.delayMs ?? 0;
  const shouldThrow = config.shouldThrow ?? false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).LanguageModel = {
    availability: async () => availability,
    create: async () => ({
      prompt: async () => {
        if (delayMs > 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
        }
        if (shouldThrow) {
          throw new Error('Mock: generation failed');
        }
        return JSON.stringify({ reason, emoji });
      },
      destroy: () => {
        /* no-op */
      },
    }),
  };
}

/* ------------------------------------------------------------------ */
/*  Convenience constants                                              */
/* ------------------------------------------------------------------ */

/** CSS selectors for overlay elements injected by the extension. */
export const OVERLAY = {
  mirror: '.ec-mirror',
  ghost: '.ec-mirror-ghost',
  tooltip: '.ec-ghost-tooltip',
  toast: '.ec-toast',
} as const;

/** Timing constants matching the controller defaults. */
export const TIMING = {
  /** Idle delay before suggestion triggers (ms). */
  idleDelayMs: 700,
  /** Cooldown between suggestion attempts (ms). */
  cooldownMs: 2000,
  /** Toast throttle period (ms). */
  toastThrottleMs: 30_000,
  /** Default toast auto-dismiss duration (ms). */
  toastDurationMs: 3500,
  /** A comfortable wait that exceeds idle delay. */
  waitForSuggestionMs: 1500,
} as const;
