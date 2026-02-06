import { describe, expect, it } from 'vitest';

import { createContext } from '../../src/core/domain/context/context';
import { createContextHash } from '../../src/core/domain/context/context-hash';
import { createSuggestion } from '../../src/core/domain/suggestion/suggestion';
import { SuggestionSession, type SuggestionRequestId } from '../../src/core/domain/suggestion/suggestion-session';

describe('SuggestionSession', () => {
  it('begins request and shows suggestion only for matching requestId', () => {
    const session = new SuggestionSession();

    const begun = session.beginRequest({
      nowMs: 1000,
      context: createContext('hello world'),
      contextHash: createContextHash(123),
      cooldownMs: 2000,
    });

    expect(begun.kind).toBe('begun');
    if (begun.kind !== 'begun') throw new Error('expected begun');

    const ignored = session.receiveSuggestion({
      requestId: 'wrong' as SuggestionRequestId,
      suggestion: createSuggestion('😊'),
    });
    expect(ignored).toBe(false);

    const applied = session.receiveSuggestion({
      requestId: begun.requestId,
      suggestion: createSuggestion('😊'),
    });
    expect(applied).toBe(true);
    expect(session.isOverlayVisible()).toBe(true);
  });

  it('enforces cooldown and same-context suppression', () => {
    const session = new SuggestionSession();

    const first = session.beginRequest({
      nowMs: 1000,
      context: createContext('hello'),
      contextHash: createContextHash(1),
      cooldownMs: 2000,
    });
    expect(first.kind).toBe('begun');

    const cooldown = session.beginRequest({
      nowMs: 2500,
      context: createContext('hello again'),
      contextHash: createContextHash(2),
      cooldownMs: 2000,
    });
    expect(cooldown).toEqual({ kind: 'skipped', reason: 'cooldown' });

    const same = session.beginRequest({
      nowMs: 4000,
      context: createContext('hello'),
      contextHash: createContextHash(1),
      cooldownMs: 2000,
    });
    expect(same).toEqual({ kind: 'skipped', reason: 'same-context' });
  });
});
