# Copilot Instructions

This file provides project-specific guidance for GitHub Copilot and other AI assistants working in this repository. Always read and follow these instructions before generating or modifying code and documentation.

## Required Reading

Before making any changes, consult the relevant documents in the following directories:

### Specification (`docs/spec/`)
All files in this directory define the product requirements, acceptance criteria, and ubiquitous language. Key documents include:
- `overview.md` – Project purpose and scope
- `functional-requirements.md` – Functional requirements (MUST/SHOULD/COULD)
- `non-functional-requirements.md` – Performance, privacy, accessibility
- `acceptance-criteria.md` – Testable scenarios
- `out-of-scope.md` – Features explicitly excluded from MVP
- `glossary.md` – Ubiquitous language and term definitions

Always check for new or updated files in this directory.

### Architecture Decision Records (`docs/adr/`)
All ADR files document architectural choices and their rationale. Read any ADR relevant to the feature you are implementing. Examples:
- `0001-use-wxt.md` – WXT framework adoption
- `0002-keybinding-tab-behavior.md` – Tab key behavior
- `0003-ai-engine-ondevice-first.md` – On-device AI only
- `0004-testing-strategy.md` – Vitest + Playwright strategy
- `0005-context-extraction-settings.md` – Context length settings domain model
- `0006-domain-model-design.md` – DDD-based design

New ADRs may be added; always scan this directory for the latest decisions.

### Development Process (`docs/dev/`)
All files in this directory describe how to develop, test, and complete features:
- `ai-coding-guidelines.md` – AI-assisted coding rules
- `workflow-tdd.md` – Specification and test-driven development
- `definition-of-done.md` – Checklist for completing a feature
- `wxt-development-guidelines.md` – WXT-specific project structure and constraints

### Repository Structure (`docs/architecture/`)
- `repository-structure.md` – Authoritative ASCII tree for file placement

### Changelog
- [docs/CHANGELOG.md](docs/CHANGELOG.md) – Project changelog (must be updated with every change)

## Rules

### Language
- All documentation, code comments, identifiers, and user-facing strings MUST be in English.
- Translate any Japanese prompts or requirements to English before writing files.

### Changelog
- Every change MUST be recorded in [docs/CHANGELOG.md](docs/CHANGELOG.md) under the **Unreleased** section.
- Entries should be concise and reflect user-visible impact or specification updates.

### Code Structure
- Keep domain logic in `src/core/`, separate from WXT-specific extension code in `src/extension/`.
- Dependencies flow from `src/extension/` (infrastructure) to `src/core/` (domain), never the reverse.
- WXT entrypoints (content scripts, background/service worker, options UI, etc.) live in `src/entrypoints/` and should be kept thin.
- Follow the domain model defined in ADR 0006 (entities, value objects, aggregates, ports).

### File Operations
- Any file/folder operation (create, move, rename, delete) MUST be expressed by updating the ASCII tree in [docs/architecture/repository-structure.md](../docs/architecture/repository-structure.md).
- When proposing changes that touch files, include the relevant subtree (ASCII snippet) so placement is unambiguous.

### Privacy and Security
- All AI inference MUST use Chrome's on-device Prompt API. No remote calls allowed.
- Never transmit user text off-device.
- Request only minimal permissions. Add permissions (e.g. `storage`) only when the feature that requires them is implemented.

### Testing
- Write unit tests in `tests/unit/` using Vitest.
- Write E2E tests in `tests/e2e/` using Playwright.
- Derive tests from acceptance criteria (AC-1 through AC-12).
- Mock the Prompt API in unit/integration tests.

### Before Making Changes
1. Read the relevant specification and ADR documents.
2. Identify which acceptance criteria apply.
3. Ensure the change aligns with out-of-scope exclusions.

### After Making Changes
1. Run `vitest run` to verify unit tests pass.
2. Run `playwright test` to verify E2E tests pass.
3. Update documentation if behavior or specifications changed.
4. Add an entry to [docs/CHANGELOG.md](docs/CHANGELOG.md).
5. Verify all Definition of Done items are satisfied.

## Summary

Emoji Whisper suggests a single emoji based on user input using Chrome/Edge's on-device AI. It targets `<textarea>` and `<input type="text">` only, proposes suggestions after an idle pause (and optionally Enter), uses Tab to accept suggestions, and prioritizes privacy by never sending data off-device. Follow the specifications, respect the domain model, write tests first, and keep everything in English.
