import type { LogLevel } from './log-level';
import type { RedactedText } from './log-redaction';

export type LogMetaValue = string | number | boolean | null | RedactedText;

export type LogMeta = Readonly<Record<string, LogMetaValue>>;

export type LogMessage = Readonly<{
  /**
   * Stable key suitable for filtering and future i18n.
   * Example: "controller.start" or "ai.availability.unavailable".
   */
  key: string;
  /**
   * Optional human-readable message for developers.
   * Must NOT include raw user input.
   */
  text?: string;
}>;

export type LogEntry = Readonly<{
  atMs: number;
  level: LogLevel;
  scope: string;
  message: LogMessage;
  meta?: LogMeta;
}>;

export function createLogEntry(input: LogEntry): LogEntry {
  if (!input.scope.trim()) throw new Error('LogEntry.scope must be non-empty');
  if (!input.message.key.trim()) throw new Error('LogEntry.message.key must be non-empty');

  if (input.meta) {
    for (const [k, v] of Object.entries(input.meta)) {
      if (!k.trim()) throw new Error('LogEntry.meta keys must be non-empty');
      if (!isAllowedMetaValue(v)) throw new Error('LogEntry.meta contains unsupported value');
    }
  }

  return input;
}

function isAllowedMetaValue(value: unknown): value is LogMetaValue {
  if (value == null) return true;
  if (typeof value === 'string') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;

  if (typeof value === 'object') {
    const anyValue = value as Partial<RedactedText>;
    return anyValue.kind === 'redacted-text' && typeof anyValue.length === 'number' && Number.isFinite(anyValue.length);
  }

  return false;
}
