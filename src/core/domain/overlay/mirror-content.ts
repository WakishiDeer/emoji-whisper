/**
 * Value object representing the decomposition of input text around the caret
 * for inline mirror overlay rendering.
 *
 * The mirror overlay renders three segments:
 *   [before] [ghost emoji] [after]
 * so that the emoji appears inline within the text flow.
 */
export type MirrorContent = Readonly<{
  /** Text before the caret position. */
  before: string;
  /** Ghost emoji to render at the caret. */
  ghost: string;
  /** Text after the caret position. */
  after: string;
}>;

/**
 * Split input text at the caret position and insert a ghost emoji.
 *
 * Out-of-bounds `caretOffset` is clamped to `[0, value.length]`
 * to maintain defensive robustness — no exception is thrown.
 *
 * @param value       - Full text content of the input element.
 * @param caretOffset - Zero-based caret position (selectionStart).
 * @param emoji       - Ghost emoji string to place at the caret.
 * @returns A {@link MirrorContent} value object with three segments.
 */
export function splitTextAtCaret(
  value: string,
  caretOffset: number,
  emoji: string,
): MirrorContent {
  const clamped = Math.max(0, Math.min(caretOffset, value.length));
  return {
    before: value.slice(0, clamped),
    ghost: emoji,
    after: value.slice(clamped),
  };
}
