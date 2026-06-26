# Repository Structure (Authoritative)

This document is the single source of truth for this repository’s intended layout.

## Rules

- All file/folder operations (create, move, rename, delete) MUST be described by updating the ASCII tree in this document.
- Any change that adds/moves files MUST keep dependencies flowing from `src/entrypoints/` (WXT entrypoints) → `src/extension/` (infrastructure/UI) → `src/core/` (domain), never the reverse.
- This tree intentionally includes only key directories (and a few anchor files) to stay stable over time.

## Placement Rules

- WXT entrypoints (content scripts, background/service worker, options UI, etc.) live in `src/entrypoints/`.
- Shared extension infrastructure/UI code lives in `src/extension/` and may import from `src/core/`.
- Domain logic (pure, testable, no browser/DOM APIs) lives in `src/core/`.

## ASCII Tree

```text
emoji-whisper/
├─ LICENSE
├─ README.md
├─ eslint.config.mjs
├─ package.json
├─ pnpm-lock.yaml
├─ pnpm-workspace.yaml
├─ tsconfig.json
├─ tsconfig.eslint.json
├─ web-ext.config.ts
├─ vitest.config.ts                    # Vitest unit-test configuration (scoped to tests/unit/)
├─ wxt.config.ts
├─ playwright.config.ts               # Playwright E2E test configuration
├─ tests/
│  ├─ unit/
│  │  ├─ context-service.test.ts
│  │  ├─ emoji-suggestion-usecase.test.ts
│  │  ├─ key-utils.test.ts
│  │  ├─ logger.test.ts
│  │  ├─ mirror-content.test.ts
│  │  ├─ orchestrator.test.ts
│  │  ├─ overlay.test.ts
│  │  ├─ prompt-api-detection.test.ts
│  │  ├─ prompt-service.test.ts
│  │  ├─ suggestion-parser.test.ts
│  │  ├─ suggestion-session.test.ts
│  │  ├─ throttle.test.ts
│  │  ├─ user-preferences.test.ts
│  │  ├─ preset-mode.test.ts
│  │  ├─ display-settings.test.ts
│  │  └─ storage-adapter.test.ts
│  └─ e2e/
│     ├─ helpers/
│     │  ├─ extension-fixture.ts    # Custom fixture: persistent context + extension
│     │  └─ mock-language-model.ts  # Configurable LanguageModel mock + selectors
│     ├─ seed.spec.ts               # Seed test: extension loads + mock works
│     ├─ suggestion-flow.spec.ts    # AC-1: basic suggestion flow
│     ├─ ai-availability.spec.ts    # AC-2: AI unavailability & graceful failure
│     ├─ ime-composition.spec.ts    # AC-3: IME composition handling
│     ├─ keyboard-behavior.spec.ts  # AC-4/AC-6: Esc, Tab, Shift+Tab behavior
│     ├─ unsupported-inputs.spec.ts # AC-5: non-supported input types
│     ├─ skip-conditions.spec.ts    # AC-7: skip rules (short, emoji-only, etc.)
│     ├─ accessibility.spec.ts      # AC-9: ARIA attributes
│     ├─ cancellation.spec.ts       # AC-10/AC-12: cancellation & selection
│     ├─ cooldown.spec.ts           # AC-11: cooldown & same-context suppression
│     ├─ tooltip.spec.ts            # AC-13: reason tooltip on hover
│     └─ fixtures/
│        └─ test-site.html          # Comprehensive manual/E2E test page
├─ .output/                         # WXT build output (generated)
├─ .wxt/                            # WXT generated files (generated)
├─ .github/
│  └─ copilot-instructions.md
├─ .vscode/
│  ├─ launch.json
│  └─ tasks.json
├─ docs/
│  ├─ adr/
│  │  ├─ 0001-use-wxt.md
│  │  ├─ 0002-keybinding-tab-behavior.md
│  │  ├─ 0003-ai-engine-ondevice-first.md
│  │  ├─ 0004-testing-strategy.md
│  │  ├─ 0005-context-extraction-settings.md
│  │  ├─ 0006-domain-model-design.md
│  │  ├─ 0007-bidirectional-sentence-context.md
│  │  ├─ 0008-prompt-and-sampling-tuning.md
│  │  ├─ 0009-chain-of-thought-reason.md
│  │  ├─ 0010-inline-mirror-overlay.md
   │  ├─ 0011-cursor-position-prompt-tuning.md
   │  └─ 0012-react-settings-page.md
│  ├─ architecture/
│  │  └─ repository-structure.md
│  ├─ dev/
│  │  ├─ ai-coding-guidelines.md
│  │  ├─ definition-of-done.md
│  │  ├─ workflow-tdd.md
│  │  └─ wxt-development-guidelines.md
│  ├─ proposals/
│  ├─ spec/
│  │  ├─ acceptance-criteria.md
│  │  ├─ functional-requirements.md
│  │  ├─ glossary.md
│  │  ├─ non-functional-requirements.md
│  │  ├─ out-of-scope.md
│  │  └─ overview.md
│  └─ CHANGELOG.md
└─ src/
   ├─ entrypoints/                  # WXT entrypoints (bundled by WXT)
   │  ├─ content.ts
   │  ├─ options/                   # Options page entrypoint (React)
   │  │  ├─ index.html
   │  │  └─ main.tsx
   │  └─ popup/                     # Popup entrypoint (React)
   │     ├─ index.html
   │     └─ main.tsx
   ├─ extension/                    # Infrastructure/UI (browser APIs, DOM)
   │  ├─ diagnostics/               # Diagnostics (logging, tracing)
   │  │  ├─ console-log-sink.ts
   │  │  └─ logger.ts
   │  ├─ adapters/                  # Prompt API, storage, availability, etc.
   │  │  ├─ prompt-api.ts
   │  │  └─ storage-adapter.ts      # PreferencesRepository via chrome.storage.local
   │  ├─ settings-ui/               # React components (shared by popup & options)
   │  │  ├─ OptionsApp.tsx
   │  │  ├─ PopupApp.tsx
   │  │  ├─ PresetSelector.tsx
   │  │  ├─ SettingsForm.tsx
   │  │  ├─ usePreferences.ts       # Hook: load/save preferences via StorageAdapter
   │  │  ├─ options.css              # Options page styles
   │  │  └─ popup.css                # Popup styles
   │  └─ content-script/            # DOM integration, overlay UI
   │     ├─ controller.ts
   │     ├─ dom-utils.ts
   │     ├─ input-snapshot.ts
   │     ├─ overlay.ts
   │     └─ README.md
   ├─ core/                         # Pure domain logic (no browser/DOM APIs)
   │  ├─ shared/                    # Cross-cutting, domain-agnostic utilities/types
   │  │  ├─ hash/
   │  │  │  └─ djb2.ts
   │  │  └─ log/
   │  │     ├─ log-entry.ts
   │  │     ├─ log-level.ts
   │  │     └─ log-redaction.ts
   │  ├─ domain/                    # Entities, value objects, invariants
   │  │  ├─ keyboard/
   │  │  │  └─ key-utils.ts
   │  │  ├─ context/
   │  │  │  ├─ context.ts
   │  │  │  ├─ context-extraction.ts
   │  │  │  └─ context-hash.ts
   │  │  ├─ overlay/
   │  │  │  └─ mirror-content.ts
   │  │  ├─ preferences/
   │  │  │  ├─ user-preferences.ts
   │  │  │  ├─ preset-mode.ts       # PresetMode type + preset value mappings
   │  │  │  └─ display-settings.ts  # DisplaySettings value object + defaults
   │  │  └─ suggestion/
   │  │     ├─ suggestion.ts
   │  │     ├─ suggestion-skip-policy.ts
   │  │     ├─ suggestion-parser.ts
   │  │     └─ suggestion-session.ts
   │  ├─ services/                  # Domain services (pure)
   │  │  ├─ logger.ts
   │  │  ├─ context.ts
   │  │  ├─ emoji-suggestion-usecase.ts
   │  │  ├─ throttle.ts
   │  │  ├─ prompt.ts
   │  │  └─ emoji-suggestion-orchestrator.ts
   │  ├─ ports/                     # Interfaces implemented by extension
   │  │  ├─ availability-checker.ts
   │  │  ├─ suggestion-generator.ts
   │  │  ├─ clock.ts
   │  │  ├─ log-sink.ts
   │  │  └─ preferences-repository.ts
   │  └─ events/                    # Domain events
   │     └─ suggestion-events.ts
   ├─ assets/                       # CSS/images processed by WXT
   │  ├─ content.css
   │  ├─ icon.svg
   │  └─ icon-background.svg
   └─ env.d.ts
```
