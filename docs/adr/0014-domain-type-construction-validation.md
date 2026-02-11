# ADR 0014: Domain Type Construction Validation

## Status

Accepted

## Date

2026-02-11

## Context

The domain model in `src/core/domain/` uses a mix of construction patterns:

| Pattern                        | Types                                                                                                                                               | Count |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| Branded type + factory         | `Context`, `ContextHash`, `Suggestion`, `SuggestionRequestId`                                                                                       | 4     |
| Class with private state       | `SuggestionSession`                                                                                                                                 | 1     |
| Plain `Readonly<{}>` + factory | `UserPreferences`, `ContextExtractionSettings`, `SentenceContextSettings`, `SkipConditions`, `DisplaySettings`, `MirrorContent`, `SuggestionResult` | 7     |

The plain `Readonly<{}>` types expose a structural risk: TypeScript does not enforce calling the factory function. Any object literal satisfying the structural shape is assignable to the type, bypassing validation logic in `createUserPreferences()`, `createContextExtractionSettings()`, etc.

Currently this risk is low — the project is small and all construction sites use factories by convention. However, as the settings bridge introduces serialization boundaries (`window.postMessage`, `storage.defineItem`), the risk of receiving unvalidated data increases.

### Guiding principle

> **Construction validation must be mandatory for types that cross serialization boundaries.**

`UserPreferences` is the primary (and currently only) type that crosses storage and messaging boundaries. Whether to extend mandatory construction to internal-only types is a cost/benefit decision to be evaluated with concrete implementation experience.

## Options under consideration

### S3: Full class refactoring

Convert all 7 plain `Readonly<{}>` types to classes with `private constructor` + `static create()`.

**Pros:**

- Every type enforces validation at construction — invalid state is impossible project-wide.
- Domain logic can live on the class as methods (e.g., `SkipConditions.shouldSkip()`).
- Consistent construction pattern across the entire domain layer.

**Cons:**

- ~57 spread sites and ~84 test assertions require rewriting.
- Nested `toJSON()` / `fromJSON()` chains add serialization complexity.
- Types that never cross serialization boundaries (`MirrorContent`, `SuggestionResult`, `PresetValues`) gain little practical benefit from class enforcement.
- Estimated effort: 2–3 days.

### S4: Targeted class refactoring (UserPreferences only)

Convert only `UserPreferences` to a class with `private constructor`, `static create()`, `with*()`, `toJSON()`, `fromJSON()`. All nested types (`ContextExtractionSettings`, `SkipConditions`, `DisplaySettings`, etc.) remain plain `Readonly<{}>`.

**Pros:**

- Minimal churn (~25 spread sites, ~20 test assertions).
- `UserPreferences.create()` validates all nested types internally — nested validation is still enforced at the aggregate boundary.
- Covers the actual serialization boundary (storage ↔ bridge ↔ MAIN world).
- Nested objects remain plain, so React component spread patterns (`{ ...prefs.context, minContextLength: n }`) work unchanged.
- S4 → S3 migration is straightforward if needed later.
- Estimated effort: 0.5–1 day.

**Cons:**

- Nested types can still be constructed without validation in isolation.
  - Mitigated: in practice, nested types only reach the system through `UserPreferences.create()` or the existing factory functions.

## Decision

**Adopt S4 (targeted class refactoring) for `UserPreferences`.** Extend to other types (S3) in follow-up PRs only if concrete implementation experience demonstrates the need.

### Rationale

`UserPreferences` is the only domain type that crosses serialization boundaries (storage ↔ bridge ↔ MAIN world). Enforcing construction validation at this aggregate boundary gives the highest return on investment with minimal churn. Nested types (`ContextExtractionSettings`, `SkipConditions`, `DisplaySettings`, `SentenceContextSettings`) remain plain `Readonly<{}>` — their validation is still mandatory because it is invoked inside `UserPreferences.create()`.

### Implementation specification

#### Class structure

