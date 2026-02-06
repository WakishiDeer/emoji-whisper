import '../assets/content.css';

import { createEmojiCompletionController } from '../extension/content-script/controller';
import { createExtensionLogger } from '../extension/diagnostics/logger';
import { defineContentScript } from 'wxt/utils/define-content-script';

export default defineContentScript({
  matches: ['*://*/*'],
  runAt: 'document_idle',
  // see: https://wxt.dev/guide/essentials/content-scripts.html#isolated-world-vs-main-world
  world: 'MAIN',

  main() {
    createExtensionLogger('entrypoint').info('content.loaded');
    const controller = createEmojiCompletionController();
    controller.start();
  },
});
