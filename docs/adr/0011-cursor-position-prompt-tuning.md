# ADR 0011: Cursor-Position-Aware Prompt Tuning

## Status

Accepted – 07 Feb 2026

## Context

ADR 0007 introduced bidirectional sentence-based context extraction with a `[CURSOR]` marker inserted at the cursor position. ADR 0008 improved emoji diversity with specificity-first rules and 12 few-shot examples. However, user testing revealed that **cursor position awareness remained weak**: the model tended to suggest emoji that matched the overall sentiment of the text rather than fitting the specific position marked by `[CURSOR]`.

### Root cause analysis

1. **No `[CURSOR]`-aware few-shot examples.** All 12 existing examples showed complete sentences without a cursor marker. The model had no demonstration of how to interpret the `[CURSOR]` token or how to reason about text before and after it.

2. **No explicit cursor-position rules.** The system prompt contained no instruction to analyze text surrounding `[CURSOR]`. The only cursor-related guidance was in the user prompt suffix ("The emoji should best fit the position marked by [CURSOR]"), which is a weak signal compared to system-level rules with examples.

3. **Temperature too high for positional reasoning.** At `temperature: 0.7`, the model had enough randomness to drift toward generic sentiment emoji even when the prompt hinted at positional context.

4. **`expectedInputs` limited to English.** The Prompt API adapter declared `expectedInputs.languages: ['en']`, which may have caused the Chrome LanguageModel to deprioritise non-English token processing for Japanese and other language inputs.

### Options considered

| Option | Pros | Cons |
|--------|------|------|
| Add `[CURSOR]` few-shot examples only | Teaches by example; lowest risk | Without explicit rules, model may not generalise |
| Add cursor rules to system prompt only | Clear instruction | Without examples, SLMs struggle to follow abstract rules |
| **Both: rules + few-shot examples** | Rules set expectations; examples demonstrate the pattern | More tokens in prompt (~80 extra) |
| Fine-tune the model | Best quality | Out of scope (on-device, no fine-tuning API) |

## Decision

We adopt the combined approach: new system prompt rules for cursor-position awareness, 5 mid-text few-shot examples, a lower temperature, an enhanced user prompt suffix, and expanded `expectedInputs` languages.

### 1. Cursor-position rules in system prompt

Two new rules added to the Rules section of `DEFAULT_PROMPT_CONFIG.systemPromptTemplate`:

- *"When a [CURSOR] marker is present, the emoji MUST fit the context immediately surrounding [CURSOR]. Analyze what comes before AND after [CURSOR] to choose an emoji that belongs at that exact position."*
- *"In "reason", mention what context before and/or after the cursor influenced your choice."*

The second rule leverages CoT (ADR 0009) by forcing the model to articulate which surrounding words it used, improving selection accuracy through explicit reasoning.

### 2. Three-tier few-shot example structure

The few-shot examples are reorganised into three sections:

**a) Short input without cursor (2 examples)**
For character-mode prompts (`isSentenceMode = false`) where no `[CURSOR]` marker is present:
- `"pizza"` → 🍕, `"rocket"` → 🚀

**b) End-of-text with `[CURSOR]` (10 examples)**
For sentence-mode prompts where the cursor is at the end of the text. All examples now include the `[CURSOR]` marker at the end — matching the actual input format produced by `extractContextAroundCursor()`, which always inserts `[CURSOR]` even when afterContext is empty. Reasons use "Before cursor: ..." format:
- `"I am playing guitar with friends [CURSOR]"` → 🎸 ("Before cursor: playing guitar")
- `"debugging the code [CURSOR]"` → 🐛 ("Before cursor: debugging")
- etc.

**c) Mid-text with `[CURSOR]` (5 examples)**
For sentence-mode prompts where the cursor is in the middle of text. Each demonstrates bidirectional context analysis with "Before: ..., after: ..." reason format:

| Input | Emoji | Reason pattern |
|-------|-------|----------------|
| "I went to the [CURSOR] and bought some fresh fish." | 🏪 | Before: went to, after: bought fish |
| "The [CURSOR] was barking all night. I could not sleep." | 🐕 | Before: The, after: was barking |
| "We celebrated with [CURSOR] and dancing until midnight." | 🎶 | Before: celebrated with, after: and dancing |
| "She opened the [CURSOR] and started reading chapter one." | 📖 | Before: opened the, after: started reading |
| "After the long hike we relaxed by the [CURSOR] and roasted marshmallows." | 🔥 | Before: relaxed by the, after: roasted marshmallows |

