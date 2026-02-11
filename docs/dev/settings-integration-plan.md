# Settings Integration Plan

This document tracks the remaining work to make the Options/Popup settings pages **actually affect** the content script's suggestion behavior. The UI and storage layers already exist (ADR 0012); the gap is that the content script ignores stored preferences and uses hardcoded defaults.

## 1. Current State

| Layer                                                             | Status          | Detail                                                                                                       |
| ----------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------ |
| Domain model (`UserPreferences`, `PresetMode`, `DisplaySettings`) | Done            | Fully validated; 37 unit tests passing                                                                       |
| Options page & Popup UI                                           | Done            | React components render all fields, persist via `StorageAdapter`                                             |
| `StorageAdapter` (`PreferencesRepository`)                        | Done            | Reads/writes via `browser.storage.local` directly (to be refactored to WXT `storage.defineItem` in Step 4.5) |
| Content script reads preferences                                  | **Not started** | `controller.ts` uses `DEFAULT_USER_PREFERENCES` / `DEFAULT_PROMPT_CONFIG` exclusively                        |
| Background service worker                                         | **Not started** | No `background.ts` entrypoint exists                                                                         |
| Settings bridge (storage → MAIN world)                            | **Not started** | Content script is in `world: 'MAIN'` and cannot access WXT storage or extension messaging APIs               |
| `enabled` flag enforcement                                        | **Not started** | Controller always runs; no check for `prefs.enabled`                                                         |

### Hardcoded defaults in `controller.ts`

| Line(s)   | What's hardcoded                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------- |
| L18       | `DEFAULT_SETTINGS = DEFAULT_USER_PREFERENCES.context`                                                               |
| L19       | `DEFAULT_SKIP = DEFAULT_USER_PREFERENCES.skip`                                                                      |
| L192–L197 | `beginEmojiSuggestionRequest()` receives `DEFAULT_SETTINGS`, `DEFAULT_SKIP`, `DEFAULT_PROMPT_CONFIG`, `COOLDOWN_MS` |
| L208      | `ai.checkAvailability(DEFAULT_PROMPT_CONFIG)`                                                                       |
| L228–L233 | `ai.generateSuggestion(..., DEFAULT_PROMPT_CONFIG, ...)`                                                            |

### Architectural constraint

The content script runs in `world: 'MAIN'` (see `src/entrypoints/content.ts` L11). The MAIN world has **no access** to `browser.storage.local`, WXT's `storage` wrapper, `browser.runtime.onMessage`, or any extension API. Any settings delivery requires a bridge from the extension's isolated world.

## 2. Gap Analysis (Critical Path — G1 through G3)

| ID  | Gap                                       | Acceptance Criteria                     |
| --- | ----------------------------------------- | --------------------------------------- |
| G1  | Content script ignores stored preferences | AC-8 (settings persist across restart)  |
| G2  | No bridge from WXT storage to MAIN world  | Prerequisite for G1                     |
| G3  | `enabled` flag not checked                | Extension cannot be disabled from popup |

### Deferred gaps (to be addressed in a separate iteration)

| ID  | Gap                                                                     | Detail                         |
| --- | ----------------------------------------------------------------------- | ------------------------------ |
| G4  | No inline validation errors in SettingsForm                             | AC-19                          |
| G5  | No React component tests                                                | `OptionsApp`, `PopupApp`, etc. |
| G6  | No E2E tests for settings pages                                         | AC-14 through AC-21            |
| G7  | `display.showUnavailableToast/showReasonTooltip` not read by controller | AC-20, AC-21                   |
| G8  | `adjustToBoundary` / `cursorMarker` not in SettingsForm                 | FR-8 minor fields              |
| G9  | `enabled` toggle missing from Options page (only in Popup)              | AC-14                          |

## 3. Chosen Architecture

See **ADR 0013** for full rationale.

```
┌─────────────────────────┐      prefsItem.watch()
│  Options / Popup (React)│ ──save──▶ browser.storage.local (via WXT) ◀────────┐
└─────────────────────────┘                  │                          │
                                             │ read + watch             │
                                             ▼                          │
                              ┌──────────────────────────────┐          │
                              │  settings-bridge.content.ts  │          │
                              │  (ISOLATED world)            │          │
                              │  — prefsItem.getValue()      │          │
                              │  — prefsItem.watch()         │          │
                              └──────────┬───────────────────┘          │
                                         │ window.postMessage           │
                                         ▼                              │
                              ┌──────────────────────────────┐          │
                              │  content.ts (MAIN world)     │          │
                              │  — SettingsReceiver          │          │
                              │    implements SettingsProvider│          │
                              │  — controller uses dynamic   │          │
                              │    settings via SettingsProvider         │
                              └──────────────────────────────┘
```

Message protocol: `{ type: 'EMOJI_WHISPER_SETTINGS', payload: UserPreferences }`

## 4. Implementation Steps (TDD)

All steps follow the TDD workflow defined in `docs/dev/workflow-tdd.md`: write failing tests first, then implement the minimal code to satisfy them.

### Step 1 — ADR 0013: Settings Bridge Architecture

