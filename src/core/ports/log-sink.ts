import type { LogEntry } from '../shared/log/log-entry';

export interface LogSink {
  emit(entry: LogEntry): void;
}
