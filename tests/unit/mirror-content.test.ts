import { describe, expect, it } from 'vitest';
import { splitTextAtCaret, type MirrorContent } from '../../src/core/domain/overlay/mirror-content';

describe('splitTextAtCaret', () => {
  it('splits text at the middle of a string', () => {
    const result = splitTextAtCaret('hello world', 5, '😊');
    expect(result).toEqual<MirrorContent>({
      before: 'hello',
      ghost: '😊',
      after: ' world',
    });
  });

  it('handles caret at position 0 (beginning)', () => {
    const result = splitTextAtCaret('hello', 0, '🎉');
    expect(result).toEqual<MirrorContent>({
      before: '',
      ghost: '🎉',
      after: 'hello',
    });
  });

  it('handles caret at end of string', () => {
    const result = splitTextAtCaret('hello', 5, '🚀');
    expect(result).toEqual<MirrorContent>({
      before: 'hello',
      ghost: '🚀',
      after: '',
    });
  });

  it('handles empty input value', () => {
    const result = splitTextAtCaret('', 0, '😊');
    expect(result).toEqual<MirrorContent>({
      before: '',
      ghost: '😊',
      after: '',
    });
  });

  it('clamps negative caret offset to 0', () => {
    const result = splitTextAtCaret('hello', -3, '😊');
    expect(result).toEqual<MirrorContent>({
      before: '',
      ghost: '😊',
      after: 'hello',
    });
  });

  it('clamps caret offset exceeding value length', () => {
    const result = splitTextAtCaret('hi', 100, '😊');
    expect(result).toEqual<MirrorContent>({
      before: 'hi',
      ghost: '😊',
      after: '',
    });
  });

  it('handles multi-byte characters in value', () => {
    const result = splitTextAtCaret('こんにちは世界', 3, '🌍');
    expect(result).toEqual<MirrorContent>({
      before: 'こんに',
      ghost: '🌍',
      after: 'ちは世界',
    });
  });

  it('handles emoji already present in value', () => {
    const result = splitTextAtCaret('fire 🔥 is hot', 7, '😊');
    expect(result).toEqual<MirrorContent>({
      before: 'fire 🔥',
      ghost: '😊',
      after: ' is hot',
    });
  });

  it('handles multi-line text', () => {
    const result = splitTextAtCaret('line1\nline2\nline3', 6, '📝');
    expect(result).toEqual<MirrorContent>({
      before: 'line1\n',
      ghost: '📝',
      after: 'line2\nline3',
    });
  });

  it('preserves the exact emoji string passed in', () => {
    const result = splitTextAtCaret('test', 2, '👨‍👩‍👧‍👦');
    expect(result.ghost).toBe('👨‍👩‍👧‍👦');
  });
});
