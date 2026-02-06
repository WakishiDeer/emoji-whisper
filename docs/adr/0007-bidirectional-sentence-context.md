# ADR 0007: Bidirectional sentence‑based context extraction

## Status

Accepted – 06 Feb 2026

Supersedes [ADR 0005](0005-context-extraction-settings.md).

## Context

ADR 0005 introduced character‑based context extraction that reads text **before** the cursor only. While this works well when the cursor is at the end of the input, it falls short when the user places the cursor **mid‑sentence** and expects an emoji that fits both the preceding and following text.

Consider the following scenario:

```
今日はとても良い天気ですね。明日も晴れると|いいな。週末は出かけたい。
                                      ↑ cursor
```

With ADR 0005's approach, only `明日も晴れると` (or its containing sentence) is sent to the AI. The phrase `いいな。` that immediately follows the cursor is ignored, potentially leading to a less contextually appropriate emoji suggestion.

Users have requested the ability to configure how many **sentences** (not just characters) are considered on each side of the cursor. This enables more nuanced context understanding while keeping the extracted window concise.

## Decision

We extend the context extraction domain model to support **bidirectional, sentence‑count‑based extraction** as an alternative mode. The existing character‑based mode remains available for backward compatibility.

### Extended Domain Model

```typescript
/**
 * Extraction strategy: character‑based (legacy) or sentence‑based (new).
 */
type ContextMode = 'characters' | 'sentences';

/**
 * Settings used when contextMode is 'sentences'.
 */
interface SentenceContextSettings {
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
}

/**
 * Updated ContextExtractionSettings supporting both modes.
 */
interface ContextExtractionSettings {
  /** Extraction mode: 'characters' (ADR 0005 behaviour) or 'sentences' (new). */
  contextMode: ContextMode;

  // --- Character mode settings (used when contextMode === 'characters') ---
  /** Minimum characters required to trigger a suggestion (default: 5). */
  minContextLength: number;
  /** Maximum characters to extract before cursor (default: 200). */
  maxContextLength: number;
  /** Adjust truncation to nearest sentence boundary (default: true). */
  adjustToBoundary: boolean;

  // --- Sentence mode settings (used when contextMode === 'sentences') ---
  /** Settings for sentence‑based extraction. */
  sentenceContext: SentenceContextSettings;
}
```

### Default Values

| Setting | Default | Rationale |
|---------|---------|-----------|
| `contextMode` | `'sentences'` | New default; provides better mid‑sentence context |
| `beforeSentenceCount` | 2 | Two preceding sentences give sufficient backward context |
| `afterSentenceCount` | 1 | One following sentence captures immediate forward context |
| `cursorMarker` | `'[CURSOR]'` | Clear, unlikely to appear in natural text, easy for LLM to parse |

Legacy character‑mode defaults remain unchanged from ADR 0005.

### Extraction Algorithm (Sentence Mode)

Given input text `T`, cursor position `C`, and settings `S`:

1. **Identify the partial fragments** around the cursor:
   - `beforeFragment`: text from the last boundary before `C` (or start of `T`) up to `C`.
   - `afterFragment`: text from `C` up to the first boundary after `C` (or end of `T`).

2. **Collect preceding sentences**:
   - Walk backward from the start of `beforeFragment`.
   - Collect up to `S.beforeSentenceCount` complete sentences (terminated by boundary characters).

3. **Collect following sentences**:
   - Walk forward from the end of `afterFragment`.
   - Collect up to `S.afterSentenceCount` complete sentences.

4. **Assemble context**:
   ```
   [preceding sentences][beforeFragment][cursorMarker][afterFragment][following sentences]
   ```

5. **Apply minimum length check**: if total length (excluding marker) < `minContextLength`, skip.

### Example

```
Input:  "A。B。C。D|E。F。G。"
Cursor: between D and E
Settings: beforeSentenceCount=2, afterSentenceCount=1, cursorMarker='[CURSOR]'

Step 1: beforeFragment = "D", afterFragment = "E。"
Step 2: preceding = ["B。", "C。"] (2 sentences)
Step 3: following = ["F。"] (1 sentence)
Step 4: result = "B。C。D[CURSOR]E。F。"
```

### Prompt Template Update

When using sentence mode, the prompt includes:

```
Text:
B。C。D[CURSOR]E。F。

Return exactly one emoji that best fits the position marked [CURSOR].
```

The AI is instructed to consider both sides of the marker.

## Consequences

### Positive

* **Better mid‑text suggestions**: The AI sees context on both sides, improving relevance.
* **User control**: Power users can tune sentence counts per their workflow.
* **Backward compatible**: Character mode remains available; existing users are unaffected if they prefer the old behaviour.
* **Clear insertion point**: The cursor marker explicitly tells the AI where the emoji will go.

### Negative

* **Increased complexity**: Two extraction modes mean more code paths and tests.
* **Prompt length**: Including after‑context increases token usage (mitigated by sentence limits).
* **Edge cases**: Inputs without clear sentence boundaries require fallback handling.

### Mitigations

* Provide sensible defaults so most users never need to change settings.
* Fall back to character mode if sentence parsing yields an empty or degenerate result.
* Limit total extracted length to a hard cap (e.g., 500 characters) regardless of sentence count.

## Related Documents

* [ADR 0005 – Context extraction settings (superseded)](0005-context-extraction-settings.md)
* [ADR 0006 – Domain Model Design](0006-domain-model-design.md)
* [Glossary](../spec/glossary.md)
* [Functional Requirements](../spec/functional-requirements.md)
