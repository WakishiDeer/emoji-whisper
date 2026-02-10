# Emoji Whisper 🤫

<p align="center">
  <img src="src/assets/icon-background.svg" alt="Emoji Whisper icon" width="128" />
</p>

A Chrome/Edge browser extension that suggests a single context-appropriate emoji while you type ✨ — powered entirely by **on-device AI**.

## ✨ Features

- 🧠 **On-device AI** — Uses Chrome's built-in [Prompt API](https://developer.chrome.com/docs/ai/built-in) so your text **never leaves your machine**.
- 👻 **Ghost-text overlay** — The suggested emoji appears inline near the cursor as subtle ghost text.
- ⌨️ **Tab to accept, Esc to dismiss** — Minimal keyboard interaction that stays out of your way.
- 💬 **Reasoning on hover** — Hover over the suggestion to see *why* that emoji was chosen.
- 🌐 **IME-aware** — Suggestions are suppressed during IME composition (Japanese, Chinese, Korean, etc.).
- ♿ **Accessibility** — ARIA live regions announce suggestions for screen readers.

## 📋 Prerequisites

| Requirement | Details |
|---|---|
| **Browser** | Google Chrome 138+ or Microsoft Edge (equivalent version) |
| **Prompt API** | The browser's on-device AI must be available. Chrome will download the model automatically when the API is first used. |

**⚠️ Note**
If the on-device model is not available on your device (e.g. insufficient hardware), the extension will show a message and gracefully disable suggestions. See `chrome://on-device-internals/` or `edge://on-device-internals/` for more details.

> Recommended test site is here: [Prompt API playground](https://microsoftedge.github.io/Demos/built-in-ai/playgrounds/prompt-api/)

## 📦 Installation

### Extension Store

*Coming soon.*

### Sideload (developer mode)

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/WakishiDeer/emoji-whisper.git
   cd emoji-whisper
   pnpm install
   ```

2. Build the extension:

   ```bash
   pnpm build
   ```

3. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the `.output/chrome-mv3/` directory.

## 🛠️ Development

```bash
pnpm install          # Install dependencies
pnpm dev              # Dev build (no browser runner)
pnpm build            # Production build
pnpm build:dev        # Dev build with inline sourcemaps
```

### 🧪 Testing

```bash
pnpm test:run         # Unit tests (Vitest)
pnpm test:e2e         # E2E tests (Playwright)
pnpm typecheck        # TypeScript type check
pnpm lint             # ESLint
```

### 🗂️ Project Structure

```
src/
├─ core/              # Domain logic (pure, no browser APIs)
│  ├─ domain/         # Entities, value objects, aggregates
│  ├─ ports/          # Interface contracts
│  ├─ services/       # Application services
│  └─ shared/         # Shared utilities (logging, hashing)
├─ entrypoints/       # WXT entrypoints (content scripts, etc.)
└─ extension/         # Infrastructure adapters & UI
   ├─ adapters/       # Prompt API adapter
   ├─ content-script/ # Content script controller & overlay
   └─ diagnostics/    # Runtime diagnostics
```

Dependencies flow inward: `entrypoints/` → `extension/` → `core/` (never the reverse).

## 🏗️ Tech Stack

- [WXT](https://wxt.dev/) — Browser extension framework (Manifest V3)
- [TypeScript](https://www.typescriptlang.org/)
- [Vitest](https://vitest.dev/) — Unit testing
- [Playwright](https://playwright.dev/) — E2E testing
- [Chrome Prompt API](https://developer.chrome.com/docs/ai/built-in) — On-device AI inference
- [Edge Prompt API](https://learn.microsoft.com/en-us/microsoft-edge/web-platform/prompt-api) — On-device AI inference

## 📄 License

[MIT](LICENSE)
