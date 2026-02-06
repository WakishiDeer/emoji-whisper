/**
 * Shared utility: djb2 hash for stable, fast hashing of short strings.
 */
export function hashStringDjb2(text: string): number {
    let hash = 5381;
    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
    }
    return hash >>> 0;
}
