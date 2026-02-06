# ADR 0005: Context extraction settings and domain model

## Status

Superseded by [ADR 0007](0007-bidirectional-sentence-context.md) – 06 Feb 2026

(Originally accepted – 02 Feb 2026)

## Context

The extension extracts text context from the user's input to send to the on‑device AI for emoji suggestion.  Several questions arise:

* How much text should be extracted?
* What happens if the text is too short or too long?
* Should we skip suggestions in certain edge cases (empty input, emoji‑only, URLs)?

Hard‑coding these values limits flexibility.  Different users have different preferences: some want suggestions even for short messages; others want to limit context for privacy or performance reasons.

## Decision

We introduce a **domain model for context extraction settings** that is user‑configurable via the options page.

### Settings Domain Model

```typescript
interface ContextExtractionSettings {
  /** Minimum characters required to trigger a suggestion (default: 5) */
  minContextLength: number;

  /** Maximum characters to extract from cursor position (default: 200) */
  maxContextLength: number;

  /** Adjust truncation to nearest sentence boundary (default: true) */
  adjustToBoundary: boolean;
}

interface SkipConditions {
  /** Skip if input is empty or whitespace only (default: true) */
  skipIfEmpty: boolean;

  /** Skip if input contains only emoji characters (default: true) */
  skipIfEmojiOnly: boolean;

  /** Skip if input appears to be a URL (default: false) */
  skipIfUrlOnly: boolean;
}

interface UserPreferences {
  /** Master toggle for the extension (default: true) */
  enabled: boolean;

  /** Accept key: 'tab' | 'ctrl+semicolon' (default: 'tab') */
  acceptKey: 'tab' | 'ctrl+semicolon';

  /** Context extraction settings */
  context: ContextExtractionSettings;

  /** Skip conditions */
  skip: SkipConditions;
}
```

### Default Values

| Setting | Default | Rationale |
|---------|---------|-----------|
| `minContextLength` | 5 | Allows short phrases like "ありがとう" while filtering noise |
| `maxContextLength` | 200 | Balances context richness with performance |
| `adjustToBoundary` | true | Avoids cutting sentences mid‑way for better AI comprehension |
| `skipIfEmpty` | true | No value in suggesting emoji for empty input |
| `skipIfEmojiOnly` | true | User already has emoji; avoid redundant suggestions |
| `skipIfUrlOnly` | false | Some users may want emoji after sharing links |

### Behaviour

1. **Extraction**: Read up to `maxContextLength` characters before the cursor.
2. **Boundary adjustment**: If `adjustToBoundary` is true, find the nearest sentence‑ending punctuation (`.`, `。`, `!`, `?`, `\n`) and truncate there.
3. **Validation**: If extracted text length < `minContextLength`, skip suggestion.
4. **Skip checks**: Apply `SkipConditions` in order; if any returns true, skip suggestion.
5. **Fallback**: If skipped, normal typing and browser keys behave as normal.

## Consequences

* Users gain fine‑grained control over when and how suggestions trigger.
* The `core/` module exposes a pure `extractContext(text, settings)` function that is easily unit‑tested.
* Settings are persisted via `chrome.storage.local` and never include user text.
* Future enhancements (e.g., per‑site overrides) can extend this model without breaking changes.
* Additional complexity in the options page UI, but justified by user flexibility.
