import { describe, expect, it, vi } from 'vitest';

import { detectLanguageModelBinding } from '../../src/extension/adapters/prompt-api';

function setGlobalValue(key: string, value: unknown): () => void {
  const desc = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.defineProperty(globalThis, key, {
    value,
    configurable: true,
    writable: true,
  });

  return () => {
    if (desc) Object.defineProperty(globalThis, key, desc);
    else delete (globalThis as unknown as Record<string, unknown>)[key];
  };
}

describe('detectLanguageModelBinding', () => {
  it('detects globalThis.LanguageModel (static methods)', () => {
    const fakeAvailability = vi.fn();
    const fakeCreate = vi.fn();
    const fakeLanguageModel = Object.assign(function LanguageModel() { }, {
      availability: fakeAvailability,
      create: fakeCreate,
    });

    const restoreLanguageModel = setGlobalValue('LanguageModel', fakeLanguageModel);

    try {
      const r = detectLanguageModelBinding();
      expect(r.binding).toBe('globalThis.LanguageModel');
      expect(r.model).toBe(fakeLanguageModel);
    } finally {
      restoreLanguageModel();
    }
  });

  it('returns none when no candidates match the expected shape', () => {
    const restoreLanguageModel = setGlobalValue('LanguageModel', undefined);

    try {
      const r = detectLanguageModelBinding();
      expect(r.binding).toBe('none');
      expect(r.model).toBeNull();
    } finally {
      restoreLanguageModel();
    }
  });
});
