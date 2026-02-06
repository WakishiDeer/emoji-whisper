# ADR 0004: Testing strategy – Unit, Integration and End‑to‑End

## Status

Accepted – 02 Feb 2026

## Context

The extension contains core logic (context extraction, AI invocation, insertion) and browser‑specific interactions (event handling, DOM manipulation and service worker messaging).  Adopting test‑driven development (TDD) requires a clear strategy for which aspects are covered by unit tests and which are verified through end‑to‑end (E2E) tests.  We need to choose suitable frameworks for each layer.

## Decision

* **Unit tests** – We use [Vitest](https://vitest.dev/) to test pure domain logic. This includes context extraction, prompt construction, response parsing and state machine invariants. Vitest runs in Node and integrates with TypeScript, making it well suited for `src/core/`. Unit tests must not depend on browser APIs. Run locally via `pnpm test:run`.
* **Integration tests** – Where possible, we will test DOM manipulations using `@testing-library/dom` in conjunction with Vitest and JSDOM.  These tests will verify that our content script correctly inserts and removes the suggestion overlay in response to events.
* **End‑to‑end tests** – We will use [Playwright](https://playwright.dev/) to test the extension in a real Chromium browser.  Playwright supports loading unpacked extensions and automating interactions.  E2E tests will exercise the acceptance criteria: triggering suggestions, accepting/cancelling them, and ensuring the Tab key behaves appropriately.  Tests will run against a local build of the extension produced by WXT.

We considered using Cypress for E2E testing, but Playwright offers better support for extension contexts and can run headless or headed.  It also integrates well with Vitest for a unified runner.

## Consequences

* The project includes `tests/unit/` for unit tests and will include `tests/e2e/` for Playwright tests. When E2E tests are added, a `playwright.config.ts` file should configure the browser to load the built extension and run tests serially.
* The CI pipeline will run unit tests before E2E tests.  Breaking changes to the core logic will fail fast.
* Developers must mock the Prompt API in unit and integration tests since the API is only available in a real Chrome environment. Prefer mocking via core ports (e.g., `SuggestionGenerator`, `AvailabilityChecker`) rather than relying on global browser objects.
* E2E tests will run only on machines where Chrome 138+ is installed and built‑in AI is enabled.
