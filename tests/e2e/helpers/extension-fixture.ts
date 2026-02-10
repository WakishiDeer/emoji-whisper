/**
 * Custom Playwright fixture that launches a persistent Chromium context
 * with the Emoji Whisper extension loaded from .output/chrome-mv3-dev/.
 *
 * Usage in test files:
 *   import { test, expect } from '../helpers/extension-fixture';
 */

import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'node:path';

const EXTENSION_PATH = path.resolve('.output/chrome-mv3-dev');

type ExtensionFixtures = {
  context: BrowserContext;
  extensionPage: Page;
};

/**
 * Extended test fixture.
 *
 * - `context`: persistent Chromium context with the extension sideloaded.
 * - `extensionPage`: a page in that context, ready for navigation.
 */
export const test = base.extend<ExtensionFixtures>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        '--headless=new',
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-first-run',
        '--disable-search-engine-choice-screen',
      ],
    });
    await use(context);
    await context.close();
  },
  extensionPage: async ({ context }, use) => {
    const page = context.pages()[0] ?? (await context.newPage());
    await use(page);
  },
});

export { expect } from '@playwright/test';
