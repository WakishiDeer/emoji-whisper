# ADR 0003: Use Chrome built‑in AI APIs exclusively

## Status

Accepted – 02 Feb 2026

## Context

The extension needs to determine an appropriate emoji based on the user’s text.  There are several possible approaches:

* **On‑device large language model (LLM).**  Chrome 138 and later include built‑in AI APIs such as the Prompt API that run Gemini Nano locally.  These APIs provide natural‑language prompts without sending data off device and are available via the `LanguageModel` interface【12913944222195†L245-L266】.  However, they are only supported on certain desktop operating systems (Windows 10/11, macOS 13+, Linux, Chromebook Plus) and require at least 22 GB of free storage and either a GPU with >4 GB VRAM or a CPU with ≥16 GB RAM【12913944222195†L245-L266】.
* **Rule‑based heuristics.**  We could use a hand‑written dictionary or sentiment analysis to map words to emojis without requiring AI.  While reliable in some cases, it lacks nuance and does not evolve with user context.
* **Remote AI services.**  External LLM APIs (such as Gemini Pro) could provide high‑quality suggestions but would require sending user text to a server, raising privacy concerns.

In our previous discussions we considered including a rule‑based fall‑back.  The user has now decided to drop the fall‑back and rely solely on on‑device AI.  If the built‑in model is not available, suggestions should be disabled.

## Decision

We will implement **on‑device AI only**:

* The extension will check model availability via `LanguageModel.availability()`【12913944222195†L287-L295】 and only call the Prompt API if the built‑in model is ready.  If the result indicates `unavailable` or `downloading`, the extension will display a brief message and not attempt to generate a suggestion.  No heuristic or remote fall‑back will be used.
* The prompt will instruct the model to return a single emoji that best matches the sentiment or mood of the provided context.
* We acknowledge that this decision limits the extension to devices meeting Chrome’s hardware and OS requirements【12913944222195†L245-L266】, and to Chrome 138+ where the Prompt API is stable【781462543024743†L136-L142】.  The trade‑off is justified by the privacy benefits and the desire to avoid dual logic paths.

## Consequences

* Users whose devices do not meet the requirements will see a message that emoji suggestions are unavailable.  They will still be able to use the Tab key normally.
* The extension’s code remains simpler and easier to maintain because there is no second suggestion engine.
* The decision can be revisited if built‑in AI adoption remains low.  A future ADR can introduce a remote or rule‑based option behind an opt‑in setting.