### 3. Temperature and topK reduction

`temperature` lowered from `0.7` to `0.4` (via `0.6`). `topK` lowered from `8` to `5`. With the context window narrowed to a single sentence (see §6 below), the model operates on less text and needs to be more precise. The lower temperature reduces random drift toward generic sentiment emoji, while `topK: 5` constrains the candidate pool just enough to stay focused without being as restrictive as `topK: 3` (rejected in ADR 0008).

### 4. Enhanced user prompt suffix (sentence mode)

The suffix for sentence mode changed from:
> "The emoji should best fit the position marked by [CURSOR]. Prefer a specific emoji over a generic sentiment emoji."

To:
> "The emoji should best fit the position marked by [CURSOR]. Analyze the words before and after [CURSOR] carefully. Prefer a specific emoji over a generic sentiment emoji."

The added instruction reinforces positional analysis at inference time.

### 5. Expanded `expectedInputs` languages

`buildLanguageModelOptions()` in `prompt-api.ts` now passes `languages: ['en', 'ja', 'es']` for `expectedInputs` (previously `['en']` only). This signals to Chrome's LanguageModel that input text may be multilingual, potentially improving tokenisation and attention for non-English user text.

### 6. Narrowed default sentence context to cursor sentence only

`DEFAULT_SENTENCE_CONTEXT_SETTINGS` changed:
- `beforeSentenceCount`: `2` → `0`
- `afterSentenceCount`: `1` → `0`

With these defaults, `extractContextAroundCursor()` returns only the **partial sentence** immediately surrounding the cursor (text from the nearest boundary before the cursor to the nearest boundary after it), plus the `[CURSOR]` marker. No additional complete sentences are included.

**Rationale:** SLMs (Gemini Nano, Phi-mini) tend to be "pulled" by broader context — when 2–3 additional sentences are provided, the model drifts toward the overall sentiment/topic rather than focusing on the cursor position. By limiting context to the cursor's own sentence, the model concentrates on the immediately surrounding words.

**Extensibility preserved:** The `SentenceContextSettings` type, its fields (`beforeSentenceCount`, `afterSentenceCount`), and validation (0–10 range) are unchanged. When user settings are exposed via the options page, users can increase these values to restore broader context if desired.

## Consequences

### Positive

- **Stronger cursor-position signal.** The model receives rules, examples, and a reinforced suffix — three layers of guidance for `[CURSOR]` interpretation.
- **CoT quality boost.** Forcing the reason to cite before/after context improves reasoning chain quality and makes suggestions more transparent.
- **Multilingual robustness.** Expanded `expectedInputs` removes a potential quality bottleneck for Japanese and Spanish inputs.
- **Backward compatible.** No API, port, or type changes. All modifications are in prompt text and sampling defaults.

### Negative

- **Increased prompt size.** ~80 additional tokens from 5 new examples + 2 rules. For Gemini Nano's context window this remains well within budget, but should be monitored for very long user inputs.
- **Sampling changes affect all suggestions.** Lower temperature (0.4) and topK (5) make suggestions more deterministic across all modes. Revert toward 0.6/8 if user feedback indicates suggestions feel too predictable or narrow.
- **Narrower context may miss cross-sentence cues.** With `beforeSentenceCount: 0` and `afterSentenceCount: 0`, the model only sees the cursor's own sentence. If the emoji should reflect a broader topic established in prior sentences, it will be missed. Users can increase these values once settings are exposed.

### Future work

- **Evaluation harness.** Build a test-case-driven evaluation framework (Phase 2 from the tuning plan) to quantitatively measure the impact of these changes.
- **Separate temperature for cursor modes.** Consider using lower temperature for sentence mode (position-sensitive) and higher for character mode (creative).
- **Japanese few-shot examples.** Add language-specific examples in a future iteration once evaluation infrastructure is in place.
- **User-configurable sentence context.** Expose `beforeSentenceCount` and `afterSentenceCount` on the settings page so users can widen context if they prefer broader awareness.
