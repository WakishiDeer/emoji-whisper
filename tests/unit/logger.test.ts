import { describe, expect, it } from 'vitest';

import { redactText } from '../../src/core/shared/log/log-redaction';
import { createLogEntry } from '../../src/core/shared/log/log-entry';
import { createLogger } from '../../src/core/services/logger';
import type { LogEntry } from '../../src/core/shared/log/log-entry';
import type { LogSink } from '../../src/core/ports/log-sink';

class MemorySink implements LogSink {
  public readonly entries: LogEntry[] = [];
  emit(entry: LogEntry): void {
    this.entries.push(entry);
  }
}

describe('Log domain', () => {
  it('redacts text without storing raw value', () => {
    const r = redactText('secret-user-text', 'context');
    expect(r.kind).toBe('redacted-text');
    expect(r.length).toBe('secret-user-text'.length);
    expect(r.hint).toBe('context');
  });

  it('validates log entries and meta value types', () => {
    const entry = createLogEntry({
      atMs: 123,
      level: 'info',
      scope: 'scope',
      message: { key: 'event.key' },
      meta: {
        ok: true,
        n: 1,
        s: 'safe',
        redacted: redactText('raw', 'prompt'),
        nil: null,
      },
    });

    expect(entry.scope).toBe('scope');

    expect(() =>
      createLogEntry({
        atMs: 0,
        level: 'info',
        scope: '',
        message: { key: 'x' },
      }),
    ).toThrow('LogEntry.scope must be non-empty');

    expect(() =>
      createLogEntry({
        atMs: 0,
        level: 'info',
        scope: 'scope',
        message: { key: '' },
      }),
    ).toThrow('LogEntry.message.key must be non-empty');

    expect(() =>
      createLogEntry({
        atMs: 0,
        level: 'info',
        scope: 'scope',
        message: { key: 'x' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meta: { bad: { nested: true } as any },
      }),
    ).toThrow('LogEntry.meta contains unsupported value');
  });
});

describe('Logger service', () => {
  it('filters by minLevel and emits to sink', () => {
    const sink = new MemorySink();
    let now = 1000;

    const log = createLogger({
      scope: 'test',
      minLevel: 'warn',
      sink,
      clock: { nowMs: () => now },
    });

    log.debug('debug');
    log.info('info');
    log.warn('warn', { x: 1 });
    now += 1;
    log.error('error');

    expect(sink.entries.map((e) => e.message.key)).toEqual(['warn', 'error']);
    expect(sink.entries[0].atMs).toBe(1000);
    expect(sink.entries[1].atMs).toBe(1001);

    const child = log.child('child');
    child.warn('child.warn');

    expect(sink.entries.at(-1)?.scope).toBe('test:child');
  });
});
