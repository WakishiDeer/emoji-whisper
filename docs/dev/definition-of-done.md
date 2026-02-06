# Definition of Done

For a feature or change to be considered “done” and ready for release, the following criteria must be satisfied.  This checklist ensures that each change is fully specified, tested, documented and integrated.

## Specification and documentation

* [ ] Relevant files under `docs/spec/` are updated (overview, functional requirements, non‑functional requirements and acceptance criteria).
* [ ] If the change introduces a new architectural decision or revises an existing one, a corresponding ADR has been added or updated under `docs/adr/`.
* [ ] Developer documentation (`docs/dev/`) has been updated if the workflow or guidelines change.

## Implementation

* [ ] The change is implemented in the appropriate modules (`core/`, `extension/`, etc.) and adheres to the chosen framework (WXT) structure.
* [ ] No unauthorised network calls or external services are introduced; all data remains on device.
* [ ] The code follows the project’s coding conventions and is free of obvious smells.

## Testing

* [ ] New or updated **unit tests** have been written in `tests/unit/` and pass (`pnpm test:run`).  Tests cover both expected and edge cases.
* [ ] New or updated **integration tests** (if applicable) have been written and pass.
* [ ] New or updated **end‑to‑end tests** have been added under `tests/e2e/` and pass (`playwright test`).  The tests validate the acceptance criteria.

## Review and CI

* [ ] The code has been peer‑reviewed by at least one team member.
* [ ] All tests pass in the continuous integration environment.
* [ ] ESLint passes (`pnpm lint`).
* [ ] TypeScript typecheck passes (`pnpm typecheck`).
* [ ] The code compiles and builds successfully with WXT (`wxt build`).
* [ ] The change log or release notes have been updated (if applicable).

Only when all items above are checked off can the feature be merged into the main branch and considered complete.
