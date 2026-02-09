# WXT Development Guidelines

This document captures WXT-specific project structure and development constraints for this repository.

This is **not** an ADR. It intentionally documents conventions and constraints that are operational in nature (project layout, entrypoints, and layering rules).

## Authoritative Project Structure

- The authoritative tree for file placement is [docs/architecture/repository-structure.md](../architecture/repository-structure.md).
- This project assumes WXT is configured with `srcDir: 'src'` (see ADR 0001).

## Entrypoints

- All WXT entrypoints MUST live under `src/entrypoints/`.
- Entrypoints SHOULD be thin and primarily responsible for wiring:
  - DOM / browser integration in `src/extension/`
  - domain logic in `src/core/`

## Layering and Dependencies

- Dependencies MUST flow from outside to inside:
  - `src/entrypoints/` → `src/extension/` → `src/core/`
- `src/core/` MUST remain pure domain logic:
  - no browser APIs
  - no DOM APIs
  - no WXT-specific imports
- `src/extension/` MAY use browser/DOM APIs and MAY import from `src/core/`.

## Manifest V3 / Runtime Constraints

- Assume a Manifest V3 environment and its lifecycle constraints (for example, service workers are not long-lived and can be suspended).
- Do not assume background state is always resident; persist only user preferences via storage as specified.

## Privacy Constraints (Reminder)

- All AI inference MUST use the on-device Prompt API (Chrome/Edge). No remote calls.
- Never transmit user text off-device.

## Diagnostics and Logging

- Runtime diagnostics MUST use the unified logger (`createExtensionLogger`) instead of ad-hoc `console.*`.
- Content script logs appear in the inspected page's DevTools console.
- Log lines are prefixed with `[emoji-completion:<scope>]`.

Log level:

- Default is `debug` in dev builds (including when `import.meta.env` is missing) and `info` in production builds.
- For local debugging, set `globalThis.__EMOJI_COMPLETION_LOG_LEVEL__ = 'debug' | 'info' | 'warn' | 'error'` in the page console and reload.

Quick AI availability check (run in page console):

```js
globalThis.LanguageModel?.availability?.({
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
  outputLanguage: 'en',
}).then(console.log);
```

If this returns `undefined` or throws, the Prompt API is not enabled in this browser.

## Local Browser Runner Config (Do Not Edit in PRs)

This repository includes [web-ext.config.ts](../../web-ext.config.ts) to configure WXT's browser runner.

- This file typically contains **machine-specific absolute paths** (Chrome/Edge/Firefox binaries, user profiles).
- AI agents and contributors MUST NOT modify this file as part of feature work.
- If you need to adjust it for local debugging, do so **locally only** and do not commit the change.

Troubleshooting `pnpm dev` failures:

- If you see `CDP connection closed before response to Extensions.loadUnpacked`, the configured Chromium profile is often locked by an already-running browser.
- Close all Chrome/Edge instances (including background processes), then rerun `pnpm dev`.
  - Windows: open Task Manager and end all `chrome.exe` / `msedge.exe` processes.
- If it still fails, temporarily point the runner to a dedicated profile directory locally (again: do not commit).

## Debugging With VS Code (Chrome 9222)

This repo is set up so that `pnpm dev` does **not** launch a browser runner.

- `pnpm dev` runs a dev-mode build (`wxt build --mode development`) and exits.
- `pnpm dev:runner` starts the WXT dev server and launches a browser via the runner (may fail if the profile is locked).

Recommended breakpoint workflow for content scripts:

1. Run `pnpm dev` to produce a fresh dev build.
2. In VS Code, run the compound debug config **"Launch + Attach Chrome 9222 (content scripts)"**.
   - This launches Chrome with a dedicated profile and auto-loads the unpacked extension from `.output/chrome-mv3-dev/`.
3. Open a normal web page, reload it, and set breakpoints in `src/...`.

Sourcemap note:

- WXT may emit inline sourcemaps with `sources` like `../../../src/...`.
- The VS Code attach configuration includes `sourceMapPathOverrides` to map these back to local `src/...`.

## Manual Testing with the Test Site

A comprehensive test fixture page lives at `tests/e2e/fixtures/test-site.html`. It covers all acceptance criteria (AC-1 – AC-13) and functional requirements across 9 sections: basic suggestion flow, unsupported input types, skip conditions, keyboard behaviour, cancellation & cooldown, overlay & tooltip, IME composition, edge cases (RTL, scroll, resize, Shadow DOM), and dynamic elements.

Quick start:

1. Build the extension: `pnpm build:dev`
2. Load the unpacked extension from `.output/chrome-mv3-dev/` in Chrome (`chrome://extensions`).
3. Serve the fixture: `npx serve tests/e2e/fixtures -l 3333`
4. Open `http://localhost:3333/test-site.html` and walk through each section.

> **Note:** The Prompt API (`LanguageModel`) works on `localhost`. No special origin allowlisting is required — only Chrome 138+ with on-device AI enabled.

## File Operations

- Any file/folder operation (create, move, rename, delete) MUST be reflected by updating the ASCII tree in [docs/architecture/repository-structure.md](../architecture/repository-structure.md).

## References

- [ADR 0001: Use WXT](../adr/0001-use-wxt.md)
- [ADR 0006: Domain Model Design](../adr/0006-domain-model-design.md)
- [Repository Structure (Authoritative)](../architecture/repository-structure.md)
