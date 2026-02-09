# ADR 0009: Chain-of-Thought Prompting with Reason Output

## Status

Accepted

## Date

2026-02-06

## Context

The Emoji Whisper extension uses a direct prompt that asks the model to output a single emoji character. While simple, this approach limits inference quality — the model must produce a final answer without any intermediate reasoning step. For ambiguous inputs (e.g., "fire" could mean anger, excitement, or a literal fire), the model has no mechanism to disambiguate before committing to an emoji.

Chain-of-Thought (CoT) prompting is a well-established technique where the model is asked to articulate its reasoning before producing the final answer. Research shows this improves accuracy by 10–25% on interpretive tasks, because:

1. The model must evaluate the input's meaning before choosing.
2. Self-consistency between stated reason and final answer reduces impulsive outputs.
3. Ambiguous inputs get resolved through explicit interpretation.

Additionally, capturing the model's reason creates an opportunity to show the user *why* a particular emoji was suggested, improving transparency and trust.

## Decision

We adopt Chain-of-Thought prompting by changing the model output format from a bare emoji to a JSON object: `{ "reason": "<short English sentence>", "emoji": "<single emoji>" }`.

### Key design choices

1. **JSON output format.** The prompt instructs the model to output valid JSON with `reason` and `emoji` fields. The parser attempts JSON parsing first, with a fallback to bare-emoji extraction for resilience.

2. **Reason always in English.** Regardless of the input language, the reason is always in English to keep prompts simple and to avoid multi-language complexity for the tooltip display. The prompt explicitly states: "reason must be one short sentence in English, under 15 words."

3. **`SuggestionResult` value object.** A new composite value object `SuggestionResult = { emoji: Suggestion; reason: string }` is introduced in the domain layer. The existing `Suggestion` branded type is preserved for the emoji component.

4. **`maxTokens` increased to 64.** The JSON structure plus a 15-word reason requires approximately 40–50 tokens. We increase `maxTokens` from 10 to 64 to accommodate this. On-device inference latency increase is estimated at 100–200 ms, which stays within the NFR budget.

5. **Tooltip on hover.** The overlay element switches from `pointer-events: none` to `pointer-events: auto` with a CSS-only tooltip that appears on hover. A `mousedown` event guard prevents the tooltip interaction from stealing focus from the input field. The tooltip displays the English reason text.

6. **Reason logged to console.** The reason is included in the `ai.generate.success` log entry for debugging and quality evaluation.

7. **Graceful fallback.** If the model returns a bare emoji rather than JSON, the parser falls back to the existing single-emoji extraction logic and uses a default reason string `"(no reason provided)"`.

## Consequences

### Positive

- Improved emoji selection accuracy through forced reasoning.
- User transparency: hover tooltip explains *why* this emoji was chosen.
- Debug-friendly: reason appears in console logs.
- Backward-compatible: fallback handles non-JSON model output.

### Negative

- Increased token usage (~6x) and slight latency increase (~100–200 ms per suggestion).
- `pointer-events: auto` on the overlay requires careful focus-steal prevention.
- JSON parsing adds a failure mode (mitigated by fallback).

### Risks

- On-device models may occasionally produce malformed JSON. The fallback parser mitigates this.
- Increased `maxTokens` could rarely cause the model to generate extraneous output. JSON parsing and single-emoji validation prevent any non-emoji content from reaching the user.

## Alternatives Considered

1. **Keep bare emoji output.** Simpler but forgoes accuracy improvement and reason display.
2. **Two-pass prompting (reason first, then emoji in a second call).** More accurate but doubles latency and session cost — rejected for MVP.
3. ~~**Structured output via model constraints.** Not available in the current Prompt API surface.~~ → See update below.

## Update — 2026-02-07: Adopted `responseConstraint`

Chrome 137+ introduced `responseConstraint` on `session.prompt()`, which accepts a JSON Schema object and structurally forces the model output to conform. Since our target is Chrome 138+ extensions, this feature is now available.

### Changes

- **`session.prompt(input, { responseConstraint: schema })`** is now used in `PromptAPIAdapter.generateSuggestion()`. The JSON Schema enforces `{ reason: string, emoji: string }` with `additionalProperties: false`.
- **System prompt simplified.** JSON format instructions ("Output MUST be valid JSON", "respond with valid JSON") and the trailing "Return valid JSON" instruction are removed. The schema constraint handles format enforcement; the prompt retains only content-quality guidance (emoji selection rules, reason length/language, few-shot examples).
- **Fallback parser preserved.** `parseSuggestionResultFromModelOutput()` with its JSON-first + bare-emoji fallback remains unchanged. If `responseConstraint` throws `SyntaxError` (model can't conform) or `NotSupportedError` (schema feature unsupported), the adapter propagates the error and the controller shows a toast — same as any other generation failure.
- **Error handling.** `responseConstraint` errors (`DOMException` with name `SyntaxError` or `NotSupportedError`) are treated as generation failures (no retry). The existing `controller.ts` catch block handles them via toast message.

### Rationale

- Structured output eliminates the most common failure mode (malformed JSON from the model).
- Removing format instructions from the prompt saves input tokens and lets the model focus on content quality.
- The schema is automatically included in the model input by Chrome, replacing the explicit format instructions.
