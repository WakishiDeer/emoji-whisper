export type SkipConditions = Readonly<{
    skipIfEmpty: boolean;
    skipIfEmojiOnly: boolean;
    skipIfUrlOnly: boolean;
}>;

/**
 * Determines whether the context should be skipped based on its length.
 */
export function shouldSkipByLength(context: string, minLength: number): boolean {
    return context.trim().length < minLength;
}

export function shouldSkipByConditions(context: string, skip: SkipConditions): boolean {
    const trimmed = context.trim();
    if (skip.skipIfEmpty && trimmed.length === 0) return true;
    if (skip.skipIfUrlOnly && isUrlLike(trimmed)) return true;
    if (skip.skipIfEmojiOnly && isEmojiOnly(trimmed)) return true;
    return false;
}

function isUrlLike(text: string): boolean {
    return /^https?:\/\//i.test(text);
}

function isEmojiOnly(text: string): boolean {
    // Minimal, permissive check: treat as emoji-only if it contains no letters/digits and
    // at least one non-whitespace symbol. This can be tightened later.
    if (text.trim().length === 0) return false;
    if (/[\p{L}\p{N}]/u.test(text)) return false;
    return true;
}
