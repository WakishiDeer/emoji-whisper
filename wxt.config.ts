import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/auto-icons'],
  // @ts-expect-error -- type augmentation from @wxt-dev/auto-icons module
  autoIcons: {
    baseIconPath: 'assets/icon.svg',
  },
  vite: (env) => ({
    build: {
      sourcemap: env.mode === 'development' ? 'inline' : false,
    },
  }),
  manifest: {
    permissions: ['storage', 'activeTab'],
    web_accessible_resources: [
      {
        resources: ['content-scripts/*'],
        matches: ['*://*/*'],
      },
    ],
  },
});
