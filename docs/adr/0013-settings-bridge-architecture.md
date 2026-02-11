# ADR 0013: Settings Bridge Architecture (ISOLATED → MAIN World)

## Status

Accepted

## Date

2026-02-11

## Context

ADR 0012 introduced the Options page and Popup UI, along with `StorageAdapter` for persisting `UserPreferences` via the WXT Storage API (`storage.defineItem` from `wxt/storage`). Internally WXT wraps `browser.storage.local`, providing type-safe access, `fallback` defaults, built-in versioning/migration, and a `.watch()` helper that works identically on Chrome and Firefox. However, the content script (`src/entrypoints/content.ts`) runs in `world: 'MAIN'` — the page's own JavaScript context — for direct DOM access (overlay rendering, caret positioning, input mutation).

The MAIN world has **no access** to:

- `browser.storage.local` (or any extension storage API, including WXT's `storage` wrapper)
- `browser.runtime.sendMessage` / `browser.runtime.onMessage`
- Any extension API beyond those explicitly exposed via `externally_connectable`

As a result, settings saved through the Options/Popup UI have zero effect on the content script's behavior. The controller uses hardcoded defaults (`DEFAULT_USER_PREFERENCES`, `DEFAULT_PROMPT_CONFIG`) at six call sites.

We need a mechanism to deliver stored preferences from the extension's isolated world to the MAIN-world content script, both at startup and when the user changes settings.

### Options considered

| Option                                                                       | Pros                                                                                                                                                                       | Cons                                                                                                                                                                                |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. ISOLATED-world content script bridge + `window.postMessage`**           | Simple; no background dependency for data flow; WXT Storage API available in ISOLATED world; `window.postMessage` is synchronous within same page; well-documented pattern | Two content scripts on every page; `postMessage` is visible to the page (mitigated by unique message type and not sending sensitive data)                                           |
| B. Background service worker + `chrome.scripting.executeScript`              | Centralized; no second content script                                                                                                                                      | Requires `scripting` permission; `executeScript` is asynchronous with round-trip to service worker; more complex lifecycle management; MV3 service workers suspend unpredictably    |
| C. Background service worker + external messaging (`externally_connectable`) | Clean separation                                                                                                                                                           | Requires manifest changes; complex setup; overkill for preferences delivery                                                                                                         |
| D. DOM-based bridge (custom DOM element / `CustomEvent`)                     | No `postMessage` noise                                                                                                                                                     | Fragile; page scripts can interfere with DOM; custom events don't carry structured data as cleanly; harder to distinguish from page events                                          |
| E. Shared `SharedArrayBuffer` / `BroadcastChannel`                           | Zero-copy; fast                                                                                                                                                            | Origin restrictions; `SharedArrayBuffer` requires COOP/COEP headers not available on most sites; `BroadcastChannel` not available in MAIN-world content scripts across all browsers |

## Decision

**Option A**: Add a second content script in the default ISOLATED world that reads stored preferences via the WXT Storage API (`storage.defineItem`), watches for changes with `.watch()`, and forwards `UserPreferences` to the MAIN-world content script via `window.postMessage`.

Additionally, a **background service worker** (`src/entrypoints/background.ts`) is added as standard extension infrastructure. It does not participate in the settings bridge data flow directly, but provides a foundation for future features (popup ↔ content communication, extension lifecycle events, badge updates, etc.) and logs preference changes for diagnostics.

### Why WXT Storage API over raw `browser.storage.local`

The current `StorageAdapter` uses `browser.storage.local` directly (via `wxt/browser`). By adopting `storage.defineItem` from `wxt/storage` across all storage access points, we gain:

| Benefit                  | Detail                                                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Type safety**          | `defineItem<UserPreferences>('local:userPreferences', { fallback })` returns a typed `WxtStorageItem<UserPreferences>` — no manual `Record<string, unknown>` casts |
| **Built-in `fallback`**  | `getValue()` returns the fallback value instead of `null` when the key is missing, replacing our manual merge logic                                                |
| **Built-in `.watch()`**  | `item.watch((newValue, oldValue) => { ... })` replaces manually wiring `browser.storage.onChanged` and parsing change sets                                         |
| **Versioned migrations** | `version` + `migrations` options handle schema evolution declaratively, replacing the manual deep-merge in `StorageAdapter.load()`                                 |
| **Cross-browser**        | Uses `browser.storage.local` internally, ensuring Chrome and Firefox compatibility without conditional code                                                        |

### Why `window.postMessage` over `chrome.runtime` messaging

Two fundamentally different messaging mechanisms exist for browser extensions:

| Aspect                 | `window.postMessage`                       | `chrome.runtime` messaging                                              |
| ---------------------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| **Scope**              | Same page, same `window`                   | Cross-process within the extension (background, popup, content scripts) |
| **MAIN world support** | Yes (Web standard)                         | **No** — MAIN world has no access to `chrome.runtime`                   |
| **Security**           | Any page script can send/receive           | Isolated to extension internals; page scripts cannot participate        |
| **Request/response**   | Manual (fire-and-forget)                   | Built-in (Promise-based `sendMessage` returns a response)               |
| **Cross-tab**          | No                                         | Yes (background mediates)                                               |
| **Data format**        | Structured clone (Blob, ArrayBuffer, etc.) | JSON-serializable only                                                  |
| **Performance**        | Fast — same process, no IPC                | Slightly slower — IPC via service worker                                |

**For ISOLATED ↔ MAIN communication, `window.postMessage` is the only option.** `chrome.runtime` messaging is unavailable in the MAIN world. This is a Chrome platform constraint, not a design choice.

We also considered `@webext-core/messaging` (by the WXT author), which provides:

- `defineExtensionMessaging` — type-safe wrapper around `chrome.runtime` messaging (background ↔ ISOLATED).
- `defineWindowMessaging` — type-safe wrapper around `window.postMessage` with automatic namespace isolation (ISOLATED ↔ MAIN).

**Current decision: use raw `window.postMessage`.** The settings bridge is a one-way push of a single data type (`UserPreferences`). The domain-layer `createUserPreferences()` validation already ensures type safety at the receiver. Adding a dependency for namespace isolation alone is unnecessary when a single `EMOJI_WHISPER_SETTINGS` type string suffices.

**Future consideration:** If popup ↔ background ↔ content script communication is needed (e.g., triggering suggestions from popup, badge updates), adopt `@webext-core/messaging` for `defineExtensionMessaging` and unify the Window Messaging side under `defineWindowMessaging` at the same time.

### Architecture

```
┌────────────────────────┐
│ Options / Popup (React)│
│ prefsItem.setValue()   │
└──────────┬─────────────┘
           │ writes
           ▼
   browser.storage.local    (wrapped by WXT storage.defineItem)
           │
     ┌─────┴──────────────────────────────┐
     │                                    │
     ▼                                    ▼
┌─────────────────────────┐   ┌───────────────────────┐
│ settings-bridge.content │   │ background.ts         │
│ (ISOLATED world)        │   │ (service worker)      │
│                         │   │                       │
│ • prefsItem.getValue()  │   │ • prefsItem.watch()   │
│ • prefsItem.watch()     │   │   → diagnostic log    │
│ • postMessage to page   │   │ • future: lifecycle   │
└──────────┬──────────────┘   └───────────────────────┘
           │ window.postMessage
           │ { type: 'EMOJI_WHISPER_SETTINGS', payload }
           ▼
┌─────────────────────────┐
│ content.ts (MAIN world) │
│                         │
│ SettingsReceiver        │
│ → implements            │
│   SettingsProvider port  │
│ → feeds controller      │
└─────────────────────────┘
```

### Shared storage item definition

A single `WxtStorageItem` is defined once and imported by all consumers (Options, Popup, bridge, background):

```typescript
// src/extension/adapters/storage-items.ts
import { storage } from "wxt/storage";
import type { UserPreferences } from "../../core/domain/preferences/user-preferences";
import { DEFAULT_USER_PREFERENCES } from "../../core/domain/preferences/user-preferences";

export const prefsItem = storage.defineItem<UserPreferences>(
  "local:userPreferences",
  {
    fallback: DEFAULT_USER_PREFERENCES,
    // Future: add `version` and `migrations` for schema evolution
  },
);
```

### Message protocol

```typescript
// Shared constant in src/extension/content-script/settings-protocol.ts
const SETTINGS_MESSAGE_TYPE = "EMOJI_WHISPER_SETTINGS" as const;

interface SettingsMessage {
  type: typeof SETTINGS_MESSAGE_TYPE;
  payload: UserPreferences;
}
```

- The `type` field uses a namespaced string to avoid collision with page messages.
- `payload` is a plain object matching the `UserPreferences` shape (value objects are serializable).
- The receiver applies a 3-layer validation protocol (see below) and silently drops malformed messages.

### Message validation protocol (3-layer)

The receiver (`SettingsReceiver`) applies three successive validation layers before accepting a `window.postMessage` payload:

| Layer        | Guard                                                                                                                                      | Purpose                                                                               | Failure action           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------ |
| 1. Envelope  | `event.data?.type === 'EMOJI_WHISPER_SETTINGS'`                                                                                            | Short-circuit unrelated messages (page scripts, other extensions, browser internals)  | Ignore silently (no log) |
| 2. Structure | `payload` is a non-null object with expected top-level keys (`context`, `skip`, `display`, `enabled`, `presetMode`, `topK`, `temperature`) | Reject structurally broken envelopes before entering domain validation                | Log warning, drop        |
| 3. Domain    | `createUserPreferences(payload)` succeeds                                                                                                  | Validate ranges, types, and invariants (e.g., `0 < topK ≤ 10`, `0 ≤ temperature ≤ 2`) | Log error, drop          |

Design rationale:

- **Layer 1** eliminates >99% of messages at near-zero cost — `window.postMessage` is noisy on real-world pages.
- **Layer 2** distinguishes structural errors (missing fields, wrong shape) from domain errors (out-of-range values), enabling clear diagnostics.
- **Layer 3** reuses the existing `createUserPreferences()` factory, ensuring the domain layer never receives unvalidated data. This is the single source of truth for what constitutes a valid `UserPreferences`.

### Domain port

A new `SettingsProvider` port is added to `src/core/ports/`:

```typescript
interface SettingsProvider {
  getCurrent(): UserPreferences;
  onChange(callback: (prefs: UserPreferences) => void): () => void;
}
```

- `getCurrent()` is synchronous; returns `DEFAULT_USER_PREFERENCES` until the first message arrives.
- `onChange()` returns an unsubscribe function.
- The controller reads settings from this port, keeping domain logic decoupled from the messaging mechanism.

### Controller changes

`createEmojiCompletionController()` will accept an optional `SettingsProvider` dependency. All six hardcoded-default usages (context settings, skip conditions, prompt config, cooldown) will be replaced with `settingsProvider.getCurrent()` reads. The `enabled` flag will gate the entire suggestion flow.

## Consequences

### Positive

- Settings changes take effect immediately without page reload (via `prefsItem.watch()` → bridge → receiver → controller).
- Clean separation: the domain port (`SettingsProvider`) has no knowledge of `postMessage` or WXT storage.
- The MAIN-world content script remains free of extension API dependencies.
- Background service worker provides infrastructure for future features.
- WXT Storage API gives type-safe, cross-browser storage access with built-in watch and migration support.
- Pattern is well-documented and used by other Manifest V3 extensions with MAIN-world content scripts.

### Negative

- Two content scripts run on every page (ISOLATED bridge + MAIN controller). The ISOLATED bridge is minimal (~20 lines) and adds negligible overhead.
- `window.postMessage` is visible to the host page. Mitigated by: unique message type string, no sensitive data in the payload (only UI preferences), receiver validates structure before accepting.
- Initial settings delivery is asynchronous: the controller will use defaults until the first `postMessage` arrives (typically within a few milliseconds of page load).

### Risks

- If `prefsItem.getValue()` is slow (e.g., corrupted storage), the bridge will delay settings delivery. Mitigated by the `fallback` default value in the storage item definition.
- Page scripts could theoretically spoof `EMOJI_WHISPER_SETTINGS` messages. Impact is low (worst case: extension uses attacker-chosen `topK`/`temperature` values, which are validated and bounded). Future hardening: add a one-time nonce shared between ISOLATED and MAIN scripts.
