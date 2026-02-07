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
emoji-completion/
├─ eslint.config.mjs
├─ package.json
├─ pnpm-lock.yaml
├─ tsconfig.json
├─ tsconfig.eslint.json
├─ wxt.config.ts
├─ tests/
│  └─ unit/
│     ├─ context-service.test.ts
│     ├─ emoji-suggestion-usecase.test.ts
│     ├─ key-utils.test.ts
│     ├─ logger.test.ts
│     ├─ mirror-content.test.ts
│     ├─ orchestrator.test.ts
│     ├─ overlay.test.ts
│     ├─ prompt-api-detection.test.ts
│     ├─ prompt-service.test.ts
│     ├─ suggestion-parser.test.ts
│     ├─ suggestion-session.test.ts
│     ├─ throttle.test.ts
│     └─ user-preferences.test.ts
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
│  │  └─ 0011-cursor-position-prompt-tuning.md
│  ├─ architecture/
│  │  └─ repository-structure.md
│  ├─ dev/
│  │  └─ wxt-development-guidelines.md
│  ├─ spec/
│  └─ CHANGELOG.md
├─ modules/                         # Local WXT modules (optional)
├─ public/                          # Copied as-is to build output
└─ src/
   ├─ entrypoints/                  # WXT entrypoints (bundled by WXT)
   │  └─ content.ts
   ├─ extension/                    # Infrastructure/UI (browser APIs, DOM)
   │  ├─ diagnostics/               # Diagnostics (logging, tracing)
   │  │  ├─ console-log-sink.ts
   │  │  └─ logger.ts
   │  ├─ adapters/                  # Prompt API, storage, availability, etc.
   │  │  └─ prompt-api.ts
   │  ├─ content-script/            # DOM integration, overlay UI
   │  │  ├─ controller.ts
   │  │  ├─ dom-utils.ts
   │  │  ├─ input-snapshot.ts
   │  │  ├─ overlay.ts
   │  │  └─ README.md
   │  └─ options/                   # Options page UI
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
   │  │  │  └─ user-preferences.ts
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
   ├─ assets/                       # CSS/images processed by WXT (optional)
   │  └─ content.css
   └─ env.d.ts
   ├─ components/                   # UI components (optional)
   ├─ composables/                  # Vue composables (optional)
   ├─ hooks/                        # React/Solid hooks (optional)
   └─ utils/                        # Generic utilities (optional)
```
