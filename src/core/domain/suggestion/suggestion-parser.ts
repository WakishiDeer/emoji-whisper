import { createSuggestionResult, type Suggestion, type SuggestionResult } from './suggestion';

/**
 * Parse a JSON model output into a SuggestionResult (emoji + reason).
 *
 * Parsing strategy:
 * 1. Try JSON parse → extract `emoji` and `reason` fields.
 * 2. Fallback: treat the raw output as a bare emoji (reason defaults).
 */
export function parseSuggestionResultFromModelOutput(output: string): SuggestionResult | null {
  const trimmed = output.trim();
  if (trimmed.length === 0) return null;

  // Strategy 1: JSON parse
  const jsonResult = tryParseJson(trimmed);
  if (jsonResult) {
    const emoji = validateEmoji(String(jsonResult.emoji ?? '').trim());
    if (emoji) {
      return createSuggestionResult(emoji, String(jsonResult.reason ?? ''));
    }
  }

  // Strategy 2: Fallback — bare emoji extraction
  const bareEmoji = validateEmoji(trimmed);
  if (bareEmoji) {
    return createSuggestionResult(bareEmoji);
  }

  return null;
}

/**
 * Backward-compatible wrapper: extracts only the emoji.
 */
export function parseSuggestionFromModelOutput(output: string): Suggestion | null {
  const result = parseSuggestionResultFromModelOutput(output);
  return result?.emoji ?? null;
}

function tryParseJson(text: string): { emoji?: unknown; reason?: unknown } | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as { emoji?: unknown; reason?: unknown };
    }
  } catch {
    // Not valid JSON — fall through
  }
  return null;
}

/**
 * Validate that a candidate string is exactly one emoji grapheme cluster.
 * Returns the emoji string if valid, null otherwise.
 */
function validateEmoji(candidate: string): string | null {
  if (candidate.length === 0) return null;

  const graphemes = splitIntoGraphemes(candidate);
  if (graphemes.length !== 1) return null;

  const g = graphemes[0];
  if (/\s/u.test(g)) return null;
  if (/[\p{L}\p{N}]/u.test(g)) return null;

  if (supportsExtendedPictographic()) {
    if (!/\p{Extended_Pictographic}/u.test(g)) return null;
  }

  return g;
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
