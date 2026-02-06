# Development Workflow – Specification and Test Driven

This guide describes how to turn user requirements into working code using specification‑driven development (SDD) and test‑driven development (TDD).  Following this process ensures that new features align with the documented requirements and that regressions are caught early.

## 1. Start with the specification

* Before writing any code, update the relevant files under `docs/spec/` to reflect the new feature or change.  The **overview** explains the motivation, the **functional requirements** define new behaviour, the **non‑functional requirements** clarify quality attributes, and the **acceptance criteria** list testable scenarios.
* If the feature involves an architectural choice or trade‑off, record the decision in a new ADR under `docs/adr/`.

## 2. Derive tests from acceptance criteria

* For each acceptance criterion, write a corresponding E2E test scenario using Playwright. Use descriptive test names that reference the criteria (e.g. `AC-1 generates a suggestion when AI is available`). Place these tests in `tests/e2e/`.
* Identify pure functions or small pieces of logic implied by the requirements (domain rules, parsers, state machines). Write unit tests for these using Vitest, placing them in `tests/unit/`.
  * Unit tests are expected to run via `pnpm test:run`.
  * Prefer unit tests for logic in `src/core/` (no DOM or browser APIs).
* Use integration tests (Vitest + JSDOM) only when a behaviour depends on DOM wiring (e.g., overlay insertion/removal). Keep them small and focused.
* When mocking the Prompt API, prefer mocking via the `src/core/ports/*` interfaces (e.g., `SuggestionGenerator`, `AvailabilityChecker`) rather than relying on global browser objects.

## 3. Write the minimal code to satisfy the tests

* Implement the smallest amount of code needed to make the failing test pass.  For unit tests, this might mean adding a new function in the `core/` module.  For E2E tests, wire up the event listeners in the content script and service worker.
* Do not implement features that are not required by the current test or specification.  Avoid prematurely optimising or adding extra options.

Recommended local command loop:

* `pnpm test:run`
* `pnpm lint`
* `pnpm typecheck`
* `pnpm build` (when wiring changes touch entrypoints/content scripts)

## 4. Refactor and document

* Once tests pass, refactor the code for readability, maintainability and performance.  Ensure that the public API of modules remains stable and that all tests still pass.
* Update documentation (README, ADRs, specification) to reflect any changes discovered during implementation.

## 5. Continuous integration

* Configure the CI pipeline to run unit tests and E2E tests automatically on each pull request.  The pipeline should build the extension via WXT, run the Vitest suite and then launch Playwright against the built extension.
* Only merge changes that pass all tests and have updated documentation.

## 6. AI‑assisted coding

* Developers may use AI tools to accelerate coding; however, they must follow the guidelines in `docs/dev/ai-coding-guidelines.md`.  In particular, AI suggestions should be constrained by the current specification and tests.  Do not accept code from AI without understanding and verifying it.
