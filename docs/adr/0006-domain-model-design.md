# ADR 0006: Domain Model Design (DDD-Based)

## Status

Accepted – 02 Feb 2026

## Context

ADR 0005 defined the settings model for context extraction, but several DDD (Domain-Driven Design) elements were missing:

- Explicit definition of ubiquitous language
- Clear bounded context boundaries
- Distinction between entities and value objects
- Aggregates and their invariants
- Separation of domain services and ports
- Definition of domain events

This ADR addresses these gaps and provides implementation guidelines for the `core/` module.

## Decision

### 0. Repository Structure (Authoritative)

The canonical file/folder layout for this project is defined in:

- [Repository Structure (Authoritative)](../architecture/repository-structure.md)

Any file/folder operation (create/move/rename/delete) MUST be reflected by updating that ASCII tree.

### 1. Bounded Contexts

```
┌─────────────────────────────────────────────────────┐
│  Emoji Suggestion Context (extension boundary)      │
│                                                     │
│  ┌──────────────────┐                               │
│  │ src/entrypoints/  │                               │
│  │ (WXT Entrypoints) │                               │
│  └─────────┬────────┘                               │
│            │ uses                                   │
│            ▼                                        │
│  ┌─────────────────────┐      ┌─────────────────┐  │
│  │ src/extension/      │      │ src/core/       │  │
│  │ (Infrastructure/UI) │─────►│ (Domain Layer)  │  │
│  │                     │      │                 │  │
│  │ - ContentScript     │      │ - Domain Types  │  │
│  │ - OptionsPage       │      │ - Services      │  │
│  │ - StorageAdapter    │      │ - Ports         │  │
│  │ - PromptAPIAdapter  │      │ - Events        │  │
│  └─────────────────────┘      └─────────────────┘  │
└─────────────────────────────────────────────────────┘
              ▲
              │ Dependency direction (outside → inside)
              ▼
┌─────────────────────────────────────────────────────┐
│  Chrome Built-in AI Context (external)              │
└─────────────────────────────────────────────────────┘
```

- `src/entrypoints/` contains WXT entrypoints (the outermost wiring layer).
- `src/extension/` is the infrastructure layer handling browser APIs, DOM manipulation and persistence.
- `src/core/` contains pure domain logic with no browser or DOM API dependencies.
- Dependencies always flow from outside to inside: `src/entrypoints/` → `src/extension/` → `src/core/`.

### 2. Entities and Value Objects

| Type | Classification | Rationale |
|------|----------------|----------|
| `UserPreferences` | Entity | Persisted and updated by user actions |
| `SuggestionSession` | Entity | Has state transitions (Idle → Pending → Shown → Completed) |
| `ContextExtractionSettings` | Value Object | Immutable collection of settings |
| `SkipConditions` | Value Object | Immutable set of condition flags |
| `Context` | Value Object | Extracted text fragment, immutable |
| `Suggestion` | Value Object | Emoji returned by AI, immutable |
| `PromptConfig` | Value Object | Fixed system prompt template and model options for the Prompt API |

### 3. Aggregates

#### UserPreferences Aggregate
```
UserPreferences (Aggregate Root)
├── enabled: boolean
├── acceptKey: AcceptKey
├── context: ContextExtractionSettings (value)
└── skip: SkipConditions (value)
```

Invariants:
- `context.minContextLength > 0`
- `context.maxContextLength >= context.minContextLength`
- `context.maxContextLength <= 1000`
- `acceptKey` must be a value from the allowed list

#### SuggestionSession Aggregate
```
SuggestionSession (Aggregate Root)
├── state: SessionState (Idle | Pending | Shown | Completed)
├── context: Context | null (value)
├── suggestion: Suggestion | null (value)
└── completedReason: 'accepted' | 'dismissed' | null
```

Invariants:
- When `state === 'Shown'`, `suggestion !== null`
- When `state === 'Idle'`, `context === null && suggestion === null`

### 4. Domain Services

| Service | Responsibility |
|---------|----------------|
| `ContextExtractor` | Extracts a `Context` from text based on settings |
| `SkipEvaluator` | Determines whether to skip suggestion based on `Context` and `SkipConditions` |
| `PromptBuilder` | Constructs the prompt string to send to the AI from a `Context` and `PromptConfig`, enforcing single-emoji output |

### 5. Ports (Interfaces)

| Port | Responsibility | Implementation |
|------|----------------|----------------|
| `SuggestionGenerator` | Calls AI and returns a `Suggestion` | `src/extension/adapters/PromptAPIAdapter` |
| `PreferencesRepository` | Persists and retrieves preferences | `src/extension/adapters/StorageAdapter` |
| `AvailabilityChecker` | Checks AI availability | `src/extension/adapters/PromptAPIAdapter` |

### 6. Domain Events

```
SuggestionRequested   : Suggestion generation was requested
SuggestionGenerated   : AI returned a suggestion
SuggestionShown       : Overlay was displayed
SuggestionAccepted    : User accepted the suggestion
SuggestionDismissed   : User dismissed the suggestion
SuggestionSkipped     : Suggestion was skipped due to conditions (with reason)
SuggestionFailed      : AI invocation failed
```

Events are used for logging, future telemetry and triggering state transitions.

## Consequences

- Domain logic is decoupled from browser dependencies, making unit testing straightforward.
- Combined with the glossary, vocabulary is unified across specifications, design and implementation.
- Explicit aggregate invariants enable early detection of bugs.
- Defining ports allows easy mock substitution of the Prompt API in tests.
- Initial implementation complexity increases, but long-term maintainability and extensibility improve.

## Related Documents

- [ADR 0005: Context Extraction Settings](0005-context-extraction-settings.md)
- [Glossary](../spec/glossary.md)
