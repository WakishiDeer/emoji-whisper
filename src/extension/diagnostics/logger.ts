import type { LogLevel } from '../../core/shared/log/log-level';
import { isLogLevel } from '../../core/shared/log/log-level';
import { createLogger, type ILogger } from '../../core/services/logger';
import { ConsoleLogSink } from './console-log-sink';

const GLOBAL_OVERRIDE_KEY = '__EMOJI_COMPLETION_LOG_LEVEL__';

function getGlobalOverride(): LogLevel | null {
  const value = (globalThis as unknown as Record<string, unknown>)[GLOBAL_OVERRIDE_KEY];
  return isLogLevel(value) ? value : null;
}

export function getDefaultMinLogLevel(): LogLevel {
  const override = getGlobalOverride();
  if (override) return override;

  type ImportMetaWithEnv = ImportMeta & { env?: { DEV?: boolean; MODE?: string } };
  const meta = import.meta as ImportMetaWithEnv;
  // Treat as dev (debug) when DEV is true OR when MODE is 'development' OR when env is missing entirely.
  const isDev = meta.env?.DEV === true || meta.env?.MODE === 'development' || meta.env == null;
  return isDev ? 'debug' : 'info';
}

/**
 * Creates a scoped logger for extension/runtime code.
 *
 * Privacy note: do not pass raw user text in meta.
 * Prefer lengths, hashes, and enumerated reason codes.
 */
export function createExtensionLogger(scope: string, opts: { minLevel?: LogLevel } = {}): ILogger {
  const sink = new ConsoleLogSink();
  const minLevel = opts.minLevel ?? getDefaultMinLogLevel();

  return createLogger({
    scope,
    minLevel,
    sink,
    clock: { nowMs: () => Date.now() },
  });
}

export const LOG_LEVEL_OVERRIDE_GLOBAL = GLOBAL_OVERRIDE_KEY;
