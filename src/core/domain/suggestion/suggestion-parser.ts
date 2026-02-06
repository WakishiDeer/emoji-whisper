import { createSuggestion, type Suggestion } from './suggestion';

export function parseSuggestionFromModelOutput(output: string): Suggestion | null {
  const trimmed = output.trim();
  if (trimmed.length === 0) return null;

  // Must be exactly one grapheme cluster.
  const graphemes = splitIntoGraphemes(trimmed);
  if (graphemes.length !== 1) return null;

  const candidate = graphemes[0];

  // Reject whitespace and obvious text.
  if (/\s/u.test(candidate)) return null;
  if (/[\p{L}\p{N}]/u.test(candidate)) return null;

  // Prefer Unicode property check when supported.
  if (supportsExtendedPictographic()) {
    if (!/\p{Extended_Pictographic}/u.test(candidate)) return null;
  }

  return createSuggestion(candidate);
}

function splitIntoGraphemes(text: string): string[] {
  // Node + modern browsers support Intl.Segmenter.
  const Segmenter = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Segmenter) {
    const seg = new Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(seg.segment(text), (s) => s.segment);
  }

  // Fallback: treat code points as a best-effort.
  return Array.from(text);
}

let cachedSupportsExtendedPictographic: boolean | null = null;
function supportsExtendedPictographic(): boolean {
  if (cachedSupportsExtendedPictographic != null) return cachedSupportsExtendedPictographic;
  try {
    cachedSupportsExtendedPictographic = /\p{Extended_Pictographic}/u.test('😊');
  } catch {
    cachedSupportsExtendedPictographic = false;
  }
  return cachedSupportsExtendedPictographic;
}
