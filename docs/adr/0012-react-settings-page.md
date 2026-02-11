# ADR 0012: React-Based Settings Page with Popup and Options Page

## Status

Accepted

## Date

2026-02-11

## Context

FR-8 (Settings page) and FR-9 (Persistent preferences) specify that the extension SHOULD provide an options page for all user-configurable preferences and persist them via `chrome.storage.local`. Currently:

- No options page entrypoint exists.
- No popup exists.
- The `PreferencesRepository` port is defined but has no `StorageAdapter` implementation.
- `UserPreferences` does not include `topK` or `temperature` (those live in `PromptConfig` as static defaults).
- React is not installed.

Building a settings UI requires form controls with validation, state management, and two rendering surfaces (popup for quick access, options page for full configuration). A vanilla HTML/JS approach would become unwieldy as the number of configurable fields grows.

### Options considered

| Option | Pros | Cons |
|--------|------|------|
| Vanilla HTML + JS | Zero dependencies; smallest bundle | No component model; manual state/DOM sync; hard to maintain as field count grows |
| **React + ReactDOM (chosen)** | **Component model; rich ecosystem; WXT official module support (`@wxt-dev/module-react`); familiar to most contributors** | **~40 kB gzipped runtime; overkill for very simple UIs** |
| Preact | ~3 kB runtime; React-compatible API | Smaller ecosystem; occasional compat issues with React libraries |
| Svelte | Compiled; no runtime overhead | Different paradigm; no official WXT module; smaller contributor pool |

## Decision

We adopt React (+ ReactDOM) for the Options page and Popup entrypoints, using the WXT module `@wxt-dev/module-react` for seamless integration with the Vite/WXT build pipeline.

### 1. Two UI surfaces

| Surface | Purpose | Scope |
|---------|---------|-------|
| **Popup** (`src/entrypoints/popup/`) | Quick controls when clicking the extension icon | Enable/disable toggle, preset mode selector, link to full Options page |
| **Options page** (`src/entrypoints/options/`) | Full settings configuration | All preferences: preset modes, enable/disable, accept key, topK, temperature, context extraction, skip conditions, reset to defaults |

Both entrypoints are thin WXT shells (HTML + `main.tsx` mounting a React root). Shared React components live in `src/extension/settings-ui/`.

### 2. Preset Modes

To simplify configuration for users who do not want to tune individual settings, we introduce **Preset Modes** — named configuration profiles that batch-apply a set of user preferences.

| Mode | Description | Key values |
|------|-------------|------------|
| **Simple** | Conservative; minimal context | `contextMode: 'characters'`, `maxContextLength: 100`, all skips on, `topK: 3`, `temperature: 0.5` |
| **Balanced** | Current FR-8 defaults | `contextMode: 'sentences'`, `beforeSentenceCount: 2`, `afterSentenceCount: 1`, `topK: 8`, `temperature: 0.7` |
| **Creative** | Wider context; more diverse suggestions | `contextMode: 'sentences'`, `beforeSentenceCount: 3`, `afterSentenceCount: 2`, `topK: 15`, `temperature: 1.2` |
| **Custom** | Full manual control | User-configured values (no preset override) |

**UX behaviour:** Selecting a preset pre-fills all individual settings fields. If the user manually changes any individual setting while a named preset is active, the mode automatically transitions to "Custom". The selected mode is persisted alongside other preferences.

### 3. Domain model extension

`UserPreferences` will be extended with:

- `topK: number` (1–40, default 8) — moved from `PromptConfig` static default to user-configurable.
- `temperature: number` (0.0–2.0, default 0.7) — moved from `PromptConfig` static default to user-configurable.
- `presetMode: PresetMode` — the currently active preset mode (`'simple' | 'balanced' | 'creative' | 'custom'`).
- `display: DisplaySettings` — UI display toggles (see below).

A new value object `PresetMode` and preset value mappings will live in `src/core/domain/preferences/preset-mode.ts`.

#### DisplaySettings value object

A new `DisplaySettings` value object groups UI presentation preferences, following the same `Readonly<{...}>` pattern as `SkipConditions` and `ContextExtractionSettings`:

```typescript
type DisplaySettings = Readonly<{
  showUnavailableToast: boolean;  // default: true
  showReasonTooltip: boolean;     // default: true
}>;
```

| Field | Default | Description |
|-------|---------|-------------|
| `showUnavailableToast` | `true` | When false, suppresses the toast notification shown when the Prompt API is unavailable or the model is downloading. |
| `showReasonTooltip` | `true` | When false, suppresses the reason tooltip that appears when hovering over the ghost emoji overlay. |

**Preset mode exclusion:** `DisplaySettings` is **not** affected by preset mode switching. Presets control AI-tuning and context parameters only. Display preferences are personal UI choices that persist independently across preset changes.

This value object lives in `src/core/domain/preferences/display-settings.ts` and is designed to accommodate future UI toggles (e.g., overlay opacity, toast duration) without growing the flat `UserPreferences` surface.

### 4. Infrastructure

- `src/extension/adapters/storage-adapter.ts` implements `PreferencesRepository` using `chrome.storage.local`.
- The `storage` permission will be re-added to `wxt.config.ts` manifest.
- `@wxt-dev/module-react` will be added as a dev dependency, along with `react` and `react-dom`.
- `src/core/domain/preferences/display-settings.ts` — `DisplaySettings` value object with defaults and validation.

## Consequences

### Positive

- Component-based UI scales well as settings grow.
- Shared components between popup and options page reduce duplication.
- Preset modes lower the barrier for non-technical users while preserving full control for advanced users.
- `topK` and `temperature` become user-configurable, fulfilling FR-8.

### Negative

- React adds ~40 kB gzipped to the options/popup bundles (acceptable for non-content-script entrypoints).
- Two new entrypoints increase build output size slightly.

### Risks

- Ensure React is loaded only in popup/options pages, never in the content script (to avoid page performance impact).
