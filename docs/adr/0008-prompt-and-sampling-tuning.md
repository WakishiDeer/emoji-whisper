# ADR 0008: Prompt and Sampling Tuning for Emoji Diversity

## Status

Accepted – 06 Feb 2026

## Context

Users reported that emoji suggestions were repetitive and biased toward a small set of common sentiment emoji (e.g. 😊, ❤️, 😂) regardless of the specific objects, activities, or topics mentioned in the input text. Investigation identified two root causes:

1. **`topK: 3` hardcoded in the Prompt API adapter.** The Chrome LanguageModel API's `topK` parameter limits the number of top-probability tokens considered at each generation step. With only 3 candidates, the model could never select niche or context-specific emoji because common sentiment tokens dominated every distribution. Combined with `temperature: 0.7`, the effective output diversity was capped at ~3 emoji per sentiment category.

2. **Generic system prompt.** The system prompt only instructed the model to match "tone/sentiment." It provided no guidance on prioritising specific nouns, objects, or activities mentioned in the text, and included no few-shot examples to demonstrate the expected behaviour.

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| Increase `topK` only (e.g. to 40) | Simple change, wider candidate pool | May produce irrelevant emoji without prompt guidance |
| Improve prompt only | Better guidance for the model | `topK: 3` still caps candidates regardless of instructions |
| **Both: increase `topK` + improve prompt** | Addresses both bottlenecks; model can follow specific instructions and has room to select from a wider pool | Slightly more complex change; requires tuning `topK` default |
| Add a post-generation diversity filter | Could re-roll if same emoji is repeated | Adds latency; doesn't fix the root cause |

## Decision

We adopt the combined approach:

### 1. Expose `topK` in `PromptConfig`

Add a `topK: number` field to the `PromptConfig` value object with a default of **8**. The Prompt API adapter reads `config.topK` instead of using a hardcoded value. This allows future tuning via the settings page without code changes.

**Why 8?** Values of 3 are too restrictive. Values above 20 risk nonsensical tokens entering the pool for a task that expects a single emoji character. 8 provides a reasonable balance: the model can distinguish between 🎸 and 😊 for "playing guitar" while still being constrained enough to avoid random symbols. The default can be adjusted based on user feedback.

### 2. Improve the system prompt

The system prompt template now:

- Instructs the model to prefer emoji that *directly represent specific objects, animals, food, activities, or places* mentioned in the text.
- Adds guidance for single-word / short-phrase inputs and metaphorical matching when no emoji directly represents the concept.
- Falls back to general sentiment/mood only when nothing specific is mentioned.
- Includes **12 few-shot examples** across 5 categories (all unique emoji, no duplicates), chosen to teach the SLM diverse mapping patterns while staying within context-window budget (~120 extra tokens):

| Category | Example input | Emoji | Rationale |
|----------|--------------|-------|-----------|
| Sentence (specificity) | "I am playing guitar with friends" | 🎸 | Direct object match |
| Sentence (sentiment fallback) | "I am so happy today" | 😊 | No specific object → sentiment |
| Single word | "pizza" | 🍕 | Noun → direct representation |
| Single word | "rocket" | 🚀 | Noun → direct representation |
| Tech term | "debugging the code" | 🐛 | Domain metaphor |
| Tech term | "shipped to production" | 📦 | Domain metaphor |
| Abstract emotion | "feeling overwhelmed" | 😵‍💫 | Specific emotion emoji |
| Abstract emotion | "so proud of you" | 🏆 | Metaphorical sentiment |
| Greeting / idiom | "good morning" | ☀️ | Conventional association |
| Greeting / idiom | "happy birthday" | 🎂 | Conventional association |
| No-direct-emoji concept | "meeting at 3pm" | 📅 | Closest metaphorical match |
| No-direct-emoji concept | "working from home" | 🏠 | Closest metaphorical match |

### 3. Improve the user prompt suffix

Both character mode and sentence mode prompts now end with "Prefer a specific emoji over a generic sentiment emoji" to reinforce the system prompt instruction at inference time.

### 4. Future: user-configurable settings

`topK`, `temperature`, `beforeSentenceCount`, and `afterSentenceCount` are designed as value-object fields that will be exposed on the extension's settings page in a future iteration. The `PromptConfig` and `UserPreferences` types already carry these values, so the settings UI only needs to bind to them and persist via `chrome.storage.local`.

## Consequences

- **Improved diversity.** With `topK: 8` and a specificity-first prompt, the model now has both the instruction and the token budget to select context-appropriate emoji.
- **Backward compatible.** The change does not alter any public API or port interface. Existing tests are updated to match the new default prompt text.
- **Tunable.** Users (and developers) can adjust `topK` and `temperature` to trade off diversity vs. predictability once the settings page is implemented.
- **Potential regression.** The few-shot examples in the system prompt consume tokens from the context window. For Gemini Nano's context sizes this is negligible, but we should monitor if very long user text combined with the prompt exceeds limits.
- **Not a complete fix for same-context repetition.** The `same-context` skip rule (AC-11) still prevents re-rolling. A separate "re-roll on dismiss" feature may be considered in a future ADR.
