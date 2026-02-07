/**
 * Domain: context extraction rules.
 * Pure text logic. No browser/DOM APIs.
 */

/**
 * Extraction strategy: character-based (legacy) or sentence-based (new).
 */
export type ContextMode = 'characters' | 'sentences';

/**
 * Settings used when contextMode is 'sentences'.
 */
export type SentenceContextSettings = Readonly<{
    /**
     * Number of complete sentences to extract BEFORE the cursor.
     * The partial sentence immediately before the cursor is always included.
     * Default: 2
     */
    beforeSentenceCount: number;

    /**
     * Number of complete sentences to extract AFTER the cursor.
     * The partial sentence immediately after the cursor is always included.
     * Default: 1
     */
    afterSentenceCount: number;

    /**
     * Marker string inserted at the cursor position in the extracted context.
     * The AI prompt instructs the model to suggest an emoji for this position.
     * Default: '[CURSOR]'
     */
    cursorMarker: string;
}>;

export const DEFAULT_SENTENCE_CONTEXT_SETTINGS: SentenceContextSettings = {
    beforeSentenceCount: 0,
    afterSentenceCount: 0,
    cursorMarker: '[CURSOR]',
};

export type ContextExtractionSettings = Readonly<{
    /** Extraction mode: 'characters' (legacy) or 'sentences' (new). */
    contextMode: ContextMode;

    /** Minimum characters required to trigger a suggestion (default: 5). */
    minContextLength: number;

    // --- Character mode settings (used when contextMode === 'characters') ---
    /** Maximum characters to extract before cursor (default: 200). */
    maxContextLength: number;
    /** Adjust truncation to nearest sentence boundary (default: true). */
    adjustToBoundary: boolean;

    // --- Sentence mode settings (used when contextMode === 'sentences') ---
    /** Settings for sentence-based extraction. */
    sentenceContext: SentenceContextSettings;
}>;

const DEFAULT_BOUNDARY_CHARS = ['.', '!', '?', '。', '！', '？', '\n'] as const;

export function extractContextBeforeCursor(
    fullText: string,
    cursorIndex: number,
    settings: ContextExtractionSettings,
): string {
    const safeCursorIndex = Math.max(0, Math.min(cursorIndex, fullText.length));
    const start = Math.max(0, safeCursorIndex - settings.maxContextLength);
    let windowText = fullText.slice(start, safeCursorIndex);

    if (settings.adjustToBoundary) {
        const firstBoundaryIndex = findFirstBoundaryIndex(windowText);
        if (firstBoundaryIndex !== -1 && firstBoundaryIndex + 1 < windowText.length) {
            windowText = windowText.slice(firstBoundaryIndex + 1);
        }
    }

    return windowText;
}

function findFirstBoundaryIndex(text: string): number {
    let earliest = -1;
    for (const boundary of DEFAULT_BOUNDARY_CHARS) {
        const idx = text.indexOf(boundary);
        if (idx === -1) continue;
        if (earliest === -1 || idx < earliest) earliest = idx;
    }
    return earliest;
}

function isBoundaryChar(char: string): boolean {
    return (DEFAULT_BOUNDARY_CHARS as readonly string[]).includes(char);
}

/**
 * Split text into sentences based on boundary characters.
 * Each sentence includes its terminating boundary character.
 */
function splitIntoSentences(text: string): string[] {
    const sentences: string[] = [];
    let current = '';

    for (const char of text) {
        current += char;
        if (isBoundaryChar(char)) {
            sentences.push(current);
            current = '';
        }
    }

    if (current.length > 0) {
        sentences.push(current);
    }

    return sentences;
}

/**
 * Result of bidirectional sentence extraction.
 */
export type SentenceExtractionResult = Readonly<{
    /** The extracted context with cursor marker. */
    contextWithMarker: string;
    /** The extracted context without cursor marker (for length checks). */
    contextWithoutMarker: string;
}>;

/**
 * Extracts context around the cursor using sentence-based boundaries.
 * Returns text with a cursor marker inserted at the cursor position.
 */
export function extractContextAroundCursor(
    fullText: string,
    cursorIndex: number,
    settings: SentenceContextSettings,
): SentenceExtractionResult {
    const safeCursorIndex = Math.max(0, Math.min(cursorIndex, fullText.length));

    const textBefore = fullText.slice(0, safeCursorIndex);
    const textAfter = fullText.slice(safeCursorIndex);

    const sentencesBefore = splitIntoSentences(textBefore);
    const sentencesAfter = splitIntoSentences(textAfter);

    let beforeContext = '';
    if (sentencesBefore.length > 0) {
        const lastSentenceBefore = sentencesBefore[sentencesBefore.length - 1];
        const lastChar = lastSentenceBefore[lastSentenceBefore.length - 1] ?? '';
        const isLastComplete = lastSentenceBefore.length > 0 && isBoundaryChar(lastChar);

        if (isLastComplete) {
            const startIdx = Math.max(0, sentencesBefore.length - settings.beforeSentenceCount);
            beforeContext = sentencesBefore.slice(startIdx).join('');
        } else {
            const completeSentences = sentencesBefore.slice(0, -1);
            const startIdx = Math.max(0, completeSentences.length - settings.beforeSentenceCount);
            beforeContext = completeSentences.slice(startIdx).join('') + lastSentenceBefore;
        }
    }

    let afterContext = '';
    if (sentencesAfter.length > 0) {
        const firstSentenceAfter = sentencesAfter[0];
        const lastChar = firstSentenceAfter[firstSentenceAfter.length - 1] ?? '';
        const isFirstComplete = firstSentenceAfter.length > 0 && isBoundaryChar(lastChar);

        if (isFirstComplete) {
            const endIdx = Math.min(sentencesAfter.length, settings.afterSentenceCount + 1);
            afterContext = sentencesAfter.slice(0, endIdx).join('');
        } else {
            const remainingSentences = sentencesAfter.slice(1);
            const endIdx = Math.min(remainingSentences.length, settings.afterSentenceCount);
            afterContext = firstSentenceAfter + remainingSentences.slice(0, endIdx).join('');
        }
    }

    const contextWithMarker = beforeContext + settings.cursorMarker + afterContext;
    const contextWithoutMarker = beforeContext + afterContext;

    return { contextWithMarker, contextWithoutMarker };
}

/**
 * Unified extraction function that dispatches based on contextMode.
 */
export type ExtractionResult = Readonly<{
    /** Context to send to AI (may include cursor marker in sentence mode). */
    contextForPrompt: string;
    /** Context without marker (for skip checks and hashing). */
    contextForValidation: string;
    /** Whether the extraction used sentence mode. */
    isSentenceMode: boolean;
}>;

export function extractContext(
    fullText: string,
    cursorIndex: number,
    settings: ContextExtractionSettings,
): ExtractionResult {
    if (settings.contextMode === 'sentences') {
        const result = extractContextAroundCursor(fullText, cursorIndex, settings.sentenceContext);
        return {
            contextForPrompt: result.contextWithMarker,
            contextForValidation: result.contextWithoutMarker,
            isSentenceMode: true,
        };
    }

    const extracted = extractContextBeforeCursor(fullText, cursorIndex, settings);
    return {
        contextForPrompt: extracted,
        contextForValidation: extracted,
        isSentenceMode: false,
    };
}