- `UserPreferences` becomes a class with a `private constructor`.
- `static create(input: UserPreferencesInput): UserPreferences` replaces `createUserPreferences()` as the sole construction path.
- `static createDefault(): UserPreferences` provides a convenience factory for tests and initialization.
- `static fromJSON(raw: unknown): UserPreferences` handles deserialization from storage and `window.postMessage`, including schema-migration merge over defaults.
- `toJSON(): UserPreferencesInput` returns a plain serializable object for `browser.storage.local.set()` and `postMessage`.
- All fields are `readonly` public properties.
- Existing validation functions (`validateContextSettings`, `validateModelSettings`, `validateSentenceContextSettings`) are called inside the private constructor.

#### `UserPreferencesInput` type

A plain `Readonly<{}>` type matching the old `UserPreferences` shape. Exported for external code that passes plain objects (e.g., `fromJSON`, test setup).

#### Immutable update methods (`with*()`)

Each method returns a new validated `UserPreferences` instance. Methods that modify tuning/context/skip fields automatically set `presetMode` to `'custom'` (per ADR 0012, `withDisplay()` does **not** change preset mode).

| Method                         | Purpose                                            |
| ------------------------------ | -------------------------------------------------- |
| `withEnabled(enabled)`         | Toggle extension on/off                            |
| `withPresetMode(mode)`         | Change preset mode label                           |
| `withTopK(topK)`               | Change top-K sampling                              |
| `withTemperature(temperature)` | Change temperature                                 |
| `withContext(partial)`         | Partial-update context extraction settings         |
| `withSentenceContext(partial)` | Partial-update sentence context settings           |
| `withSkip(partial)`            | Partial-update skip conditions                     |
| `withDisplay(partial)`         | Partial-update display settings (no preset change) |
| `applyPreset(mode)`            | Apply preset values and set preset mode            |

#### Migration impact

| Layer            | Sites | Change                                                                           |
| ---------------- | ----- | -------------------------------------------------------------------------------- |
| `StorageAdapter` | 2     | `load()` → `UserPreferences.fromJSON(raw)`; `save()` → `prefs.toJSON()`          |
| `OptionsApp`     | 3     | `createUserPreferences()` → `UserPreferences.create()`; spread → `applyPreset()` |
| `PopupApp`       | 3     | spread → `withEnabled()`, `applyPreset()`                                        |
| `SettingsForm`   | 12    | spread → `with*()` methods                                                       |
| `usePreferences` | 1     | `DEFAULT_USER_PREFERENCES` → `UserPreferences.createDefault()`                   |
| `controller.ts`  | 2     | `DEFAULT_USER_PREFERENCES.*` → `UserPreferences.createDefault().*`               |
| Tests            | ~25   | spread → `UserPreferences.create()` / `createDefault()`                          |

#### `DEFAULT_USER_PREFERENCES` deprecation

The module-level constant is replaced by `UserPreferences.createDefault()`. For backward compatibility during migration, the constant is retained as a `@deprecated` re-export and will be removed in a subsequent PR.

### Future: S3 extension

If follow-up analysis shows that internal types benefit from class enforcement, apply the same pattern (`private constructor` + `static create()` + `with*()` + tests) per type in independent PRs. Priority order:

1. `SuggestionResult` — has a factory and may cross boundaries in future.
2. `MirrorContent` — has defensive clamping; class would formalize the invariant.
3. `SkipConditions`, `DisplaySettings` — boolean-only; low practical benefit.
4. `ContextExtractionSettings`, `SentenceContextSettings` — always validated via `UserPreferences.create()`.

## Consequences

### Positive

- Eliminates an entire class of bugs where unvalidated data propagates through the system.
- `StorageAdapter` and `SettingsReceiver` use `UserPreferences.fromJSON()` for deserialization — a single validated entry point.
- Aligns with the 3-layer message validation protocol defined in ADR 0013.

### Negative

- Breaking change for all test files that construct `UserPreferences` directly — mitigated by providing a `UserPreferences.createDefault()` convenience method.
- React components must adopt `with*()` methods for top-level updates instead of spread.

### Risks

- If S3 is chosen, the large refactoring scope may introduce regressions. Mitigated by comprehensive existing test coverage (193 unit tests).
- If S4 is chosen, future developers may forget to use factory functions for nested types. Mitigated by code review conventions and lint rules (potential custom ESLint rule for factory enforcement).
