import { createLogEntry, type LogMeta } from '../shared/log/log-entry';
import { LOG_LEVEL_RANK, type LogLevel } from '../shared/log/log-level';
import type { LogSink } from '../ports/log-sink';

export interface ILogger {
  readonly scope: string;
  readonly minLevel: LogLevel;

  child(childScope: string): ILogger;

  debug(messageKey: string, meta?: LogMeta): void;
  info(messageKey: string, meta?: LogMeta): void;
  warn(messageKey: string, meta?: LogMeta): void;
  error(messageKey: string, meta?: LogMeta): void;
}

export function createLogger(params: {
  scope: string;
  minLevel: LogLevel;
  sink: LogSink;
  clock: { nowMs(): number };
}): ILogger {
  const { scope, minLevel, sink, clock } = params;

  if (!scope.trim()) throw new Error('Logger.scope must be non-empty');

  function shouldEmit(level: LogLevel): boolean {
    return LOG_LEVEL_RANK[level] >= LOG_LEVEL_RANK[minLevel];
  }

  function emit(level: LogLevel, messageKey: string, meta?: LogMeta): void {
    if (!shouldEmit(level)) return;

    const entry = createLogEntry({
      atMs: clock.nowMs(),
      level,
      scope,
      message: { key: messageKey },
      meta,
    });

    sink.emit(entry);
  }

  return {
    scope,
    minLevel,

    child(childScope) {
      const nextScope = `${scope}:${childScope}`;
      return createLogger({ scope: nextScope, minLevel, sink, clock });
    },

    debug(messageKey, meta) {
      emit('debug', messageKey, meta);
    },
    info(messageKey, meta) {
      emit('info', messageKey, meta);
    },
    warn(messageKey, meta) {
      emit('warn', messageKey, meta);
    },
    error(messageKey, meta) {
      emit('error', messageKey, meta);
    },
  };
}
