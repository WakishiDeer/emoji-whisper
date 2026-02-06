import type { LogEntry } from '../../core/shared/log/log-entry';
import type { LogSink } from '../../core/ports/log-sink';

export class ConsoleLogSink implements LogSink {
  emit(entry: LogEntry): void {
    const levelTag = entry.level.toUpperCase().padEnd(5);
    const prefix = `[${levelTag}] [emoji-completion:${entry.scope}]`;
    const message = entry.message.key;

    const meta = entry.meta ? entry.meta : undefined;

    const fn =
      entry.level === 'debug'
        ? console.debug
        : entry.level === 'info'
          ? console.info
          : entry.level === 'warn'
            ? console.warn
            : console.error;

    // Avoid heavy formatting; keep it resilient inside content scripts.
    if (meta) fn(prefix, message, meta);
    else fn(prefix, message);
  }
}