- [x] Create `docs/adr/0013-settings-bridge-architecture.md`
- Record bridge decision, alternatives considered, consequences.

### Step 2 — Domain: `SettingsProvider` port

- [ ] Define `src/core/ports/settings-provider.ts`
  - `getCurrent(): UserPreferences` — synchronous getter
  - `onChange(callback: (prefs: UserPreferences) => void): () => void` — subscribe; returns unsubscribe function
- [ ] Write unit tests: port contract, callback invocation, unsubscribe behavior
- [ ] Update `docs/architecture/repository-structure.md`

### Step 3 — Background service worker

- [ ] Create `src/entrypoints/background.ts` (thin WXT entrypoint)
  - Watch preferences via `prefsItem.watch()` → log changes
  - Minimal; service workers are non-persistent in MV3
- [ ] Update `docs/architecture/repository-structure.md`

### Step 4 — Settings protocol (shared constants)

- [ ] Create `src/extension/content-script/settings-protocol.ts`
  - Message type constant: `EMOJI_WHISPER_SETTINGS`
  - Type definitions for the postMessage payload
- [ ] Update `docs/architecture/repository-structure.md`

### Step 4.5 — Shared WXT storage item definition

- [ ] Create `src/extension/adapters/storage-items.ts`
  - `storage.defineItem<UserPreferences>('local:userPreferences', { fallback: DEFAULT_USER_PREFERENCES })`
  - Single source of truth imported by `StorageAdapter`, bridge, background, and settings UI
- [ ] Refactor `StorageAdapter` to use `prefsItem.getValue()` / `prefsItem.setValue()` instead of raw `browser.storage.local`
- [ ] Refactor `usePreferences` hook to use `prefsItem` directly (removing `StorageAdapter` dependency in UI)
- [ ] Update `docs/architecture/repository-structure.md`

### Step 5 — Bridge: ISOLATED-world content script (TDD)

- [ ] Create `src/entrypoints/settings-bridge.content.ts` (`world: 'ISOLATED'`, default)
  - On load: read via `prefsItem.getValue()`, post to page via `window.postMessage()`
  - Watch via `prefsItem.watch()` → repost updated prefs
- [ ] Write unit tests: message shape, storage read on load, change propagation
- [ ] Update `docs/architecture/repository-structure.md`

### Step 6 — Receiver: MAIN-world settings listener (TDD)

- [ ] Create `src/extension/content-script/settings-receiver.ts`
  - Listens for `window.message` events matching protocol type
  - Applies 3-layer validation protocol (see ADR 0013):
    1. **Envelope guard**: `event.data?.type === 'EMOJI_WHISPER_SETTINGS'` — silently ignore unrelated messages
    2. **Structure guard**: verify `payload` is a non-null object with expected top-level keys — log warning and drop on failure
    3. **Domain validation**: `createUserPreferences(payload)` — log error and drop on failure
  - Implements `SettingsProvider` port
- [ ] Write unit tests: valid message, envelope rejection, structural rejection, domain rejection, callback invocation, unsubscribe
- [ ] Update `docs/architecture/repository-structure.md`

### Step 7 — Controller refactoring (TDD)

- [ ] Extend `createEmojiCompletionController()` to accept `SettingsProvider` dependency
- [ ] Replace all 6 hardcoded default usages with `settingsProvider.getCurrent()`
- [ ] Add `enabled` check: if `prefs.enabled === false`, skip suggestion flow
- [ ] Subscribe to `settingsProvider.onChange()` for mid-session changes
- [ ] Merge `prefs.topK` / `prefs.temperature` into prompt config at call site
- [ ] Write unit tests:
  - Controller uses injected settings
  - Controller stops when `enabled=false`
  - Controller picks up setting changes
  - Prompt config reflects `topK`/`temperature` from preferences

### Step 8 — Wiring in `content.ts`

- [ ] Instantiate `SettingsReceiver` in `content.ts`
- [ ] Pass it as `SettingsProvider` to `createEmojiCompletionController()`
- [ ] No `StorageAdapter` instantiation in MAIN world

### Step 9 — Documentation & changelog

- [ ] Update `docs/architecture/repository-structure.md` (ASCII tree) with all new files
- [ ] Add entries to `docs/CHANGELOG.md` under **Unreleased**
- [ ] Verify definition-of-done checklist

## 5. Verification

```bash
pnpm test:run      # All unit tests pass (existing + new)
pnpm typecheck     # No type errors
pnpm lint          # Clean
pnpm build         # Extension builds without errors
```

Manual verification:

1. Load built extension → open Options → change a setting (e.g., toggle `enabled` off)
2. Verify content script stops producing suggestions
3. Change `topK` → check log output reflects new value
4. Restart browser → verify settings persist (AC-8)

## 6. Out of Scope (This Iteration)

- Inline validation error display (AC-19)
- React component tests
- E2E tests for settings pages (AC-14 through AC-21)
- `display.showUnavailableToast` / `showReasonTooltip` enforcement in controller
- `adjustToBoundary` / `cursorMarker` fields in SettingsForm
- `enabled` toggle on Options page (currently Popup only)
