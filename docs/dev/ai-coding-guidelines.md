# AI Coding Guidelines

These guidelines help ensure that AI‑assisted coding remains aligned with our specification and testing processes.  They are especially important because our extension deals with keyboard events, browser APIs and privacy‑sensitive content.

## 1. Anchor AI prompts in specification and tests

* When using an AI tool (such as an LLM) to generate code, always provide the relevant specification excerpts (functional requirements, non‑functional requirements and acceptance criteria) and the current failing tests.  This ensures the AI is constrained by the project context.
* Avoid generic prompts like “Write the code for this feature.”  Instead, be explicit: “Implement a function that extracts the last sentence from a string as described in AC‑1 and passes the given unit tests.”

## 2. Review and understand AI suggestions

* Do not commit AI‑generated code blindly.  Read the code, understand how it works and ensure it satisfies the specification and tests.
* Pay special attention to event handling, asynchronous behaviour and integration with Chrome’s APIs.  AI may produce code that uses unsupported APIs or incorrect patterns (e.g. using background pages instead of service workers).

## 3. Preserve privacy and security

* Ensure that AI‑generated code does not introduce calls to remote servers or third‑party libraries that are not explicitly allowed.  All suggestions must remain on device.
* If the AI suggests using network calls or external services to implement a feature, reject the suggestion and refine the prompt to focus on local APIs (e.g. the Prompt API).

## 4. Keep tests authoritative

* Tests are the source of truth.  If AI‑generated code passes tests but appears overly complex or includes unnecessary functionality, refactor it.  If the code fails tests or deviates from the specification, discard it and revise the prompt.

## 5. Document decisions

* If AI produces a novel approach or reveals an edge case, capture the reasoning in an ADR or update the specification.  Documentation ensures that future contributors understand why the code is implemented in a certain way.

## 6. Respect project conventions

* Follow the existing coding style, naming conventions and module boundaries.  AI tools may default to different styles; adjust the output to match the project.
* Keep core logic in the `core/` module, separate from WXT‑specific code.  This allows for easier testing and potential migration.

See also: [WXT Development Guidelines](wxt-development-guidelines.md) for WXT-specific structure and entrypoint conventions.

## 6.1 Commenting guidelines (keep them minimal but meaningful)

* Comments are required when they encode domain intent that is not obvious from types/tests.
* Prefer making code self-explanatory via names and types; use comments to capture invariants and rationale.

Recommended places to add comments:

* **Domain aggregates/entities (src/core/domain/...)**
  * State machines: list allowed states and transitions (e.g., `Idle -> Pending -> Shown -> Completed`).
  * Invariants: document what must always hold (e.g., "when Shown, suggestion is non-null").
  * Policy/rules: explain cooldown/same-context suppression and why.
* **Ports (src/core/ports/...)**
  * Clarify responsibilities and contract (inputs, outputs, and error semantics).
* **Infrastructure/UI (src/extension/...)**
  * Only comment event wiring when it is easy to break (IME composition handling, Tab interception constraints).
  * Avoid duplicating the specification in comments.

## 7. Use English for all artifacts

* All documentation, specifications, ADRs, comments, identifiers and user‑facing strings MUST be written in English.
* If a Japanese prompt or requirement is provided, translate it to English before writing or updating files.

## 8. Maintain the changelog

* Every change MUST be recorded in [docs/CHANGELOG.md](docs/CHANGELOG.md) under the **Unreleased** section.
* The entry SHOULD be concise and reflect the user‑visible impact or specification updates.

## 9. Keep the repository tree authoritative

* Any file/folder operation (create, move, rename, delete) MUST be described by updating the ASCII tree in [docs/architecture/repository-structure.md](../architecture/repository-structure.md).
* When asking an AI tool to add or move files, include the relevant subtree (ASCII tree snippet) in the prompt so the tool places files correctly.

## 10. Always run lint and typecheck after agent edits

When an AI agent (or any AI-assisted workflow) changes code, validate the workspace before considering the change “done”:

* `pnpm lint`
* `pnpm typecheck`

Run `pnpm test:run` when the change touches domain logic, parsers, state machines, or any code covered by unit tests.

## 10.1 Do not edit developer-local runner config

- Do not modify [web-ext.config.ts](../../web-ext.config.ts) in AI-driven changes.
- It is expected to contain machine-specific absolute paths and local profile configuration.
- If local changes are required to debug WXT runner behavior, keep them uncommitted and document the workaround in dev docs.

## 11. Use unified logging (no ad-hoc console)

When adding runtime diagnostics, use the unified logging component instead of ad-hoc `console.*` calls.

- Use `createExtensionLogger(scope)` from `src/extension/diagnostics/logger.ts`.
- Log messages MUST use stable `messageKey` values (e.g. `controller.start`, `ai.generate.success`) so logs are searchable and consistent.
- Logs MUST NOT include raw user input (typed text, extracted context, prompts). Prefer lengths, hashes, and enumerated reason codes.
- For debugging only, a redaction helper exists in core (`redactText(...)`) to represent sensitive values without storing them.

Local override:

- In the page console, set `globalThis.__EMOJI_COMPLETION_LOG_LEVEL__ = 'debug' | 'info' | 'warn' | 'error'` and reload.

Migration checklist:

1. Add `createExtensionLogger('<scope>')` at module init (entrypoint/controller/adapter).
2. Replace `console.*` with `logger.debug/info/warn/error('<messageKey>', meta)`.
3. Use stable keys (no dynamic strings).
4. Never log raw user text; log only lengths, hashes, and enumerated reasons.
5. Add/extend unit tests for core logging behavior when adding new log domain rules.
