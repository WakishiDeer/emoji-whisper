import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
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
